import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAIService } from "@/server/ai";
import type { DecompositionResult } from "@/server/ai";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const suggestTypeSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

const suggestRelationsSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

const contributionRatioSchema = z.object({
  contextId: z.string().uuid(),
});

const decomposeTextSchema = z.object({
  text: z.string().min(1).max(10000),
  contextId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const aiRouter = createTRPCRouter({
  suggestType: protectedProcedure
    .input(suggestTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);

      // Generate a session ID from user ID + timestamp (simplified)
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const suggestion = await aiService.suggestUnitType(input.content, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });

      return {
        suggestion,
        aiTrustLevel: "inferred" as const,
      };
    }),

  suggestRelations: protectedProcedure
    .input(suggestRelationsSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      // Get existing units in the context
      const existingUnits = await ctx.db.unit.findMany({
        where: {
          perspectives: {
            some: { contextId: input.contextId },
          },
          lifecycle: { not: "draft" },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const suggestions = await aiService.suggestRelations(
        input.content,
        existingUnits,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );

      return {
        suggestions,
        aiTrustLevel: "inferred" as const,
      };
    }),

  getContributionRatio: protectedProcedure
    .input(contributionRatioSchema)
    .query(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      return aiService.getContributionRatio(input.contextId);
    }),

  /**
   * Decompose text into multiple units with proposed relations.
   * Returns proposals for user review - NOT saved to DB yet.
   */
  decomposeText: protectedProcedure
    .input(decomposeTextSchema)
    .mutation(async ({ ctx, input }): Promise<DecompositionResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      // Get existing units in the context for relation suggestions
      const existingUnits = await ctx.db.unit.findMany({
        where: {
          perspectives: {
            some: { contextId: input.contextId },
          },
          lifecycle: { not: "draft" },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const result = await aiService.decomposeText(
        input.text,
        input.contextId,
        existingUnits,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );

      return result;
    }),
});
