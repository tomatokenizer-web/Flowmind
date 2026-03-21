import type { AIProvider } from "./provider";
import { logger } from "../logger";
import { ReflectionPromptsSchema } from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type { ReflectionPrompt } from "./types";

// ─── Reflection Prompt Generation ────────────────────────────────────────────

/**
 * Generate thought-provoking reflection prompts based on units in a context.
 * Analyzes the content and surfaces hidden assumptions, alternative perspectives,
 * and connections the user may not have considered.
 */
export async function generateReflectionPrompts(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
  contextName?: string,
): Promise<ReflectionPrompt[]> {
  if (units.length === 0) return [];

  const unitsDesc = units
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 200))}`)
    .join("\n");

  const contextClause = contextName
    ? `\nContext name: ${sanitizeUserContent(contextName)}`
    : "";

  const prompt = `${PROMPT_INJECTION_GUARD}

You are a Socratic thinking partner helping a user reflect deeply on their ideas.
Analyze these thought units and generate reflection prompts that challenge, deepen, or connect the ideas.
${contextClause}

Units:
${unitsDesc}

Generate 3-5 reflection prompts from diverse categories:
- "assumption": Surface hidden assumptions underlying the ideas
- "opposite": Challenge the user to consider the opposite viewpoint
- "connection": Point out potential connections between ideas or to broader concepts
- "consequence": Ask about downstream implications or consequences
- "evidence": Prompt the user to seek or evaluate supporting evidence
- "reframe": Suggest an alternative way to frame or think about the topic

Each prompt should be specific to the actual content, not generic.
Include a brief rationale explaining why this reflection matters.
If a prompt relates to a specific unit, include that unit's ID.`;

  const result = await provider.generateStructured<{ prompts: ReflectionPrompt[] }>(prompt, {
    temperature: 0.6,
    maxTokens: 1024,
    zodSchema: ReflectionPromptsSchema,
    schema: {
      name: "ReflectionPrompts",
      description: "Thought-provoking reflection prompts based on the user's ideas",
      properties: {
        prompts: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string", maxLength: 300 },
              category: {
                type: "string",
                enum: ["assumption", "opposite", "connection", "consequence", "evidence", "reframe"],
              },
              targetUnitId: { type: "string" },
              rationale: { type: "string", maxLength: 200 },
            },
            required: ["question", "category", "rationale"],
          },
        },
      },
      required: ["prompts"],
    },
  });

  logger.info({ count: result.prompts.length }, "Reflection prompts generated");
  return result.prompts;
}
