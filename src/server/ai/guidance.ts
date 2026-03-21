import type { AIProvider } from "./provider";
import { logger } from "../logger";
import {
  GeneratedQuestionsSchema,
  NextStepsSchema,
  MergeSuggestionsSchema,
} from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  GeneratedQuestion,
  NextStepSuggestion,
  MergeSuggestion,
} from "./types";

// ─── Guidance Functions ──────────────────────────────────────────────────────

/**
 * Suggest units that could be merged
 */
export async function suggestMerge(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<MergeSuggestion[]> {
  if (units.length < 2) return [];

  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 150))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Analyze these thought units for potential merges.

Units:
${unitsDesc}

Identify groups that:
- Express the same idea differently
- Would be clearer as a single unit
- Are redundant or overlapping`;

  const result = await provider.generateStructured<{ suggestions: MergeSuggestion[] }>(prompt, {
    temperature: 0.4,
    maxTokens: 1024,
    zodSchema: MergeSuggestionsSchema,
    schema: {
      name: "MergeSuggestions",
      description: "Suggestions for merging units",
      properties: {
        suggestions: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              unitIds: { type: "array", items: { type: "string" }, minItems: 2 },
              mergedContent: { type: "string", maxLength: 500 },
              mergedType: {
                type: "string",
                enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"],
              },
              rationale: { type: "string", maxLength: 150 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["unitIds", "mergedContent", "mergedType", "rationale", "confidence"],
          },
        },
      },
      required: ["suggestions"],
    },
  });

  logger.info({ count: result.suggestions.length }, "Merge suggestions generated");
  return result.suggestions;
}

/**
 * Generate questions to deepen understanding
 */
export async function generateQuestions(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<GeneratedQuestion[]> {
  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 150))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Generate questions to deepen understanding of these thought units.

Units:
${unitsDesc}

Generate questions that:
- Clarify ambiguous points
- Challenge assumptions
- Explore new directions
- Connect ideas`;

  const result = await provider.generateStructured<{ questions: GeneratedQuestion[] }>(prompt, {
    temperature: 0.5,
    maxTokens: 768,
    zodSchema: GeneratedQuestionsSchema,
    schema: {
      name: "GeneratedQuestions",
      description: "Questions to deepen understanding",
      properties: {
        questions: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              content: { type: "string", maxLength: 200 },
              type: { type: "string", enum: ["clarifying", "challenging", "exploratory", "connecting"] },
              targetUnitId: { type: "string" },
              rationale: { type: "string", maxLength: 150 },
            },
            required: ["content", "type", "rationale"],
          },
        },
      },
      required: ["questions"],
    },
  });

  logger.info({ count: result.questions.length }, "Questions generated");
  return result.questions;
}

/**
 * Suggest next steps for developing the argument
 */
export async function suggestNextSteps(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<NextStepSuggestion[]> {
  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 150))}`)
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Suggest next steps for developing this collection of thought units.

Units:
${unitsDesc}

Suggest actions that would:
- Strengthen the argument
- Fill gaps
- Resolve contradictions
- Explore new directions`;

  const result = await provider.generateStructured<{ steps: NextStepSuggestion[] }>(prompt, {
    temperature: 0.5,
    maxTokens: 768,
    zodSchema: NextStepsSchema,
    schema: {
      name: "NextSteps",
      description: "Suggested next steps",
      properties: {
        steps: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              action: { type: "string", maxLength: 200 },
              type: { type: "string", enum: ["research", "define", "challenge", "connect", "expand", "resolve"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              relatedUnitIds: { type: "array", items: { type: "string" } },
              rationale: { type: "string", maxLength: 150 },
            },
            required: ["action", "type", "priority", "relatedUnitIds", "rationale"],
          },
        },
      },
      required: ["steps"],
    },
  });

  logger.info({ count: result.steps.length }, "Next steps suggested");
  return result.steps;
}
