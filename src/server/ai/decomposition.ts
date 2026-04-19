import type { AIProvider } from "./provider";
import type { SafetyGuard } from "./safetyGuard";
import { z } from "zod";
import { logger } from "../logger";
import {
  PurposeClassificationSchema,
  DecompositionBoundariesSchema,
  DecompositionRelationProposalsSchema,
} from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  UserPurpose,
  DecompositionBoundary,
  DecompositionRelationProposal,
  UnitProposal,
  DecompositionResult,
  AIServiceContext,
} from "./types";

const RefinementJudgmentSchema = z.object({
  refined: z.string(),
  unitType: z.enum([
    "claim", "question", "evidence", "counterargument",
    "observation", "idea", "definition", "assumption", "action",
  ]),
  shouldDecompose: z.boolean(),
  reason: z.string(),
});

// ─── Decomposition Functions ─────────────────────────────────────────────────

/**
 * Smart capture: refine text first, then decompose only if warranted.
 *
 * Step 0: Refine the raw text for clarity and coherence
 * Step 1: AI judges whether decomposition is needed
 * Step 2: If yes — classify purpose, propose boundaries, propose relations
 * Step 3: If no — return refined text as a single unit
 */
export async function decomposeText(
  provider: AIProvider,
  safetyGuard: SafetyGuard,
  text: string,
  contextId: string,
  existingUnits: Array<{ id: string; content: string; unitType: string }>,
  ctx: AIServiceContext
): Promise<DecompositionResult> {
  // Very short text: skip AI entirely
  if (text.length < 20) {
    const tempId = `temp-${Date.now()}-0`;
    return {
      purpose: "other",
      proposals: [
        {
          id: tempId,
          content: text,
          proposedType: "observation",
          confidence: 0.5,
          startChar: 0,
          endChar: text.length,
          lifecycle: "draft",
          originType: "ai_generated",
        },
      ],
      relationProposals: [],
    };
  }

  // Safety check
  const check = await safetyGuard.runAllChecks({
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    requestUnitCount: 3,
    contextId: ctx.contextId,
  });

  if (!check.allowed && check.error) {
    throw new Error(check.error.message);
  }

  // ─── Step 0: Refine text + judge decomposition need ────────────────
  const refinePrompt = `${PROMPT_INJECTION_GUARD}

Process the user's text below. Return JSON with these fields:

- refined: The user's text rewritten for clarity. Fix grammar, untangle convoluted sentences, sharpen vague phrasing. Preserve all ideas and details but the length can change. Do not return instructions or meta-text — return the actual refined content.
- unitType: The cognitive type (question, claim, evidence, counterargument, observation, idea, definition, assumption, action)
- shouldDecompose: true if the text contains multiple independent ideas with different cognitive types. Longer text with distinct topics should generally be decomposed.
- reason: Brief explanation.

<user_input>
${sanitizeUserContent(text)}
</user_input>`;

  const judgment = await provider.generateStructured<z.infer<typeof RefinementJudgmentSchema>>(
    refinePrompt,
    {
      temperature: 0.3,
      maxTokens: 4096,
      zodSchema: RefinementJudgmentSchema,
      schema: {
        name: "RefinementJudgment",
        description: "Refined text with type classification and decomposition judgment",
        properties: {
          refined: { type: "string" },
          unitType: {
            type: "string",
            enum: [
              "claim", "question", "evidence", "counterargument",
              "observation", "idea", "definition", "assumption", "action",
            ],
          },
          shouldDecompose: { type: "boolean" },
          reason: { type: "string", maxLength: 200 },
        },
        required: ["refined", "unitType", "shouldDecompose", "reason"],
      },
    }
  );

  const refinedText = judgment.refined;

  logger.info(
    { shouldDecompose: judgment.shouldDecompose, unitType: judgment.unitType, reason: judgment.reason, originalLen: text.length, refinedLen: refinedText.length },
    "AI refinement + type classification + decomposition judgment"
  );

  // ─── No decomposition needed: return refined text as single unit ───
  if (!judgment.shouldDecompose) {
    const classifiedType = judgment.unitType;
    const purposeResult = await classifyPurpose(provider, refinedText);

    const tempId = `temp-${Date.now()}-0`;
    return {
      purpose: purposeResult.purpose,
      proposals: [
        {
          id: tempId,
          content: refinedText,
          proposedType: classifiedType,
          confidence: purposeResult.confidence,
          startChar: 0,
          endChar: refinedText.length,
          lifecycle: "draft",
          originType: "ai_generated",
        },
      ],
      relationProposals: await proposeRelations(provider, [{ content: refinedText, proposedType: classifiedType }], existingUnits),
    };
  }

  // ─── Decomposition warranted: full pipeline on refined text ────────

  // Step 1: Classify purpose
  const purposeResult = await classifyPurpose(provider, refinedText);

  // Step 2: Propose boundaries on the REFINED text
  const proposals = await proposeBoundaries(provider, refinedText);

  // Step 3: Propose relations
  const relationProposals = await proposeRelations(provider, proposals, existingUnits);

  logger.info(
    {
      purpose: purposeResult.purpose,
      proposalCount: proposals.length,
      relationCount: relationProposals.length,
    },
    "AI decomposition completed"
  );

  return {
    purpose: purposeResult.purpose,
    proposals: proposals.map((p, idx) => ({
      ...p,
      id: `temp-${Date.now()}-${idx}`,
      lifecycle: "draft" as const,
      originType: "ai_generated" as const,
    })),
    relationProposals,
  };
}

