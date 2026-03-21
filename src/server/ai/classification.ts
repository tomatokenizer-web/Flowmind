import type { AIProvider } from "./provider";
import type { SafetyGuard } from "./safetyGuard";
import { logger } from "../logger";
import {
  TypeSuggestionSchema,
  ExtractedTermsSchema,
  StanceClassificationSchema,
} from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  TypeSuggestion,
  ExtractedTerm,
  StanceClassification,
  AIServiceContext,
} from "./types";

// ─── Classification Functions ────────────────────────────────────────────────

/**
 * Suggest a unit type based on content analysis
 */
export async function suggestUnitType(
  provider: AIProvider,
  safetyGuard: SafetyGuard,
  content: string,
  ctx: AIServiceContext
): Promise<TypeSuggestion> {
  const check = await safetyGuard.runAllChecks({
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    requestUnitCount: 0,
    contextId: ctx.contextId,
  });

  if (!check.allowed && check.error) {
    throw new Error(check.error.message);
  }

  const prompt = `${PROMPT_INJECTION_GUARD}

Analyze the following text and determine its primary cognitive function.

Text: ${sanitizeUserContent(content.slice(0, 500))}

Available unit types:
- claim: An assertion or statement that could be true or false
- question: A query seeking information or understanding
- evidence: Data, facts, or observations supporting a claim
- counterargument: An opposing viewpoint or challenge to a claim
- observation: A direct perception or noticed phenomenon
- idea: A creative thought or proposal for exploration
- definition: A precise explanation of a term or concept
- assumption: An unstated premise underlying reasoning
- action: A task or step to be taken

Respond with the most appropriate unit type.`;

  const result = await provider.generateStructured<TypeSuggestion>(prompt, {
    temperature: 0.3,
    maxTokens: 256,
    zodSchema: TypeSuggestionSchema,
    schema: {
      name: "TypeSuggestion",
      description: "AI suggestion for unit type classification",
      properties: {
        unitType: {
          type: "string",
          enum: [
            "claim",
            "question",
            "evidence",
            "counterargument",
            "observation",
            "idea",
            "definition",
            "assumption",
            "action",
          ],
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
        reasoning: {
          type: "string",
          maxLength: 200,
        },
      },
      required: ["unitType", "confidence", "reasoning"],
    },
  });

  logger.info(
    { unitType: result.unitType, confidence: result.confidence },
    "AI type suggestion generated"
  );

  return result;
}

/**
 * Extract key terms from content
 */
export async function extractKeyTerms(
  provider: AIProvider,
  units: Array<{ id: string; content: string; unitType: string }>,
): Promise<ExtractedTerm[]> {
  const allContent = units.map((u) => u.content).join(" ");

  const prompt = `${PROMPT_INJECTION_GUARD}

Extract key terms from this content that may need definition or clarification.

Content: ${sanitizeUserContent(allContent.slice(0, 1500))}

Identify terms that:
- Are central to the argument
- May have specialized meaning
- Could be ambiguous
- Should be explicitly defined`;

  const result = await provider.generateStructured<{ terms: ExtractedTerm[] }>(prompt, {
    temperature: 0.3,
    maxTokens: 768,
    zodSchema: ExtractedTermsSchema,
    schema: {
      name: "ExtractedTerms",
      description: "Key terms extracted from content",
      properties: {
        terms: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              term: { type: "string", maxLength: 100 },
              definition: { type: "string", maxLength: 200 },
              occurrences: { type: "number", minimum: 1 },
              importance: { type: "string", enum: ["key", "supporting", "peripheral"] },
              suggestDefine: { type: "boolean" },
            },
            required: ["term", "occurrences", "importance", "suggestDefine"],
          },
        },
      },
      required: ["terms"],
    },
  });

  logger.info({ count: result.terms.length }, "Key terms extracted");
  return result.terms;
}

/**
 * Classify the stance of a unit relative to another
 */
export async function classifyStance(
  provider: AIProvider,
  unitContent: string,
  targetContent: string,
): Promise<StanceClassification> {
  const prompt = `${PROMPT_INJECTION_GUARD}

Classify the stance of one thought unit relative to another.

Unit A: ${sanitizeUserContent(unitContent.slice(0, 400))}

Unit B (target): ${sanitizeUserContent(targetContent.slice(0, 400))}

Determine whether Unit A supports, opposes, is neutral to, or is exploring Unit B's position.`;

  const result = await provider.generateStructured<StanceClassification>(prompt, {
    temperature: 0.3,
    maxTokens: 512,
    zodSchema: StanceClassificationSchema,
    schema: {
      name: "StanceClassification",
      description: "Classification of stance between units",
      properties: {
        stance: { type: "string", enum: ["support", "oppose", "neutral", "exploring"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        rationale: { type: "string", maxLength: 200 },
        keyIndicators: { type: "array", items: { type: "string", maxLength: 100 }, maxItems: 3 },
      },
      required: ["stance", "confidence", "rationale", "keyIndicators"],
    },
  });

  logger.info({ stance: result.stance, confidence: result.confidence }, "Stance classified");
  return result;
}
