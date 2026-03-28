/**
 * Pass 6: Cross-Graph Relation Detection (<10s)
 *
 * Finds relations between newly extracted units and existing units in the graph.
 * Uses semantic similarity (when embeddings available) or keyword overlap.
 * Stricter thresholds than within-input: >=0.92 auto, 0.72-0.91 suggest, 0.55-0.71 hidden.
 * Cross-graph relations trigger salience boosts (elaborative encoding).
 */

import { z } from "zod";
import type { PipelineClient } from "../client";
import type {
  ExtractedUnit,
  ExistingUnit,
  CrossRelation,
  RelationType,
  ReviewItem,
  AICrossRelationResponse,
} from "../types";
import { RELATION_TYPES } from "../types";
import { MODEL_CONFIG, CROSS_RELATION_CONFIG } from "../config";
import {
  getCrossRelationAction,
  buildRelationReview,
  clampConfidence,
} from "../utils/confidence";

// ─── Zod Schema ─────────────────────────────────────────────────────────

const aiCrossRelationSchema = z.object({
  relations: z.array(
    z.object({
      unitIndex: z.number(),
      existingUnitId: z.string(),
      type: z.enum(RELATION_TYPES as unknown as [string, ...string[]]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
}) as unknown as z.ZodType<AICrossRelationResponse>;

// ─── AI Cross-Relation Detection ────────────────────────────────────────

async function detectWithAI(
  client: PipelineClient,
  newUnits: ExtractedUnit[],
  existingUnits: ExistingUnit[],
): Promise<AICrossRelationResponse | null> {
  const {
    buildCrossRelationSystemPrompt,
    buildCrossRelationUserPrompt,
    CROSS_RELATION_SCHEMA,
  } = await import("../prompts/relation-detection");

  const newInputs = newUnits.map((u, i) => ({
    index: i,
    content: u.content,
    type: u.type,
  }));

  const existingInputs = existingUnits.map((u) => ({
    id: u.id,
    content: u.content,
    type: u.type,
  }));

  return client.generateStructured<AICrossRelationResponse>({
    prompt: buildCrossRelationUserPrompt(newInputs, existingInputs),
    systemPrompt: buildCrossRelationSystemPrompt(),
    schema: CROSS_RELATION_SCHEMA,
    zodSchema: aiCrossRelationSchema,
    maxTokens: MODEL_CONFIG.relationMaxTokens,
    temperature: MODEL_CONFIG.relationTemperature,
  });
}

// ─── Heuristic Cross-Relation Detection ─────────────────────────────────

/**
 * Compute keyword overlap similarity between two text contents.
 * Returns a score in [0, 1].
 */
function keywordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  // Jaccard similarity
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Determine relation type between two units based on their types and content.
 */
function inferRelationType(
  newUnit: ExtractedUnit,
  existing: ExistingUnit,
): RelationType {
  const nType = newUnit.type;
  const eType = existing.type;

  // Evidence supporting a claim
  if (nType === "evidence" && eType === "claim") return "supports";
  if (nType === "claim" && eType === "evidence") return "supports";

  // Rebuttal / counterargument
  if (nType === "rebuttal" || nType === "counterargument") return "contradicts";
  if (eType === "rebuttal" || eType === "counterargument") return "contradicts";

  // Same type often means elaboration or contrast
  if (nType === eType) {
    // Check for contradiction signals
    const nLower = newUnit.content.toLowerCase();
    if (/\b(not|never|opposite|contrary|wrong|false|incorrect)\b/.test(nLower)) {
      return "contradicts";
    }
    return "elaborates";
  }

  // Definition refining existing usage
  if (nType === "definition" || eType === "definition") return "refines";

  // Question and response
  if (nType === "question" || eType === "question") return "responds_to";

  // Qualifier
  if (nType === "qualifier") return "qualifies";

  // Analogy
  if (nType === "analogy" || eType === "analogy") return "analogous_to";

  // Default to elaborates
  return "elaborates";
}

/**
 * Find the top-K most similar existing units for each new unit using keyword overlap.
 */
function findSimilarUnits(
  newUnit: ExtractedUnit,
  existingUnits: ExistingUnit[],
  topK: number,
): Array<{ unit: ExistingUnit; similarity: number }> {
  const scored = existingUnits.map((existing) => ({
    unit: existing,
    similarity: keywordSimilarity(newUnit.content, existing.content),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK).filter((s) => s.similarity > 0);
}

/**
 * Heuristic cross-graph relation detection using keyword similarity.
 */
function detectHeuristic(
  newUnits: ExtractedUnit[],
  existingUnits: ExistingUnit[],
): CrossRelation[] {
  const relations: CrossRelation[] = [];

  for (let i = 0; i < newUnits.length; i++) {
    const newUnit = newUnits[i]!;
    const similar = findSimilarUnits(
      newUnit,
      existingUnits,
      CROSS_RELATION_CONFIG.topKSimilar,
    );

    for (const match of similar) {
      // Convert similarity to confidence (scale up, since keyword overlap is conservative)
      const rawConfidence = match.similarity * 1.5;
      const confidence = clampConfidence(rawConfidence);
      const action = getCrossRelationAction(confidence);

      if (action === "discard") continue;

      const relationType = inferRelationType(newUnit, match.unit);
      const salienceBoost =
        action === "auto-accept"
          ? CROSS_RELATION_CONFIG.salienceBoostAuto
          : action === "suggest"
            ? CROSS_RELATION_CONFIG.salienceBoostSuggested
            : 0;

      relations.push({
        sourceIndex: i,
        targetIndex: -1, // Not applicable for cross-graph
        type: relationType,
        confidence,
        action,
        existingUnitId: match.unit.id,
        salienceBoost,
      });
    }
  }

  return relations;
}

// ─── Pass 6 Implementation ──────────────────────────────────────────────

export interface Pass6Result {
  crossRelations: CrossRelation[];
  reviewItems: ReviewItem[];
}

/**
 * Execute Pass 6: Detect cross-graph relations between new and existing units.
 */
export async function executePass6(
  client: PipelineClient,
  newUnits: ExtractedUnit[],
  existingUnits: ExistingUnit[],
): Promise<Pass6Result> {
  if (newUnits.length === 0 || existingUnits.length === 0) {
    return { crossRelations: [], reviewItems: [] };
  }

  let crossRelations: CrossRelation[];

  // Try AI detection
  if (!client.mockMode) {
    const aiResult = await detectWithAI(client, newUnits, existingUnits);
    if (aiResult && aiResult.relations.length > 0) {
      const existingIds = new Set(existingUnits.map((u) => u.id));
      crossRelations = aiResult.relations
        .filter(
          (r) =>
            r.unitIndex >= 0 &&
            r.unitIndex < newUnits.length &&
            existingIds.has(r.existingUnitId),
        )
        .map((r) => {
          const confidence = clampConfidence(r.confidence);
          const action = getCrossRelationAction(confidence);
          const salienceBoost =
            action === "auto-accept"
              ? CROSS_RELATION_CONFIG.salienceBoostAuto
              : action === "suggest"
                ? CROSS_RELATION_CONFIG.salienceBoostSuggested
                : 0;

          return {
            sourceIndex: r.unitIndex,
            targetIndex: -1,
            type: r.type as RelationType,
            confidence,
            action,
            existingUnitId: r.existingUnitId,
            salienceBoost,
            reasoning: r.reasoning,
          };
        });
    } else {
      crossRelations = detectHeuristic(newUnits, existingUnits);
    }
  } else {
    crossRelations = detectHeuristic(newUnits, existingUnits);
  }

  // Filter discarded
  crossRelations = crossRelations.filter((r) => r.action !== "discard");

  // Deduplicate: keep highest confidence per (unitIndex, existingUnitId)
  const seen = new Map<string, CrossRelation>();
  for (const rel of crossRelations) {
    const key = `${rel.sourceIndex}-${rel.existingUnitId}`;
    const existing = seen.get(key);
    if (!existing || rel.confidence > existing.confidence) {
      seen.set(key, rel);
    }
  }
  crossRelations = Array.from(seen.values());

  // Build review items
  const reviewItems: ReviewItem[] = [];
  for (const rel of crossRelations) {
    if (rel.action === "suggest") {
      reviewItems.push(
        buildRelationReview(
          rel.sourceIndex,
          -1, // cross-graph target
          rel.type,
          rel.confidence,
        ),
      );
    }
  }

  return { crossRelations, reviewItems };
}
