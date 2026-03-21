import type { AIProvider } from "./provider";
import type { SafetyGuard } from "./safetyGuard";
import { logger } from "../logger";
import {
  RelationSuggestionsSchema,
  AlternativeFramingsSchema,
  CounterArgumentsSchema,
  AssumptionsSchema,
} from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  RelationSuggestion,
  AlternativeFraming,
  CounterArgument,
  IdentifiedAssumption,
  AIServiceContext,
} from "./types";

// ─── Suggestion Functions ────────────────────────────────────────────────────

/**
 * Suggest relations between a new unit and existing units in context
 */
export async function suggestRelations(
  provider: AIProvider,
  safetyGuard: SafetyGuard,
  newUnitContent: string,
  existingUnits: Array<{ id: string; content: string; unitType: string }>,
  ctx: AIServiceContext
): Promise<RelationSuggestion[]> {
  if (existingUnits.length === 0) {
    return [];
  }

  const check = await safetyGuard.runAllChecks({
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    requestUnitCount: 0,
    contextId: ctx.contextId,
  });

  if (!check.allowed && check.error) {
    throw new Error(check.error.message);
  }

  const existingUnitsDescription = existingUnits
    .slice(0, 10)
    .map(
      (u, i) =>
        `[${i}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 100))} (id: ${u.id})`
    )
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

Analyze the relationship between a new thought unit and existing units.

New unit: ${sanitizeUserContent(newUnitContent.slice(0, 300))}

Existing units:
${existingUnitsDescription}

Available relation types:
- supports: Logically backs the other unit's claim
- contradicts: Logically conflicts with the other
- derives_from: Is logically derived from the other
- expands: Develops the other more concretely
- references: References the other as background
- exemplifies: Is a concrete instance of the other's principle
- defines: Defines a key concept of the other
- questions: Raises doubt about the other

Suggest up to 3 most relevant relations from the new unit to existing units.`;

  const result = await provider.generateStructured<{
    relations: RelationSuggestion[];
  }>(prompt, {
    temperature: 0.4,
    maxTokens: 512,
    zodSchema: RelationSuggestionsSchema,
    schema: {
      name: "RelationSuggestions",
      description: "AI suggestions for unit relations",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              targetUnitId: { type: "string" },
              relationType: {
                type: "string",
                enum: [
                  "supports",
                  "contradicts",
                  "derives_from",
                  "expands",
                  "references",
                  "exemplifies",
                  "defines",
                  "questions",
                ],
              },
              strength: { type: "number", minimum: 0, maximum: 1 },
              reasoning: { type: "string", maxLength: 150 },
            },
            required: ["targetUnitId", "relationType", "strength", "reasoning"],
          },
          maxItems: 3,
        },
      },
      required: ["relations"],
    },
  });

  logger.info(
    { count: result.relations.length },
    "AI relation suggestions generated"
  );

  return result.relations;
}

/**
 * Generate alternative ways to frame a unit's content
 */
export async function generateAlternativeFraming(
  provider: AIProvider,
  content: string,
  currentType: string,
): Promise<AlternativeFraming[]> {
  const prompt = `${PROMPT_INJECTION_GUARD}

Suggest alternative ways to frame or express this thought unit.

Content: ${sanitizeUserContent(content.slice(0, 500))}
Current type: ${currentType}

Generate 2-3 alternative framings that:
- Express the same core idea differently
- Might be categorized as a different unit type
- Could reveal new perspectives or connections`;

  const result = await provider.generateStructured<{ framings: AlternativeFraming[] }>(prompt, {
    temperature: 0.6,
    maxTokens: 768,
    zodSchema: AlternativeFramingsSchema,
    schema: {
      name: "AlternativeFramings",
      description: "Alternative ways to frame the content",
      properties: {
        framings: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              reframedContent: { type: "string", maxLength: 500 },
              newType: {
                type: "string",
                enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"],
              },
              rationale: { type: "string", maxLength: 150 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["reframedContent", "newType", "rationale", "confidence"],
          },
        },
      },
      required: ["framings"],
    },
  });

  logger.info({ count: result.framings.length }, "Alternative framings generated");
  return result.framings;
}

/**
 * Suggest counter-arguments for a claim or argument
 */
export async function suggestCounterArguments(
  provider: AIProvider,
  content: string,
  unitType: string,
): Promise<CounterArgument[]> {
  const prompt = `${PROMPT_INJECTION_GUARD}

Generate thoughtful counter-arguments or challenges to this thought unit.

Content: ${sanitizeUserContent(content.slice(0, 500))}
Type: ${unitType}

Generate 2-3 counter-arguments that:
- Challenge the core assertion or assumption
- Are logically sound and fair
- Could strengthen the original argument if addressed`;

  const result = await provider.generateStructured<{ counterArguments: CounterArgument[] }>(prompt, {
    temperature: 0.5,
    maxTokens: 768,
    zodSchema: CounterArgumentsSchema,
    schema: {
      name: "CounterArguments",
      description: "Counter-arguments to the content",
      properties: {
        counterArguments: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              content: { type: "string", maxLength: 400 },
              strength: { type: "number", minimum: 0, maximum: 1 },
              targetsClaim: { type: "string", maxLength: 100 },
              rationale: { type: "string", maxLength: 150 },
            },
            required: ["content", "strength", "targetsClaim", "rationale"],
          },
        },
      },
      required: ["counterArguments"],
    },
  });

  logger.info({ count: result.counterArguments.length }, "Counter-arguments generated");
  return result.counterArguments;
}

/**
 * Identify underlying assumptions in content
 */
export async function identifyAssumptions(
  provider: AIProvider,
  content: string,
): Promise<IdentifiedAssumption[]> {
  const prompt = `${PROMPT_INJECTION_GUARD}

Identify the underlying assumptions in this thought unit.

Content: ${sanitizeUserContent(content.slice(0, 500))}

Find both explicit and implicit assumptions that:
- The argument depends on to be valid
- May need to be verified or challenged
- Could affect the conclusion if false`;

  const result = await provider.generateStructured<{ assumptions: IdentifiedAssumption[] }>(prompt, {
    temperature: 0.4,
    maxTokens: 768,
    zodSchema: AssumptionsSchema,
    schema: {
      name: "Assumptions",
      description: "Identified assumptions in the content",
      properties: {
        assumptions: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              content: { type: "string", maxLength: 300 },
              isExplicit: { type: "boolean" },
              importance: { type: "string", enum: ["critical", "moderate", "minor"] },
              rationale: { type: "string", maxLength: 150 },
            },
            required: ["content", "isExplicit", "importance", "rationale"],
          },
        },
      },
      required: ["assumptions"],
    },
  });

  logger.info({ count: result.assumptions.length }, "Assumptions identified");
  return result.assumptions;
}
