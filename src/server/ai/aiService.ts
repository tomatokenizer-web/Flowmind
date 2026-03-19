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
     * Access to safety guard for direct checks
     */
    safetyGuard,
  };
}

export type AIService = ReturnType<typeof createAIService>;
