/**
 * Pass 4: Context Assignment (<2s)
 *
 * Assigns units to existing contexts based on relevance.
 * High relevance -> auto-assign, medium -> suggest, low -> inbox.
 * Detects when a batch of low-relevance units may need a new context.
 */

import { z } from "zod";
import type { PipelineClient } from "../client";
import type {
  ExtractedUnit,
  ContextAssignment,
  ExistingContext,
  AIContextAssignmentResponse,
  ReviewItem,
} from "../types";
import { CONTEXT_CONFIG, MODEL_CONFIG } from "../config";
import {
  getContextAction,
  buildContextReview,
  buildNewContextReview,
  clampConfidence,
} from "../utils/confidence";

// ─── Zod Schema ─────────────────────────────────────────────────────────

const aiContextSchema = z.object({
  assignments: z.array(
    z.object({
      unitIndex: z.number(),
      contextId: z.string(),
      relevance: z.number().min(0).max(1),
      reasoning: z.string().optional(),
    }),
  ),
  newContextSuggestions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        unitIndices: z.array(z.number()),
      }),
    )
    .optional(),
}) as unknown as z.ZodType<AIContextAssignmentResponse>;

// ─── AI Context Assignment ──────────────────────────────────────────────

async function assignWithAI(
  client: PipelineClient,
  units: ExtractedUnit[],
  contexts: ExistingContext[],
): Promise<AIContextAssignmentResponse | null> {
  const {
    buildContextAssignmentSystemPrompt,
    buildContextAssignmentUserPrompt,
    CONTEXT_ASSIGNMENT_SCHEMA,
  } = await import("../prompts/context-assignment");

  const unitInputs = units.map((u, i) => ({
    index: i,
    content: u.content,
    type: u.type,
  }));

  return client.generateStructured<AIContextAssignmentResponse>({
    prompt: buildContextAssignmentUserPrompt(unitInputs, contexts),
    systemPrompt: buildContextAssignmentSystemPrompt(),
    schema: CONTEXT_ASSIGNMENT_SCHEMA,
    zodSchema: aiContextSchema,
    maxTokens: MODEL_CONFIG.contextMaxTokens,
    temperature: MODEL_CONFIG.classificationTemperature,
  });
}

// ─── Heuristic Context Assignment ───────────────────────────────────────

/**
 * Simple keyword overlap scoring between a unit and a context.
 */
function computeKeywordRelevance(
  unitContent: string,
  context: ExistingContext,
): number {
  const unitWords = new Set(
    unitContent
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );

  // Build context word set from name + description + snapshot
  const contextText = [
    context.name,
    context.description ?? "",
    context.snapshot ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const contextWords = new Set(
    contextText.split(/\s+/).filter((w) => w.length > 3),
  );

  if (unitWords.size === 0 || contextWords.size === 0) return 0;

  let overlap = 0;
  for (const word of unitWords) {
    if (contextWords.has(word)) overlap++;
  }

  // Jaccard-ish similarity, weighted toward unit coverage
  return overlap / Math.max(unitWords.size, 1);
}

/**
 * Heuristic context assignment using keyword overlap.
 */
function assignHeuristic(
  units: ExtractedUnit[],
  contexts: ExistingContext[],
): ContextAssignment[] {
  if (contexts.length === 0) {
    // No contexts available — everything goes to inbox
    return units.map((_, index) => ({
      unitIndex: index,
      contextId: "inbox",
      relevance: 0,
      action: "inbox" as const,
    }));
  }

  return units.map((unit, index) => {
    let bestContextId = "inbox";
    let bestRelevance = 0;
    let bestContextName: string | undefined;

    for (const context of contexts) {
      const relevance = computeKeywordRelevance(unit.content, context);
      if (relevance > bestRelevance) {
        bestRelevance = relevance;
        bestContextId = context.id;
        bestContextName = context.name;
      }
    }

    const action = getContextAction(bestRelevance);
    return {
      unitIndex: index,
      contextId: action === "inbox" ? "inbox" : bestContextId,
      contextName: bestContextName,
      relevance: clampConfidence(bestRelevance),
      action,
    };
  });
}

// ─── New Context Detection ──────────────────────────────────────────────

/**
 * Check if a batch of low-relevance units share enough commonality
 * to warrant suggesting a new context.
 */
function detectNewContext(
  units: ExtractedUnit[],
  assignments: ContextAssignment[],
): { suggestedName: string; unitIndices: number[] } | null {
  const lowRelevanceIndices = assignments
    .filter((a) => a.relevance < CONTEXT_CONFIG.suggestThreshold)
    .map((a) => a.unitIndex);

  if (lowRelevanceIndices.length < CONTEXT_CONFIG.newContextMinUnits) {
    return null;
  }

  // Find common keywords among low-relevance units
  const wordFrequency = new Map<string, number>();
  for (const idx of lowRelevanceIndices) {
    const unit = units[idx];
    if (!unit) continue;
    const words = new Set(
      unit.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4),
    );
    for (const word of words) {
      wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
    }
  }

  // Find words that appear in most low-relevance units
  const threshold = Math.ceil(lowRelevanceIndices.length * 0.5);
  const commonWords = [...wordFrequency.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  if (commonWords.length === 0) return null;

  const suggestedName = commonWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" & ");

  return { suggestedName, unitIndices: lowRelevanceIndices };
}

