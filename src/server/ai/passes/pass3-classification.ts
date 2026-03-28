/**
 * Pass 3: Unit Type Classification (<1s)
 *
 * Refines the initial type assignment from Pass 2.
 * Domain-template types override when confidence >= 0.75.
 * Below 0.75 triggers user review.
 */

import { z } from "zod";
import type { PipelineClient } from "../client";
import type {
  ExtractedUnit,
  ClassificationResult,
  UnitType,
  AIClassificationResponse,
} from "../types";
import { UNIT_TYPES } from "../types";
import { MODEL_CONFIG } from "../config";
import {
  needsClassificationReview,
  clampConfidence,
} from "../utils/confidence";

// ─── Zod Schema ─────────────────────────────────────────────────────────

const aiClassificationSchema = z.object({
  classifications: z.array(
    z.object({
      unitIndex: z.number(),
      type: z.enum(UNIT_TYPES as unknown as [string, ...string[]]),
      confidence: z.number().min(0).max(1),
      secondaryType: z
        .enum(UNIT_TYPES as unknown as [string, ...string[]])
        .optional(),
      secondaryConfidence: z.number().min(0).max(1).optional(),
      reasoning: z.string(),
    }),
  ),
}) as unknown as z.ZodType<AIClassificationResponse>;

// ─── AI Classification ──────────────────────────────────────────────────

async function classifyWithAI(
  client: PipelineClient,
  units: ExtractedUnit[],
  domainTemplate?: string,
): Promise<AIClassificationResponse | null> {
  const { buildClassificationSystemPrompt, buildClassificationUserPrompt, CLASSIFICATION_SCHEMA } =
    await import("../prompts/classification");

  const unitInputs = units.map((u, i) => ({
    index: i,
    content: u.content,
    currentType: u.type,
  }));

  return client.generateStructured<AIClassificationResponse>({
    prompt: buildClassificationUserPrompt(unitInputs),
    systemPrompt: buildClassificationSystemPrompt(domainTemplate),
    schema: CLASSIFICATION_SCHEMA,
    zodSchema: aiClassificationSchema,
    maxTokens: MODEL_CONFIG.classificationMaxTokens,
    temperature: MODEL_CONFIG.classificationTemperature,
  });
}

// ─── Heuristic Refinement ───────────────────────────────────────────────

/**
 * Heuristic classification refinement.
 * Applies additional pattern checks to confirm or adjust the initial type.
 */
function refineHeuristic(units: ExtractedUnit[]): ClassificationResult[] {
  return units.map((unit, index) => {
    const content = unit.content.toLowerCase();
    let type = unit.type;
    let confidence = unit.typeConfidence;

    // Additional pattern checks to boost or correct
    if (content.endsWith("?") && type !== "question") {
      type = "question";
      confidence = 0.85;
    } else if (
      /\b(defined as|refers to|is the term for)\b/.test(content) &&
      type !== "definition"
    ) {
      type = "definition";
      confidence = 0.8;
    } else if (
      /\b(we (decided|chose|will)|decision:|going with)\b/.test(content) &&
      type !== "decision"
    ) {
      type = "decision";
      confidence = 0.8;
    } else if (
      /^(TODO|ACTION|NEXT):/i.test(unit.content) &&
      type !== "action"
    ) {
      type = "action";
      confidence = 0.85;
    }

    // Detect secondary type opportunities
    let secondaryType: UnitType | undefined;
    let secondaryConfidence: number | undefined;

    if (type === "claim" && /\bbecause\b/.test(content)) {
      secondaryType = "warrant";
      secondaryConfidence = 0.5;
    } else if (type === "evidence" && /\bsuggest(s|ing)?\b/.test(content)) {
      secondaryType = "claim";
      secondaryConfidence = 0.4;
    } else if (type === "observation" && /\bshould\b/.test(content)) {
      secondaryType = "claim";
      secondaryConfidence = 0.45;
    }

    return {
      unitIndex: index,
      type,
      confidence: clampConfidence(confidence),
      secondaryType,
      secondaryConfidence,
      needsReview: needsClassificationReview(confidence),
    };
  });
}

// ─── Pass 3 Implementation ──────────────────────────────────────────────

export interface Pass3Options {
  domainTemplate?: string;
}

/**
 * Execute Pass 3: Refine type classifications for all extracted units.
 * Returns classification results with review flags.
 */
export async function executePass3(
  client: PipelineClient,
  units: ExtractedUnit[],
  options: Pass3Options = {},
): Promise<ClassificationResult[]> {
  if (units.length === 0) return [];

  // Try AI classification
  if (!client.mockMode) {
    const aiResult = await classifyWithAI(client, units, options.domainTemplate);
    if (aiResult && aiResult.classifications.length > 0) {
      // Map AI results, filling in any missing indices with heuristic
      const resultMap = new Map<number, ClassificationResult>();

      for (const c of aiResult.classifications) {
        resultMap.set(c.unitIndex, {
          unitIndex: c.unitIndex,
          type: c.type as UnitType,
          confidence: clampConfidence(c.confidence),
          secondaryType: c.secondaryType as UnitType | undefined,
          secondaryConfidence: c.secondaryConfidence,
          reasoning: c.reasoning,
          needsReview: needsClassificationReview(c.confidence),
        });
      }

      // Fill gaps with heuristic
      const heuristicResults = refineHeuristic(units);
      for (const h of heuristicResults) {
        if (!resultMap.has(h.unitIndex)) {
          resultMap.set(h.unitIndex, h);
        }
      }

      return Array.from(resultMap.values()).sort(
        (a, b) => a.unitIndex - b.unitIndex,
      );
    }
  }

  // Fallback to heuristic
  return refineHeuristic(units);
}

/**
 * Apply classification results back to the extracted units (mutates in place).
 */
export function applyClassifications(
  units: ExtractedUnit[],
  classifications: ClassificationResult[],
): void {
  for (const c of classifications) {
    const unit = units[c.unitIndex];
    if (unit) {
      unit.type = c.type;
      unit.typeConfidence = c.confidence;
      unit.secondaryType = c.secondaryType;
    }
  }
}
