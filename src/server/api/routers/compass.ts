import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createCompassService } from "@/server/services/compassService";
import { createSalienceService } from "@/server/services/salienceService";

async function verifyProject(db: Parameters<typeof createCompassService>[0], projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

export const compassRouter = createTRPCRouter({
  calculate: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      contextId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createCompassService(ctx.db);
      return svc.calculateCompass(input.projectId, input.contextId);
    }),

  dimensions: protectedProcedure
    .query(() => [
      { name: "evidence_coverage", label: "Evidence Coverage", description: "Percentage of claims backed by supporting evidence" },
      { name: "counter_argument_coverage", label: "Counter-Argument Coverage", description: "Percentage of claims with opposing views or rebuttals" },
      { name: "definition_coverage", label: "Definition Coverage", description: "Percentage of key concepts with formal definitions" },
      { name: "assumption_surfacing", label: "Assumption Surfacing", description: "Percentage of claims with explicitly stated assumptions" },
      { name: "question_resolution", label: "Question Resolution", description: "Percentage of open questions that have been answered" },
      { name: "scope_balance", label: "Scope Balance", description: "Entropy-based measure of lifecycle stage diversity" },
    ]),

  salienceCompute: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });

      const svc = createSalienceService(ctx.db);
      return svc.computeSalience(input.unitId);
    }),

  salienceBatchRecompute: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createSalienceService(ctx.db);
      return svc.batchRecomputeSalience(input.projectId);
    }),

  salienceDecay: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      decayFactor: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createSalienceService(ctx.db);
      return svc.decaySalience(input.projectId, input.decayFactor);
    }),

  salienceCognitiveLoad: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createSalienceService(ctx.db);
      return svc.getCognitiveLoad(input.projectId);
    }),
});
