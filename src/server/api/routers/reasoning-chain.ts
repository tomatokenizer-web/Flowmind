import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// ─── Step schema ────────────────────────────────────────────────────────────

const stepSchema = z.object({
  unitId: z.string().uuid(),
  role: z.enum(["premise", "inference", "conclusion"]),
  order: z.number().int().min(0),
});

type ChainStep = z.infer<typeof stepSchema>;

// ─── Router ────────────────────────────────────────────────────────────────

export const reasoningChainRouter = createTRPCRouter({
  /**
   * Create a new reasoning chain for a context
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        goal: z.string().max(1000).optional(),
        contextId: z.string().uuid(),
        steps: z.array(stepSchema).max(50).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify context exists and belongs to a project the user owns
      const context = await ctx.db.context.findUnique({
        where: { id: input.contextId },
        include: { project: { select: { userId: true } } },
      });

      if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      if (context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.reasoningChain.create({
        data: {
          name: input.name,
          goal: input.goal,
          contextId: input.contextId,
          steps: input.steps,
        },
      });
    }),

  /**
   * Get a reasoning chain by ID, enriched with unit content for each step
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const chain = await ctx.db.reasoningChain.findUnique({
        where: { id: input.id },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
        },
      });

      if (!chain) throw new TRPCError({ code: "NOT_FOUND", message: "Reasoning chain not found" });
      if (chain.context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Enrich steps with unit data
      const steps = (chain.steps as ChainStep[]).sort((a, b) => a.order - b.order);
      const unitIds = steps.map((s) => s.unitId);

      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true, lifecycle: true },
      });

      const unitMap = new Map(units.map((u) => [u.id, u]));

      const enrichedSteps = steps.map((step) => ({
        ...step,
        unit: unitMap.get(step.unitId) ?? null,
      }));

      return {
        id: chain.id,
        name: chain.name,
        goal: chain.goal,
        contextId: chain.contextId,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt,
        steps: enrichedSteps,
      };
    }),

  /**
   * List reasoning chains for a context
   */
  list: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const context = await ctx.db.context.findUnique({
        where: { id: input.contextId },
        include: { project: { select: { userId: true } } },
      });

      if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      if (context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.reasoningChain.findMany({
        where: { contextId: input.contextId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          goal: true,
          contextId: true,
          steps: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  /**
   * Add a step to an existing reasoning chain
   */
  addStep: protectedProcedure
    .input(
      z.object({
        chainId: z.string().uuid(),
        step: stepSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const chain = await ctx.db.reasoningChain.findUnique({
        where: { id: input.chainId },
        include: { context: { include: { project: { select: { userId: true } } } } },
      });

      if (!chain) throw new TRPCError({ code: "NOT_FOUND", message: "Reasoning chain not found" });
      if (chain.context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const currentSteps = chain.steps as ChainStep[];
      const updatedSteps = [...currentSteps, input.step];

      return ctx.db.reasoningChain.update({
        where: { id: input.chainId },
        data: { steps: updatedSteps },
      });
    }),

  /**
   * Remove a step from a reasoning chain by unitId
   */
  removeStep: protectedProcedure
    .input(
      z.object({
        chainId: z.string().uuid(),
        unitId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const chain = await ctx.db.reasoningChain.findUnique({
        where: { id: input.chainId },
        include: { context: { include: { project: { select: { userId: true } } } } },
      });

      if (!chain) throw new TRPCError({ code: "NOT_FOUND", message: "Reasoning chain not found" });
      if (chain.context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const currentSteps = chain.steps as ChainStep[];
      const updatedSteps = currentSteps.filter((s) => s.unitId !== input.unitId);

      return ctx.db.reasoningChain.update({
        where: { id: input.chainId },
        data: { steps: updatedSteps },
      });
    }),

  /**
   * Reorder steps — accepts an array of unitIds in the desired order
   */
  reorderSteps: protectedProcedure
    .input(
      z.object({
        chainId: z.string().uuid(),
        orderedUnitIds: z.array(z.string().uuid()).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const chain = await ctx.db.reasoningChain.findUnique({
        where: { id: input.chainId },
        include: { context: { include: { project: { select: { userId: true } } } } },
      });

      if (!chain) throw new TRPCError({ code: "NOT_FOUND", message: "Reasoning chain not found" });
      if (chain.context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const currentSteps = chain.steps as ChainStep[];
      const stepMap = new Map(currentSteps.map((s) => [s.unitId, s]));

      const reordered: ChainStep[] = input.orderedUnitIds
        .filter((id) => stepMap.has(id))
        .map((id, index) => ({ ...stepMap.get(id)!, order: index }));

      return ctx.db.reasoningChain.update({
        where: { id: input.chainId },
        data: { steps: reordered },
      });
    }),

  /**
   * Delete a reasoning chain
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const chain = await ctx.db.reasoningChain.findUnique({
        where: { id: input.id },
        include: { context: { include: { project: { select: { userId: true } } } } },
      });

      if (!chain) throw new TRPCError({ code: "NOT_FOUND", message: "Reasoning chain not found" });
      if (chain.context.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.reasoningChain.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
