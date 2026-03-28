/**
 * Pass 5: Within-Input Relation Detection (<3s)
 *
 * Detects relations between units extracted from the same input.
 * Checks adjacent units, claim-evidence pairs, same-type pairs.
 * Confidence cascade: >=0.90 auto-accept, 0.70-0.89 suggest, 0.50-0.69 hidden, <0.50 discard.
 */

import { z } from "zod";
import type { PipelineClient } from "../client";
import type {
  ExtractedUnit,
  DetectedRelation,
  RelationType,
  ReviewItem,
  AIRelationResponse,
} from "../types";
import { RELATION_TYPES } from "../types";
import { MODEL_CONFIG } from "../config";
import {
  getWithinRelationAction,
  buildRelationReview,
  clampConfidence,
} from "../utils/confidence";

// ─── Zod Schema ─────────────────────────────────────────────────────────

const aiRelationSchema = z.object({
  relations: z.array(
    z.object({
      sourceIndex: z.number(),
      targetIndex: z.number(),
      type: z.enum(RELATION_TYPES as unknown as [string, ...string[]]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
}) as unknown as z.ZodType<AIRelationResponse>;

// ─── AI Relation Detection ──────────────────────────────────────────────

async function detectWithAI(
  client: PipelineClient,
  units: ExtractedUnit[],
): Promise<AIRelationResponse | null> {
  const {
    buildWithinRelationSystemPrompt,
    buildWithinRelationUserPrompt,
    WITHIN_RELATION_SCHEMA,
  } = await import("../prompts/relation-detection");

  const unitInputs = units.map((u, i) => ({
    index: i,
    content: u.content,
    type: u.type,
  }));

  return client.generateStructured<AIRelationResponse>({
    prompt: buildWithinRelationUserPrompt(unitInputs),
    systemPrompt: buildWithinRelationSystemPrompt(),
    schema: WITHIN_RELATION_SCHEMA,
    zodSchema: aiRelationSchema,
    maxTokens: MODEL_CONFIG.relationMaxTokens,
    temperature: MODEL_CONFIG.relationTemperature,
  });
}

// ─── Heuristic Relation Detection ───────────────────────────────────────

/**
 * Adjacency-based relation patterns.
 */
const ADJACENCY_PATTERNS: Array<{
  sourceType: string;
  targetType: string;
  relationType: RelationType;
  confidence: number;
}> = [
  { sourceType: "evidence", targetType: "claim", relationType: "supports", confidence: 0.75 },
  { sourceType: "warrant", targetType: "claim", relationType: "supports", confidence: 0.7 },
  { sourceType: "backing", targetType: "warrant", relationType: "supports", confidence: 0.7 },
  { sourceType: "rebuttal", targetType: "claim", relationType: "contradicts", confidence: 0.7 },
  { sourceType: "counterargument", targetType: "claim", relationType: "contradicts", confidence: 0.7 },
  { sourceType: "qualifier", targetType: "claim", relationType: "qualifies", confidence: 0.7 },
  { sourceType: "context", targetType: "claim", relationType: "enables", confidence: 0.6 },
  { sourceType: "definition", targetType: "claim", relationType: "enables", confidence: 0.6 },
  { sourceType: "observation", targetType: "claim", relationType: "elaborates", confidence: 0.6 },
  { sourceType: "analogy", targetType: "claim", relationType: "reframes", confidence: 0.65 },
  { sourceType: "assumption", targetType: "claim", relationType: "depends_on", confidence: 0.65 },
  { sourceType: "idea", targetType: "question", relationType: "responds_to", confidence: 0.6 },
  { sourceType: "action", targetType: "decision", relationType: "derived_from", confidence: 0.65 },
];

/**
 * Keyword-based relation signals between two units.
 */
function detectKeywordRelation(
  source: ExtractedUnit,
  target: ExtractedUnit,
): { type: RelationType; confidence: number } | null {
  const sLower = source.content.toLowerCase();
  const tLower = target.content.toLowerCase();

  // "because" / "since" often links warrant/evidence to preceding claim
  if (/\b(because|since)\b/.test(sLower) && target.type === "claim") {
    return { type: "supports", confidence: 0.65 };
  }

  // "however" / "but" signals contrast or contradiction
  if (/\b(however|but|yet|nevertheless)\b/.test(sLower)) {
    return { type: "contradicts", confidence: 0.6 };
  }

  // "for example" / "for instance" signals exemplification
  if (/\b(for example|for instance|such as)\b/.test(sLower)) {
    return { type: "exemplifies", confidence: 0.65 };
  }

  // "therefore" / "thus" signals derivation
  if (/\b(therefore|thus|consequently|hence)\b/.test(sLower)) {
    return { type: "derived_from", confidence: 0.6 };
  }

  // Question followed by non-question: responds_to
  if (target.type === "question" && source.type !== "question") {
    return { type: "responds_to", confidence: 0.55 };
  }

  // Shared significant words (>6 chars) suggest elaboration
  const sWords = new Set(sLower.split(/\s+/).filter((w) => w.length > 6));
  const tWords = new Set(tLower.split(/\s+/).filter((w) => w.length > 6));
  let shared = 0;
  for (const w of sWords) {
    if (tWords.has(w)) shared++;
  }
  if (shared >= 2 && source.type === target.type) {
    return { type: "elaborates", confidence: 0.5 };
  }

  return null;
}

/**
 * Heuristic relation detection using adjacency patterns and keyword signals.
 */
function detectHeuristic(units: ExtractedUnit[]): DetectedRelation[] {
  const relations: DetectedRelation[] = [];

  for (let i = 0; i < units.length; i++) {
    const source = units[i]!;

    // Check adjacent units (window of 3)
    const windowEnd = Math.min(i + 4, units.length);
    for (let j = i + 1; j < windowEnd; j++) {
      const target = units[j]!;

      // Check adjacency patterns
      for (const pattern of ADJACENCY_PATTERNS) {
        if (
          (source.type === pattern.sourceType && target.type === pattern.targetType) ||
          (source.type === pattern.targetType && target.type === pattern.sourceType)
        ) {
          const isForward =
            source.type === pattern.sourceType && target.type === pattern.targetType;
          relations.push({
            sourceIndex: isForward ? i : j,
            targetIndex: isForward ? j : i,
            type: pattern.relationType,
            confidence: pattern.confidence * (j === i + 1 ? 1.0 : 0.85),
            action: getWithinRelationAction(
              pattern.confidence * (j === i + 1 ? 1.0 : 0.85),
            ),
          });
          break; // One relation per pair from adjacency
        }
      }

      // Check keyword signals
      const kwRelation = detectKeywordRelation(source, target);
      if (kwRelation) {
        // Avoid duplicate with adjacency pattern
        const hasDuplicate = relations.some(
          (r) =>
            (r.sourceIndex === i && r.targetIndex === j) ||
            (r.sourceIndex === j && r.targetIndex === i),
        );
        if (!hasDuplicate) {
          relations.push({
            sourceIndex: i,
            targetIndex: j,
            type: kwRelation.type,
            confidence: kwRelation.confidence,
            action: getWithinRelationAction(kwRelation.confidence),
          });
        }
      }
    }
  }

  return relations;
}

// ─── Pass 5 Implementation ──────────────────────────────────────────────

export interface Pass5Result {
  relations: DetectedRelation[];
  reviewItems: ReviewItem[];
}

/**
 * Execute Pass 5: Detect relations between units from the same input.
 */
export async function executePass5(
  client: PipelineClient,
  units: ExtractedUnit[],
): Promise<Pass5Result> {
  if (units.length < 2) return { relations: [], reviewItems: [] };

  let relations: DetectedRelation[];

  // Try AI detection
  if (!client.mockMode) {
    const aiResult = await detectWithAI(client, units);
    if (aiResult && aiResult.relations.length > 0) {
      relations = aiResult.relations
        .filter(
          (r) =>
            r.sourceIndex >= 0 &&
            r.sourceIndex < units.length &&
            r.targetIndex >= 0 &&
            r.targetIndex < units.length &&
            r.sourceIndex !== r.targetIndex,
        )
        .map((r) => {
          const confidence = clampConfidence(r.confidence);
          return {
            sourceIndex: r.sourceIndex,
            targetIndex: r.targetIndex,
            type: r.type as RelationType,
            confidence,
            action: getWithinRelationAction(confidence),
            reasoning: r.reasoning,
          };
        });
    } else {
      relations = detectHeuristic(units);
    }
  } else {
    relations = detectHeuristic(units);
  }

  // Filter out discarded relations
  relations = relations.filter((r) => r.action !== "discard");

  // Deduplicate: keep higher confidence for same pair
  const seen = new Map<string, DetectedRelation>();
  for (const rel of relations) {
    const key = `${rel.sourceIndex}-${rel.targetIndex}-${rel.type}`;
    const existing = seen.get(key);
    if (!existing || rel.confidence > existing.confidence) {
      seen.set(key, rel);
    }
  }
  relations = Array.from(seen.values());

  // Build review items for suggested relations
  const reviewItems: ReviewItem[] = [];
  for (const rel of relations) {
    if (rel.action === "suggest") {
      reviewItems.push(
        buildRelationReview(
          rel.sourceIndex,
          rel.targetIndex,
          rel.type,
          rel.confidence,
        ),
      );
    }
  }

  return { relations, reviewItems };
}
