import type { AIProvider } from "./provider";
import type { SafetyGuard } from "./safetyGuard";
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

// ─── Decomposition Functions ─────────────────────────────────────────────────

/**
 * Decompose text into multiple thought units with relations (3-step AI process)
 *
 * Step 1: Classify user purpose
 * Step 2: Propose decomposition boundaries (max 3 units per safety guard)
 * Step 3: Propose relations between new units AND existing units
 */
export async function decomposeText(
  provider: AIProvider,
  safetyGuard: SafetyGuard,
  text: string,
  contextId: string,
  existingUnits: Array<{ id: string; content: string; unitType: string }>,
  ctx: AIServiceContext
): Promise<DecompositionResult> {
  // Short text: return single unit, no decomposition needed
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

  // ─── Step 1: Classify user purpose ─────────────────────────────────
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

  const purposeResult = await provider.generateStructured<{ purpose: UserPurpose; confidence: number }>(
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

  // ─── Step 2: Propose decomposition boundaries ──────────────────────
  const boundaryPrompt = `${PROMPT_INJECTION_GUARD}

Split the following text into distinct thought units. Each unit should be a complete, self-contained thought.

Text: ${sanitizeUserContent(text)}

Guidelines:
- Maximum 3 units (focus on the most important divisions)
- Each unit should have a clear cognitive function (claim, question, evidence, etc.)
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

  // Create proposals from boundaries
  const proposals: UnitProposal[] = boundaryResult.boundaries.map((b, idx) => ({
    id: `temp-${Date.now()}-${idx}`,
    content: b.content,
    proposedType: b.proposedType,
    confidence: b.confidence,
    startChar: b.startChar,
    endChar: b.endChar,
    lifecycle: "draft" as const,
    originType: "ai_generated" as const,
  }));

  // ─── Step 3: Propose relations ─────────────────────────────────────
  let relationProposals: DecompositionRelationProposal[] = [];

  if (existingUnits.length > 0 && proposals.length > 0) {
    const existingUnitsDesc = existingUnits
      .slice(0, 10)
      .map((u, i) => `[${u.id}] (${u.unitType}) ${sanitizeUserContent(u.content.slice(0, 100))}`)
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

    relationProposals = relationResult.relations;
  }

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
    proposals,
    relationProposals,
  };
}

