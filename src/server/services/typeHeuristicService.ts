import type { UnitType } from "@prisma/client";

// ─── Content Heuristic Type Assignment ─────────────────────────────
// Simple rule-based system — NOT an AI call.
// AI-powered type suggestion comes in Epic 5.

export interface HeuristicResult {
  /** The suggested unit type */
  unitType: UnitType;
  /** Confidence level: "high" if strong pattern match, "low" if fallback */
  confidence: "high" | "medium" | "low";
  /** Which rule matched (for debugging / transparency) */
  matchedRule: string;
}

interface HeuristicRule {
  name: string;
  unitType: UnitType;
  confidence: "high" | "medium";
  test: (content: string) => boolean;
}

// Rules are evaluated top-to-bottom; first match wins.
const HEURISTIC_RULES: HeuristicRule[] = [
  // ── Question: ends with ? ────────────────────────────────────────
  {
    name: "ends_with_question_mark",
    unitType: "question",
    confidence: "high",
    test: (c) => /\?\s*$/.test(c),
  },
  {
    name: "starts_with_question_word",
    unitType: "question",
    confidence: "medium",
    test: (c) => /^(who|what|where|when|why|how|is|are|can|could|should|would|do|does|did)\b/i.test(c),
  },

  // ── Counterargument: starts with contrast markers ────────────────
  {
    name: "starts_with_contrast",
    unitType: "counterargument",
    confidence: "high",
    test: (c) => /^(but|however|on the other hand|conversely|although|nevertheless|yet|despite|in contrast)\b/i.test(c),
  },

  // ── Evidence: starts with evidential markers ─────────────────────
  {
    name: "starts_with_evidence_marker",
    unitType: "evidence",
    confidence: "high",
    test: (c) => /^(for example|for instance|e\.g\.|according to|research shows|data shows|studies show|the data|evidence suggests)\b/i.test(c),
  },
  {
    name: "contains_citation_pattern",
    unitType: "evidence",
    confidence: "medium",
    test: (c) => /\(\d{4}\)|\[\d+\]|https?:\/\//.test(c),
  },

  // ── Idea: speculative / generative markers ───────────────────────
  {
    name: "starts_with_speculative",
    unitType: "idea",
    confidence: "high",
    test: (c) => /^(what if|maybe|perhaps|imagine|how about|we could|it might be|one idea)\b/i.test(c),
  },

  // ── Definition: definitional markers ─────────────────────────────
  {
    name: "contains_definition_pattern",
    unitType: "definition",
    confidence: "high",
    test: (c) => /^.{1,60}\b(is defined as|means|refers to|is the)\b/i.test(c),
  },

  // ── Assumption: assumption markers ───────────────────────────────
  {
    name: "starts_with_assumption",
    unitType: "assumption",
    confidence: "high",
    test: (c) => /^(assuming|let's assume|given that|if we assume|it is assumed|we take for granted)\b/i.test(c),
  },

  // ── Action: imperative / task markers ────────────────────────────
  {
    name: "starts_with_action",
    unitType: "action",
    confidence: "high",
    test: (c) => /^(todo|action|next step|we need to|we should|let's|implement|create|build|fix|resolve|decide)\b/i.test(c),
  },

  // ── Claim: assertion markers ─────────────────────────────────────
  {
    name: "starts_with_belief",
    unitType: "claim",
    confidence: "high",
    test: (c) => /^(i think|i believe|i argue|it is|this is|the point is|my position is|i contend)\b/i.test(c),
  },
  {
    name: "starts_with_strong_assertion",
    unitType: "claim",
    confidence: "medium",
    test: (c) => /^(clearly|obviously|certainly|undoubtedly|it's clear that|the fact is)\b/i.test(c),
  },
];

/**
 * Suggest a unit type based on content heuristics.
 * Returns `observation` as fallback when no rule matches.
 */
export function suggestUnitType(content: string): HeuristicResult {
  const trimmed = content.trim();

  for (const rule of HEURISTIC_RULES) {
    if (rule.test(trimmed)) {
      return {
        unitType: rule.unitType,
        confidence: rule.confidence,
        matchedRule: rule.name,
      };
    }
  }

  // Default fallback: observation (the most neutral type)
  return {
    unitType: "observation",
    confidence: "low",
    matchedRule: "fallback_observation",
  };
}
