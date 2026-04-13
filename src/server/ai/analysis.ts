import type { AIProvider } from "./provider";
import { logger } from "../logger";
import {
  ContradictionsSchema,
  CompletenessAnalysisSchema,
  ContextSummarySchema,
} from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  ContradictionPair,
  CompletenessAnalysis,
  ContextSummary,
} from "./types";

// ─── Analysis Functions ──────────────────────────────────────────────────────

/**
 * Detect contradictions between units in a context
 */
export async function detectContradictions(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<ContradictionPair[]> {
  if (units.length < 2) return [];

  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 150))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Analyze these thought units for contradictions or tensions.

Units:
${unitsDesc}

Identify pairs that:
- Directly contradict each other
- Have logical tension
- Make incompatible assumptions`;

  const result = await provider.generateStructured<{ contradictions: ContradictionPair[] }>(prompt, {
    temperature: 0.3,
    maxTokens: 1024,
    zodSchema: ContradictionsSchema,
    schema: {
      name: "Contradictions",
      description: "Detected contradictions between units",
      properties: {
        contradictions: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              unitAId: { type: "string" },
              unitBId: { type: "string" },
              description: { type: "string", maxLength: 200 },
              severity: { type: "string", enum: ["direct", "tension", "potential"] },
              suggestedResolution: { type: "string", maxLength: 200 },
            },
            required: ["unitAId", "unitBId", "description", "severity", "suggestedResolution"],
          },
        },
      },
      required: ["contradictions"],
    },
  });

  logger.info({ count: result.contradictions.length }, "Contradictions detected");
  return result.contradictions;
}

/**
 * Analyze completeness of an argument or context
 */
export async function analyzeCompleteness(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<CompletenessAnalysis> {
  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 150))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Analyze the completeness of this set of thought units as an argument or analysis.

Units:
${unitsDesc}

Provide TWO separate scores (0-1 each):
1. structureScore: How well-structured is the argument? (evidence coverage, counter-arguments, definitions, logical flow)
2. depthScore: How epistemically mature? (assumptions surfaced, questions resolved, confidence justified)

Also identify missing elements and suggest improvements.`;

  const result = await provider.generateStructured<CompletenessAnalysis>(prompt, {
    temperature: 0.4,
    maxTokens: 1024,
    zodSchema: CompletenessAnalysisSchema,
    schema: {
      name: "CompletenessAnalysis",
      description: "Dual-score completeness analysis per DEC-2026-002 §4",
      properties: {
        structureScore: { type: "number", minimum: 0, maximum: 1 },
        depthScore: { type: "number", minimum: 0, maximum: 1 },
        missingElements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["evidence", "counterargument", "definition", "example", "assumption"] },
              description: { type: "string", maxLength: 200 },
              priority: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["type", "description", "priority"],
          },
        },
        suggestions: { type: "array", items: { type: "string", maxLength: 200 } },
      },
      required: ["structureScore", "depthScore", "missingElements", "suggestions"],
    },
  });

  logger.info({ structureScore: result.structureScore, depthScore: result.depthScore, missingCount: result.missingElements.length }, "Completeness analyzed");
  return result;
}

/**
 * Generate a summary of a context's content
 */
export async function summarizeContext(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<ContextSummary> {
  const unitsDesc = units
    .map((u) => `(${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 200))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Summarize this collection of thought units.

Units:
${unitsDesc}

Provide:
- The main thesis or central idea
- Key supporting points
- Open questions that remain
- Any conflicting viewpoints`;

  const result = await provider.generateStructured<ContextSummary>(prompt, {
    temperature: 0.3,
    maxTokens: 768,
    zodSchema: ContextSummarySchema,
    schema: {
      name: "ContextSummary",
      description: "Summary of context content",
      properties: {
        mainThesis: { type: "string", maxLength: 300 },
        keyPoints: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 5 },
        openQuestions: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 3 },
        conflictingViews: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 3 },
      },
      required: ["mainThesis", "keyPoints", "openQuestions", "conflictingViews"],
    },
  });

  logger.info("Context summary generated");
  return result;
}
