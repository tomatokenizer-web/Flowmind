/**
 * Pass 2: Unit Extraction (<1s)
 *
 * Segments normalized text into candidate thought units.
 * Uses AI when available, falls back to heuristic sentence-based extraction.
 * Genre-aware density controls granularity.
 */

import { z } from "zod";
import type { PipelineClient } from "../client";
import type {
  NormalizedInput,
  ExtractedUnit,
  ExtractionResult,
  GenreDensity,
  UnitType,
  AIExtractionResponse,
} from "../types";
import { UNIT_TYPES } from "../types";
import { EXTRACTION_CONFIG, MODEL_CONFIG } from "../config";
import { detectGenre } from "../utils/genre-detection";
import {
  splitSentences,
  splitParagraphs,
  detectDiscourseMarker,
  findSourceSpan,
} from "../utils/text-processing";
import { clampConfidence } from "../utils/confidence";

// ─── Zod Schema for AI Response Validation ──────────────────────────────

const aiExtractionSchema = z.object({
  units: z.array(
    z.object({
      content: z.string(),
      type: z.enum(UNIT_TYPES as unknown as [string, ...string[]]),
      confidence: z.number().min(0).max(1),
      secondaryType: z
        .enum(UNIT_TYPES as unknown as [string, ...string[]])
        .optional(),
      reasoning: z.string().optional(),
    }),
  ),
  genre: z.string(),
}) as unknown as z.ZodType<AIExtractionResponse>;

// ─── AI-Powered Extraction ──────────────────────────────────────────────

async function extractWithAI(
  client: PipelineClient,
  input: NormalizedInput,
  genre: string,
  density: GenreDensity,
): Promise<AIExtractionResponse | null> {
  const { buildExtractionSystemPrompt, buildExtractionUserPrompt, EXTRACTION_SCHEMA } =
    await import("../prompts/extraction");

  return client.generateStructured<AIExtractionResponse>({
    prompt: buildExtractionUserPrompt(input.normalizedText),
    systemPrompt: buildExtractionSystemPrompt(genre, density),
    schema: EXTRACTION_SCHEMA,
    zodSchema: aiExtractionSchema,
    maxTokens: MODEL_CONFIG.extractionMaxTokens,
    temperature: MODEL_CONFIG.extractionTemperature,
  });
}

// ─── Heuristic Fallback Extraction ──────────────────────────────────────

/**
 * Type keyword patterns for heuristic classification.
 */
const TYPE_PATTERNS: Array<{ type: UnitType; patterns: RegExp[]; confidence: number }> = [
  {
    type: "question",
    patterns: [/\?$/, /^(what|why|how|when|where|who|which|is it|can we|should)\b/i],
    confidence: 0.85,
  },
  {
    type: "definition",
    patterns: [
      /\bis defined as\b/i,
      /\brefers to\b/i,
      /\bmeans\b/i,
      /^[A-Z][a-z]+ is (a|an|the)\b/,
    ],
    confidence: 0.8,
  },
  {
    type: "evidence",
    patterns: [
      /\baccording to\b/i,
      /\bstud(y|ies) (show|found|suggest)/i,
      /\bdata (show|indicate|suggest)/i,
      /\d+%/,
      /\b(research|survey|experiment|analysis) (show|found|reveal)/i,
    ],
    confidence: 0.75,
  },
  {
    type: "decision",
    patterns: [
      /\b(we decided|the decision|going with|chose to|will proceed)\b/i,
      /\b(decision|conclusion):/i,
    ],
    confidence: 0.8,
  },
  {
    type: "action",
    patterns: [
      /^(TODO|FIXME|ACTION|NEXT):/i,
      /\b(implement|create|build|deploy|fix|update|remove|add)\b/i,
    ],
    confidence: 0.7,
  },
  {
    type: "rebuttal",
    patterns: [
      /\bhowever\b/i,
      /\bon the other hand\b/i,
      /\bcritics argue\b/i,
      /\bthe problem with\b/i,
    ],
    confidence: 0.7,
  },
  {
    type: "qualifier",
    patterns: [
      /\bunless\b/i,
      /\bexcept\b/i,
      /\bin most cases\b/i,
      /\bprovided that\b/i,
      /\bgiven that\b/i,
    ],
    confidence: 0.7,
  },
  {
    type: "observation",
    patterns: [
      /\bI notice\b/i,
      /\binterestingly\b/i,
      /\bit appears\b/i,
      /\bnotably\b/i,
      /\bpattern\b/i,
    ],
    confidence: 0.65,
  },
  {
    type: "analogy",
    patterns: [/\bjust (like|as)\b/i, /\bsimilar to\b/i, /\banalog(y|ous)\b/i, /\bmetaphor/i],
    confidence: 0.7,
  },
  {
    type: "assumption",
    patterns: [/\bassuming\b/i, /\bif we (take|assume|accept)\b/i, /\bpremise\b/i],
    confidence: 0.7,
  },
  {
    type: "warrant",
    patterns: [/\bbecause\b/i, /\bsince\b/i, /\bthis means\b/i, /\btherefore\b/i, /\bthus\b/i],
    confidence: 0.6,
  },
];