// ─── Helper: Classify Purpose ─────────────────────────────────────────────

async function classifyPurpose(
  provider: AIProvider,
  text: string,
): Promise<{ purpose: UserPurpose; confidence: number }> {
  const purposePrompt = `${PROMPT_INJECTION_GUARD}

Analyze the following text and determine the user's primary cognitive purpose.

Text: ${sanitizeUserContent(text.slice(0, 1000))}

Available purposes:
- arguing: Building or defending a logical argument with claims and evidence
- brainstorming: Generating ideas, possibilities, exploring options
- researching: Gathering information, noting observations, collecting evidence
- defining: Clarifying concepts, explaining terms, establishing meaning
- other: General note-taking, mixed purposes, or unclear intent

Respond with the most appropriate purpose.`;

  return provider.generateStructured<{ purpose: UserPurpose; confidence: number }>(
    purposePrompt,
    {
      temperature: 0.3,
      maxTokens: 128,
      zodSchema: PurposeClassificationSchema,
      schema: {
        name: "PurposeClassification",
        description: "Classification of user's cognitive purpose",
        properties: {
          purpose: {
            type: "string",
            enum: ["arguing", "brainstorming", "researching", "defining", "other"],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["purpose", "confidence"],
      },
    }
  );
}

// ─── Helper: Propose Boundaries ───────────────────────────────────────────

async function proposeBoundaries(
  provider: AIProvider,
  text: string,
): Promise<Array<{ content: string; proposedType: string; confidence: number; startChar: number; endChar: number }>> {
  const boundaryPrompt = `${PROMPT_INJECTION_GUARD}

Split the user's text into self-contained thought units at natural topic boundaries. Use as many units as the content requires.

Each unit needs: startChar (0-based), endChar (exclusive), content (exact text from that segment, not a summary), proposedType (claim/question/evidence/counterargument/observation/idea/definition/assumption/action), confidence (0-1).

Units must not overlap and must cover the entire text.

<user_input>
${sanitizeUserContent(text)}
</user_input>`;

  const boundaryResult = await provider.generateStructured<{ boundaries: DecompositionBoundary[] }>(
    boundaryPrompt,
    {
      temperature: 0.4,
      maxTokens: 4096,
      zodSchema: DecompositionBoundariesSchema,
      schema: {
        name: "DecompositionBoundaries",
        description: "Proposed boundaries for text decomposition",
        properties: {
          boundaries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                startChar: { type: "number", minimum: 0 },
                endChar: { type: "number", minimum: 0 },
                content: { type: "string" },
                proposedType: {
                  type: "string",
                  enum: [
                    "claim", "question", "evidence", "counterargument",
                    "observation", "idea", "definition", "assumption", "action",
                  ],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["startChar", "endChar", "content", "proposedType", "confidence"],
            },
          },
        },
        required: ["boundaries"],
      },
    }
  );

  return boundaryResult.boundaries;
}

// ─── Helper: Propose Relations ────────────────────────────────────────────

async function proposeRelations(
  provider: AIProvider,
  proposals: Array<{ content: string; proposedType: string }>,
  existingUnits: Array<{ id: string; content: string; unitType: string }>,
): Promise<DecompositionRelationProposal[]> {
  if (existingUnits.length === 0 || proposals.length === 0) return [];

  const existingUnitsDesc = existingUnits
    .slice(0, 10)
    .map((u) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 100))}`)
    .join("\n");

  const newUnitsDesc = proposals
    .map((p, i) => `[idx:${i}] (${p.proposedType}) ${sanitizeUserContent(p.content.slice(0, 100))}`)
    .join("\n");

  const relationPrompt = `${PROMPT_INJECTION_GUARD}

Analyze relationships between NEW units and EXISTING units in this context.

NEW UNITS (use index as sourceIdx):
${newUnitsDesc}

EXISTING UNITS (use id as targetUnitId):
${existingUnitsDesc}

Available relation types:
- supports: Logically backs the target unit's claim
- contradicts: Logically conflicts with the target
- derives_from: Is logically derived from the target
- expands: Develops the target more concretely
- references: References the target as background
- exemplifies: Is a concrete instance of the target's principle
- defines: Defines a key concept of the target
- questions: Raises doubt about the target

For each meaningful relationship from a NEW unit to an EXISTING unit, provide:
- sourceIdx: index of the new unit (0-based)
- targetUnitId: ID of the existing unit
- relationType: type of relationship
- strength: relationship strength (0-1)
- rationale: brief explanation`;

  const relationResult = await provider.generateStructured<{
    relations: Array<{
      sourceIdx: number;
      targetUnitId: string;
      relationType: string;
      strength: number;
      rationale: string;
    }>;
  }>(relationPrompt, {
    temperature: 0.4,
    maxTokens: 768,
    zodSchema: DecompositionRelationProposalsSchema,
    schema: {
      name: "RelationProposals",
      description: "Proposed relations between new and existing units",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceIdx: { type: "number", minimum: 0 },
              targetUnitId: { type: "string" },
              relationType: {
                type: "string",
                enum: [
                  "supports", "contradicts", "derives_from", "expands",
                  "references", "exemplifies", "defines", "questions",
                ],
              },
              strength: { type: "number", minimum: 0, maximum: 1 },
              rationale: { type: "string", maxLength: 150 },
            },
            required: ["sourceIdx", "targetUnitId", "relationType", "strength", "rationale"],
          },
        },
      },
      required: ["relations"],
    },
  });

  return relationResult.relations;
}
