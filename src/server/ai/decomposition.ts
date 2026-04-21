import type { AIProvider } from "./provider";
import type { SafetyGuard } from "./safetyGuard";
import { z } from "zod";
import { logger } from "../logger";
import {
  DecompositionRelationProposalsSchema,
} from "./schemas";
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
      isStructuredDiscourse: false,
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
  const refinePrompt = `You are a thought management tool processing raw user input.

Refine: Clarify what the user intends to express. Fix grammar, untangle convoluted sentences, sharpen vague phrasing. Preserve all content — same details, same length. Refinement improves expression, not reduces it.

Classify: Pick the single cognitive type that best fits this text.
Types: question, claim, evidence, counterargument, observation, idea, definition, assumption, action

Decompose: Should this text be split into multiple units? Say yes when the text contains multiple independent ideas that each function as a different cognitive type. Longer text with distinct topics or arguments should generally be decomposed. Say no when the text is one coherent thought.

"""
${text}
"""`;

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

  // Map unitType to purpose for the result
  const purposeFromType: Record<string, UserPurpose> = {
    claim: "arguing", counterargument: "arguing",
    idea: "brainstorming",
    evidence: "researching", observation: "researching", question: "researching",
    definition: "defining", assumption: "defining",
    action: "other",
  };
  const purpose = purposeFromType[judgment.unitType] ?? "other";

  // ─── No decomposition needed: return refined text as single unit ───
  if (!judgment.shouldDecompose) {
    const tempId = `temp-${Date.now()}-0`;
    return {
      purpose,
      proposals: [
        {
          id: tempId,
          content: refinedText,
          proposedType: judgment.unitType,
          confidence: 0.8,
          startChar: 0,
          endChar: refinedText.length,
          lifecycle: "draft",
          originType: "ai_generated",
        },
      ],
      relationProposals: existingUnits.length > 0
        ? await proposeRelations(provider, [{ content: refinedText, proposedType: judgment.unitType }], existingUnits)
        : [],
      isStructuredDiscourse: false,
    };
  }

  // ─── Decomposition warranted: split into boundaries ────────
  const proposals = await proposeBoundaries(provider, refinedText);

  const relationProposals = existingUnits.length > 0
    ? await proposeRelations(provider, proposals, existingUnits)
    : [];

  logger.info(
    { purpose, proposalCount: proposals.length, relationCount: relationProposals.length },
    "AI decomposition completed"
  );

  const isStructuredDiscourse = proposals.length >= 3;

  return {
    purpose,
    proposals: proposals.map((p, idx) => ({
      ...p,
      id: `temp-${Date.now()}-${idx}`,
      lifecycle: "draft" as const,
      originType: "ai_generated" as const,
      orderInSource: idx,
      discourseRole: (p as { discourseRole?: string }).discourseRole,
    })),
    relationProposals,
    isStructuredDiscourse,
    originalText: isStructuredDiscourse ? refinedText : undefined,
  };
}

// ─── Helper: Propose Boundaries ───────────────────────────────────────────

async function proposeBoundaries(
  provider: AIProvider,
  text: string,
): Promise<Array<{ content: string; proposedType: string; confidence: number; startChar: number; endChar: number; discourseRole?: string }>> {
  const boundaryPrompt = `Split this text into self-contained thought units. Each unit should hold one coherent idea that can stand on its own.

For each unit, provide:
- content: the exact text of that unit (do not summarize)
- proposedType: claim, question, evidence, counterargument, observation, idea, definition, assumption, action
- confidence: 0-1
- discourseRole: the role this unit plays in the overall text

"""
${text}
"""`;

  const DirectSplitSchema = z.object({
    units: z.array(
      z.object({
        content: z.string(),
        proposedType: z.enum([
          "claim", "question", "evidence", "counterargument",
          "observation", "idea", "definition", "assumption", "action",
        ]),
        confidence: z.number().min(0).max(1),
        discourseRole: z.string().optional(),
      })
    ),
  });

  const result = await provider.generateStructured<z.infer<typeof DirectSplitSchema>>(
    boundaryPrompt,
    {
      temperature: 0.4,
      maxTokens: 16384,
      zodSchema: DirectSplitSchema,
      schema: {
        name: "DirectSplit",
        description: "Text split into self-contained thought units",
        properties: {
          units: {
            type: "array",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                proposedType: {
                  type: "string",
                  enum: [
                    "claim", "question", "evidence", "counterargument",
                    "observation", "idea", "definition", "assumption", "action",
                  ],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                discourseRole: { type: "string" },
              },
              required: ["content", "proposedType", "confidence"],
            },
          },
        },
        required: ["units"],
      },
    }
  );

  let cursor = 0;
  return result.units.map((u) => {
    const idx = text.indexOf(u.content.slice(0, 40), cursor);
    const startChar = idx >= 0 ? idx : cursor;
    const endChar = idx >= 0 ? idx + u.content.length : startChar + u.content.length;
    cursor = endChar;
    return {
      content: u.content,
      proposedType: u.proposedType,
      confidence: u.confidence,
      startChar,
      endChar,
      discourseRole: u.discourseRole,
    };
  });
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
    .map((u) => `[${u.id}] (${u.unitType}) ${u.content.slice(0, 100)}`)
    .join("\n");

  const newUnitsDesc = proposals
    .map((p, i) => `[idx:${i}] (${p.proposedType}) ${p.content.slice(0, 100)}`)
    .join("\n");

  const relationPrompt = `Analyze relationships between NEW units and EXISTING units in this context.

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
