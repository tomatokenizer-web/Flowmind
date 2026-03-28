/**
 * Confidence Scoring Utilities
 *
 * Shared logic for confidence thresholds, cascading fallbacks,
 * and action determination across all pipeline passes.
 */

import {
  WITHIN_RELATION_CONFIG,
  CROSS_RELATION_CONFIG,
  CONTEXT_CONFIG,
  CLASSIFICATION_CONFIG,
} from "../config";
import type {
  ReviewItem,
  ReviewReason,
} from "../types";

// ─── Action Determination ────────────────────────────────────────────────

export type RelationAction = "auto-accept" | "suggest" | "hidden" | "discard";
export type ContextAction = "auto-assign" | "suggest" | "inbox" | "new-context";

/**
 * Determine the action for a within-input relation based on confidence.
 */
export function getWithinRelationAction(confidence: number): RelationAction {
  const cfg = WITHIN_RELATION_CONFIG;
  if (confidence >= cfg.autoAcceptThreshold) return "auto-accept";
  if (confidence >= cfg.suggestThreshold) return "suggest";
  if (confidence >= cfg.hiddenThreshold) return "hidden";
  return "discard";
}

/**
 * Determine the action for a cross-graph relation based on confidence.
 * Uses stricter thresholds than within-input relations.
 */
export function getCrossRelationAction(confidence: number): RelationAction {
  const cfg = CROSS_RELATION_CONFIG;
  if (confidence >= cfg.autoAcceptThreshold) return "auto-accept";
  if (confidence >= cfg.suggestThreshold) return "suggest";
  if (confidence >= cfg.hiddenThreshold) return "hidden";
  return "discard";
}

/**
 * Determine the action for a context assignment based on relevance score.
 */
export function getContextAction(relevance: number): ContextAction {
  const cfg = CONTEXT_CONFIG;
  if (relevance >= cfg.autoAssignThreshold) return "auto-assign";
  if (relevance >= cfg.suggestThreshold) return "suggest";
  return "inbox";
}

/**
 * Check if a classification needs user review.
 */
export function needsClassificationReview(confidence: number): boolean {
  return confidence < CLASSIFICATION_CONFIG.userConfirmationThreshold;
}

/**
 * Check if a domain template type should override the AI classification.
 */
export function shouldDomainOverride(confidence: number): boolean {
  return confidence >= CLASSIFICATION_CONFIG.domainOverrideThreshold;
}

// ─── Review Item Builders ────────────────────────────────────────────────

/**
 * Create a review item for a low-confidence extraction.
 */
export function buildExtractionReview(
  unitIndex: number,
  confidence: number,
  content: string,
): ReviewItem {
  return {
    type: "low-extraction-confidence" as ReviewReason,
    unitIndex,
    message: `Unit ${unitIndex} extracted with low confidence (${(confidence * 100).toFixed(0)}%). Review content: "${truncate(content, 80)}"`,
    data: { confidence, content },
  };
}

/**
 * Create a review item for a low-confidence type classification.
 */
export function buildClassificationReview(
  unitIndex: number,
  type: string,
  confidence: number,
): ReviewItem {
  return {
    type: "low-type-confidence" as ReviewReason,
    unitIndex,
    message: `Unit ${unitIndex} classified as "${type}" with low confidence (${(confidence * 100).toFixed(0)}%). Please confirm.`,
    data: { type, confidence },
  };
}

/**
 * Create a review item for an ambiguous context assignment.
 */
export function buildContextReview(
  unitIndex: number,
  contextName: string,
  relevance: number,
): ReviewItem {
  return {
    type: "ambiguous-context" as ReviewReason,
    unitIndex,
    message: `Unit ${unitIndex} may belong to "${contextName}" (relevance: ${(relevance * 100).toFixed(0)}%). Confirm assignment?`,
    data: { contextName, relevance },
  };
}

/**
 * Create a review item for a suggested relation.
 */
export function buildRelationReview(
  sourceIndex: number,
  targetIndex: number,
  relationType: string,
  confidence: number,
): ReviewItem {
  return {
    type: "suggested-relation" as ReviewReason,
    message: `Possible "${relationType}" relation between units ${sourceIndex} and ${targetIndex} (confidence: ${(confidence * 100).toFixed(0)}%).`,
    data: { sourceIndex, targetIndex, relationType, confidence },
  };
}

/**
 * Create a review item for a new context proposal.
 */
export function buildNewContextReview(
  suggestedName: string,
  unitIndices: number[],
): ReviewItem {
  return {
    type: "new-context-proposal" as ReviewReason,
    message: `${unitIndices.length} units don't fit existing contexts well. Suggested new context: "${suggestedName}".`,
    data: { suggestedName, unitIndices },
  };
}

// ─── Confidence Aggregation ──────────────────────────────────────────────

/**
 * Compute a weighted average confidence from multiple signals.
 */
export function weightedConfidence(
  scores: Array<{ value: number; weight: number }>,
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return Math.min(1.0, Math.max(0.0, weighted / totalWeight));
}

/**
 * Clamp confidence to [0, 1] range.
 */
export function clampConfidence(value: number): number {
  return Math.min(1.0, Math.max(0.0, value));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