// ─── Pass 4 Implementation ──────────────────────────────────────────────

export interface Pass4Options {
  existingContexts?: ExistingContext[];
  /** If provided, auto-assign all units to this context */
  targetContextId?: string;
}

export interface Pass4Result {
  assignments: ContextAssignment[];
  reviewItems: ReviewItem[];
}

/**
 * Execute Pass 4: Assign units to contexts based on relevance.
 */
export async function executePass4(
  client: PipelineClient,
  units: ExtractedUnit[],
  options: Pass4Options = {},
): Promise<Pass4Result> {
  if (units.length === 0) return { assignments: [], reviewItems: [] };

  const contexts = options.existingContexts ?? [];
  const reviewItems: ReviewItem[] = [];

  // If a target context is specified, auto-assign everything
  if (options.targetContextId) {
    const targetContext = contexts.find((c) => c.id === options.targetContextId);
    const assignments: ContextAssignment[] = units.map((_, index) => ({
      unitIndex: index,
      contextId: options.targetContextId!,
      contextName: targetContext?.name,
      relevance: 1.0,
      action: "auto-assign" as const,
    }));
    return { assignments, reviewItems };
  }

  let assignments: ContextAssignment[];

  // Try AI assignment
  if (!client.mockMode && contexts.length > 0) {
    const aiResult = await assignWithAI(client, units, contexts);
    if (aiResult && aiResult.assignments.length > 0) {
      assignments = aiResult.assignments.map((a) => {
        const context = contexts.find((c) => c.id === a.contextId);
        const relevance = clampConfidence(a.relevance);
        const action = getContextAction(relevance);
        return {
          unitIndex: a.unitIndex,
          contextId: action === "inbox" ? "inbox" : a.contextId,
          contextName: context?.name,
          relevance,
          action,
        };
      });

      // Handle AI-suggested new contexts
      if (aiResult.newContextSuggestions) {
        for (const suggestion of aiResult.newContextSuggestions) {
          reviewItems.push(
            buildNewContextReview(suggestion.name, suggestion.unitIndices),
          );
          for (const idx of suggestion.unitIndices) {
            const existing = assignments.find((a) => a.unitIndex === idx);
            if (existing) {
              existing.action = "new-context";
              existing.suggestedContextName = suggestion.name;
            }
          }
        }
      }
    } else {
      assignments = assignHeuristic(units, contexts);
    }
  } else {
    assignments = assignHeuristic(units, contexts);
  }

  // Generate review items for suggested assignments
  for (const assignment of assignments) {
    if (assignment.action === "suggest" && assignment.contextName) {
      reviewItems.push(
        buildContextReview(
          assignment.unitIndex,
          assignment.contextName,
          assignment.relevance,
        ),
      );
    }
  }

  // Check for new context opportunities
  const newContext = detectNewContext(units, assignments);
  if (newContext) {
    reviewItems.push(
      buildNewContextReview(newContext.suggestedName, newContext.unitIndices),
    );
    for (const idx of newContext.unitIndices) {
      const existing = assignments.find((a) => a.unitIndex === idx);
      if (existing && existing.action === "inbox") {
        existing.action = "new-context";
        existing.suggestedContextName = newContext.suggestedName;
      }
    }
  }

  // Apply assignments back to units
  for (const assignment of assignments) {
    const unit = units[assignment.unitIndex];
    if (unit) {
      unit.suggestedContextId =
        assignment.contextId === "inbox" ? undefined : assignment.contextId;
      unit.contextRelevance = assignment.relevance;
    }
  }

  return { assignments, reviewItems };
}
