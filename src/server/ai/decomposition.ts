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

You are processing raw user input for a thought management tool. Do TWO things:

1. REFINE the text: fix grammar, improve clarity, tighten prose. Preserve the original meaning and voice. Do not add new ideas or remove existing ones.

2. JUDGE whether this text should be DECOMPOSED into multiple thought units.

Decomposition is ONLY warranted when the text contains genuinely DISTINCT ideas that belong as separate units — for example:
- A claim AND its supporting evidence (different cognitive functions)
- A question AND an observation about a different topic
- Multiple independent ideas mixed in one block of text
- An argument with a counterargument embedded in it

Decomposition is NOT warranted when:
- The text is a single coherent thought, even if it's multiple sentences
- The text is one paragraph exploring one idea from different angles
- Splitting would create fragments that don't stand on their own
- The text is short (under ~200 characters) unless it clearly mixes distinct types

Text to process:
${sanitizeUserContent(text)}

Respond with:
- refined: the cleaned-up version of the full text
- shouldDecompose: true only if the text contains genuinely distinct unit types
- reason: brief explanation of your judgment`;

  const judgment = await provider.generateStructured<z.infer<typeof RefinementJudgmentSchema>>(
    refinePrompt,
    {
      temperature: 0.3,
      maxTokens: 2048,
      zodSchema: RefinementJudgmentSchema,
      schema: {
        name: "RefinementJudgment",
        description: "Refined text with decomposition judgment",
        properties: {
          refined: { type: "string" },
          shouldDecompose: { type: "boolean" },
          reason: { type: "string", maxLength: 200 },
        },
        required: ["refined", "shouldDecompose", "reason"],
      },
    }
  );

  const refinedText = judgment.refined;

  logger.info(
    { shouldDecompose: judgment.shouldDecompose, reason: judgment.reason, originalLen: text.length, refinedLen: refinedText.length },
    "AI refinement + decomposition judgment"
  );

  // ─── No decomposition needed: return refined text as single unit ───
  if (!judgment.shouldDecompose) {
    // Still classify the purpose for metadata
    const purposeResult = await classifyPurpose(provider, refinedText);

    const typeMap: Record<UserPurpose, string> = {
      arguing: "claim",
      brainstorming: "idea",
      researching: "observation",
      defining: "definition",
      other: "observation",
    };

    const tempId = `temp-${Date.now()}-0`;
    return {
      purpose: purposeResult.purpose,
      proposals: [
        {
          id: tempId,
          content: refinedText,
          proposedType: typeMap[purposeResult.purpose] ?? "observation",
          confidence: purposeResult.confidence,
          startChar: 0,
          endChar: refinedText.length,
          lifecycle: "draft",
          originType: "ai_generated",
        },
      ],
      relationProposals: await proposeRelations(provider, [{ content: refinedText, proposedType: typeMap[purposeResult.purpose] ?? "observation" }], existingUnits),
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

Split the following text into distinct thought units. Each unit should be a complete, self-contained thought that can stand alone.

Text: ${sanitizeUserContent(text)}

Guidelines:
- Maximum 3 units (focus on the most important divisions)
- Each unit should have a clear cognitive function (claim, question, evidence, etc.)
- Units MUST be meaningfully different in type or topic — do not split a single coherent argument into arbitrary pieces
- Preserve the exact character positions for boundaries
- Units should not overlap
- Cover the entire text

Available unit types: claim, question, evidence, counterargument, observation, idea, definition, assumption, action

For each unit, provide:
- startChar: starting character index (0-based)
- endChar: ending character index (exclusive)
- content: the exact text content
- proposedType: the suggested unit type
- confidence: how confident you are in this split (0-1)`;

  const boundaryResult = await provider.generateStructured<{ boundaries: DecompositionBoundary[] }>(
    boundaryPrompt,
    {
      temperature: 0.4,
      maxTokens: 1024,
      zodSchema: DecompositionBoundariesSchema,
      schema: {
        name: "DecompositionBoundaries",
        description: "Proposed boundaries for text decomposition",
        properties: {
          boundaries: {
            type: "array",
            maxItems: 3,
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
- sourceIdx: index of the new unit (0, 1, or 2)
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
              sourceIdx: { type: "number", minimum: 0, maximum: 2 },
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