/**
 * Classify a text segment using keyword pattern matching.
 */
function heuristicClassify(text: string): { type: UnitType; confidence: number } {
  for (const rule of TYPE_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { type: rule.type, confidence: rule.confidence };
      }
    }
  }
  // Default to claim
  return { type: "claim", confidence: 0.5 };
}

/**
 * Heuristic extraction: split by sentences and discourse markers.
 * Groups sentences into units based on density settings.
 */
function extractHeuristic(
  input: NormalizedInput,
  density: GenreDensity,
): Array<{ content: string; type: UnitType; confidence: number }> {
  const paragraphs = splitParagraphs(input.normalizedText);
  const rawUnits: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph);

    if (density === "low") {
      // Low density: keep paragraphs as units unless very long
      if (sentences.length <= 3) {
        rawUnits.push(paragraph);
      } else {
        // Split at discourse markers
        let current = "";
        for (const sentence of sentences) {
          const marker = detectDiscourseMarker(sentence);
          if (marker && current.trim()) {
            rawUnits.push(current.trim());
            current = sentence;
          } else {
            current += (current ? " " : "") + sentence;
          }
        }
        if (current.trim()) rawUnits.push(current.trim());
      }
    } else if (density === "high") {
      // High density: every sentence is a candidate unit
      for (const sentence of sentences) {
        rawUnits.push(sentence);
      }
    } else {
      // Medium density: split at discourse markers, otherwise group 1-2 sentences
      let current = "";
      let count = 0;
      for (const sentence of sentences) {
        const marker = detectDiscourseMarker(sentence);
        if (marker && current.trim()) {
          rawUnits.push(current.trim());
          current = sentence;
          count = 1;
        } else {
          current += (current ? " " : "") + sentence;
          count++;
          if (count >= 2) {
            rawUnits.push(current.trim());
            current = "";
            count = 0;
          }
        }
      }
      if (current.trim()) rawUnits.push(current.trim());
    }
  }

  // Classify each unit
  return rawUnits
    .filter(
      (u) =>
        u.length >= EXTRACTION_CONFIG.minUnitLength &&
        u.length <= EXTRACTION_CONFIG.maxUnitLength,
    )
    .slice(0, EXTRACTION_CONFIG.maxUnitsPerInput)
    .map((content) => {
      const { type, confidence } = heuristicClassify(content);
      return { content, type, confidence };
    });
}

// ─── Pass 2 Implementation ──────────────────────────────────────────────

export interface Pass2Options {
  genre?: string;
  density?: GenreDensity;
}

/**
 * Execute Pass 2: Extract atomic thought units from normalized input.
 * Uses AI when available, falls back to heuristic extraction.
 */
export async function executePass2(
  client: PipelineClient,
  input: NormalizedInput,
  options: Pass2Options = {},
): Promise<ExtractionResult> {
  const startTime = performance.now();

  // Detect genre if not provided
  const genreResult = detectGenre(input.normalizedText);
  const genre = options.genre ?? genreResult.genre;
  const density = options.density ?? genreResult.density;

  let rawUnits: Array<{ content: string; type: UnitType; confidence: number; secondaryType?: UnitType }>;

  // Try AI extraction first
  if (!client.mockMode) {
    const aiResult = await extractWithAI(client, input, genre, density);
    if (aiResult && aiResult.units.length > 0) {
      rawUnits = aiResult.units.map((u) => ({
        content: u.content,
        type: u.type as UnitType,
        confidence: u.confidence,
        secondaryType: u.secondaryType as UnitType | undefined,
      }));
    } else {
      // AI failed, fall back to heuristic
      rawUnits = extractHeuristic(input, density);
    }
  } else {
    rawUnits = extractHeuristic(input, density);
  }

  // Build ExtractedUnit objects with source spans
  let searchFrom = 0;
  const units: ExtractedUnit[] = rawUnits.map((raw, index) => {
    const sourceSpan = findSourceSpan(input.normalizedText, raw.content, searchFrom);
    searchFrom = sourceSpan.end;

    return {
      content: raw.content,
      rawContent: raw.content,
      type: raw.type,
      typeConfidence: clampConfidence(raw.confidence),
      secondaryType: raw.secondaryType,
      extractionConfidence: clampConfidence(raw.confidence),
      suggestedContextId: undefined,
      contextRelevance: 0,
      lifecycle: "draft" as const,
      position: index,
      sourceSpan,
    };
  });

  return {
    units,
    genre,
    density,
    processingTimeMs: performance.now() - startTime,
  };
}
