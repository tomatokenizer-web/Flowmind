import type { PrismaClient } from "@prisma/client";
import { getAIProvider, type AIProvider } from "./provider";
import { createSafetyGuard, type SafetyGuard } from "./safetyGuard";
import { logger } from "../logger";

// ─── Types ────────────────────────────────────────────────────────────────

export interface TypeSuggestion {
  unitType: string;
  confidence: number;
  reasoning: string;
}

export interface RelationSuggestion {
  targetUnitId: string;
  relationType: string;
  strength: number;
  reasoning: string;
}

export interface AIServiceContext {
  userId: string;
  sessionId: string;
  contextId?: string;
}

// ─── Decomposition Types ─────────────────────────────────────────────────────

export type UserPurpose = "arguing" | "brainstorming" | "researching" | "defining" | "other";

export interface DecompositionBoundary {
  startChar: number;
  endChar: number;
  content: string;
  proposedType: string;
  confidence: number;
}

export interface DecompositionRelationProposal {
  /** Index of source unit in proposals array (0-based) */
  sourceIdx: number;
  /** ID of existing unit to link to */
  targetUnitId: string;
  relationType: string;
  strength: number;
  rationale: string;
}

export interface UnitProposal {
  id: string; // temporary client-side ID
  content: string;
  proposedType: string;
  confidence: number;
  startChar: number;
  endChar: number;
  lifecycle: "draft";
  originType: "ai_generated";
}

export interface DecompositionResult {
  purpose: UserPurpose;
  proposals: UnitProposal[];
  relationProposals: DecompositionRelationProposal[];
}

// ─── AI Service ───────────────────────────────────────────────────────────

export function createAIService(db: PrismaClient) {
  const provider: AIProvider = getAIProvider();
  const safetyGuard: SafetyGuard = createSafetyGuard(db);

  return {
    /**
     * Suggest a unit type based on content analysis
     */
    async suggestUnitType(
      content: string,
      ctx: AIServiceContext
    ): Promise<TypeSuggestion> {
      // Safety check
      const check = await safetyGuard.runAllChecks({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        requestUnitCount: 0, // No units being created
        contextId: ctx.contextId,
      });

      if (!check.allowed && check.error) {
        throw new Error(check.error.message);
      }

      const prompt = `Analyze the following text and determine its primary cognitive function.

Text: "${content.slice(0, 500)}"

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
    },

    /**
     * Suggest relations between a new unit and existing units in context
     */
    async suggestRelations(
      newUnitContent: string,
      existingUnits: Array<{ id: string; content: string; unitType: string }>,
      ctx: AIServiceContext
    ): Promise<RelationSuggestion[]> {
      if (existingUnits.length === 0) {
        return [];
      }

      // Safety check
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
            `[${i}] (${u.unitType}) "${u.content.slice(0, 100)}..." (id: ${u.id})`
        )
        .join("\n");

      const prompt = `Analyze the relationship between a new thought unit and existing units.

New unit: "${newUnitContent.slice(0, 300)}"

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
    },

    /**
     * Get the AI contribution ratio for a context
     */
    async getContributionRatio(contextId: string): Promise<{
      total: number;
      userWritten: number;
      aiGenerated: number;
      aiRefined: number;
      ratio: number;
    }> {
      const units = await db.unitContext.findMany({
        where: { contextId },
        include: { unit: { select: { originType: true, lifecycle: true } } },
      });

      const total = units.length;
      const userWritten = units.filter(
        (u) => u.unit.originType === "direct_write"
      ).length;
      const aiGenerated = units.filter(
        (u) => u.unit.originType === "ai_generated"
      ).length;
      const aiRefined = units.filter(
        (u) => u.unit.originType === "ai_refined"
      ).length;

      return {
        total,
        userWritten,
        aiGenerated,
        aiRefined,
        ratio: total > 0 ? (aiGenerated + aiRefined) / total : 0,
      };
    },

    /**
     * Reset branch count after user creates manual content
     */
    resetBranchCount(userId: string, sessionId: string): void {
      safetyGuard.resetBranchCount(userId, sessionId);
    },

    /**
     * Decompose text into multiple thought units with relations (3-step AI process)
     *
     * Step 1: Classify user purpose
     * Step 2: Propose decomposition boundaries (max 3 units per safety guard)
     * Step 3: Propose relations between new units AND existing units
     */
    async decomposeText(
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
        requestUnitCount: 3, // Max units we'll create
        contextId: ctx.contextId,
      });

      if (!check.allowed && check.error) {
        throw new Error(check.error.message);
      }

      // ─── Step 1: Classify user purpose ─────────────────────────────────
      const purposePrompt = `Analyze the following text and determine the user's primary cognitive purpose.

Text: "${text.slice(0, 1000)}"

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
      const boundaryPrompt = `Split the following text into distinct thought units. Each unit should be a complete, self-contained thought.

Text: "${text}"

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
          .map((u, i) => `[${u.id}] (${u.unitType}) "${u.content.slice(0, 100)}..."`)
          .join("\n");

        const newUnitsDesc = proposals
          .map((p, i) => `[idx:${i}] (${p.proposedType}) "${p.content.slice(0, 100)}..."`)
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
    },

    /**
     * Access to safety guard for direct checks
     */
    safetyGuard,
  };
}

export type AIService = ReturnType<typeof createAIService>;
