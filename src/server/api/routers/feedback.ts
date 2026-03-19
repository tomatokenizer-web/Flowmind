import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createCompressionService } from "@/server/services/compressionService";
import { createOrphanService } from "@/server/services/orphanService";
import { createDriftService } from "@/server/services/driftService";

export const feedbackRouter = createTRPCRouter({
  // ─── Compression (8.2) ───────────────────────────────────────────
  findSimilarClaims: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createCompressionService(ctx.db);
      return service.findSimilarClaims(input.contextId);
    }),

  compressClaims: protectedProcedure
    .input(z.object({
      unitIds: z.array(z.string().uuid()).min(2),
      coreContent: z.string().min(1),
      contextId: z.string().uuid(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = createCompressionService(ctx.db);
      return service.compressClaims(
        input.unitIds,
        input.coreContent,
        ctx.session.user.id!,
        input.projectId,
        input.contextId,
      );
    }),

  // ─── Orphan Recovery (8.3) ───────────────────────────────────────
  findOrphans: protectedProcedure.query(async ({ ctx }) => {
    const service = createOrphanService(ctx.db);
    return service.findOrphans(ctx.session.user.id!);
  }),

  recoverOrphan: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      action: z.enum(["context", "incubate", "archive", "delete"]),
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = createOrphanService(ctx.db);
      return service.recoverOrphan(input.unitId, input.action, input.contextId);
    }),

  // ─── Action Completion (8.6) ──────────────────────────────────────
  completeAction: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { id: true, unitType: true, lifecycle: true },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.unitType !== "action") throw new TRPCError({ code: "BAD_REQUEST", message: "Unit is not an action" });

      await ctx.db.unit.update({
        where: { id: input.unitId },
        data: { lifecycle: "complete" },
      });

      // Get related decision units
      const relations = await ctx.db.relation.findMany({
        where: {
          targetUnitId: input.unitId,
          type: { in: ["derives_from", "references", "supports"] },
        },
        include: { sourceUnit: { select: { id: true, content: true, unitType: true } } },
        take: 5,
      });

      return { unitId: input.unitId, relatedUnits: relations.map((r) => r.sourceUnit) };
    }),

  // ─── Drift Detection (8.7) ────────────────────────────────────────
  getDriftUnits: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), threshold: z.number().min(0).max(1).optional() }))
    .query(async ({ ctx, input }) => {
      const service = createDriftService(ctx.db);
      return service.getHighDriftUnits(input.projectId, input.threshold);
    }),

  resolveDrift: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      action: z.enum(["keep", "move", "branch"]),
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.action === "keep") {
        await ctx.db.unit.update({ where: { id: input.unitId }, data: { driftScore: 0 } });
      } else if (input.action === "move" && input.contextId) {
        await ctx.db.unitContext.upsert({
          where: { unitId_contextId: { unitId: input.unitId, contextId: input.contextId } },
          create: { unitId: input.unitId, contextId: input.contextId },
          update: {},
        });
      }
      return { unitId: input.unitId, action: input.action };
    }),

  // ─── Branch Project (8.8) ────────────────────────────────────────
  branchProject: protectedProcedure
    .input(z.object({
      sourceProjectId: z.string().uuid(),
      unitIds: z.array(z.string().uuid()).min(1),
      name: z.string().min(1).max(200),
      purpose: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Create new project
      const newProject = await ctx.db.project.create({
        data: {
          name: input.name,
          userId,
          branchedFrom: input.sourceProjectId,
          branchReason: input.purpose ?? "Branched from drift detection",
          constraintLevel: "guided",
        },
      });

      // Create initial context
      const newContext = await ctx.db.context.create({
        data: {
          name: "Main",
          projectId: newProject.id,
        },
      });

      // Add units to new context
      for (const unitId of input.unitIds) {
        await ctx.db.unitContext.upsert({
          where: { unitId_contextId: { unitId, contextId: newContext.id } },
          create: { unitId, contextId: newContext.id },
          update: {},
        });
        // Reset drift score
        await ctx.db.unit.update({ where: { id: unitId }, data: { driftScore: 0 } });
      }

      return { newProject, newContext };
    }),

  // ─── Reverse Provenance (8.5) ────────────────────────────────────
  getReverseProvenance: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find units that reference this unit as their source
      const derivedUnits = await ctx.db.unit.findMany({
        where: {
          sourceSpan: { not: undefined },
          userId: ctx.session.user.id!,
        },
        select: { id: true, content: true, unitType: true, sourceSpan: true },
        take: 50,
      });

      // Find assemblies containing derived units
      const derivedUnitIds = derivedUnits.map((u) => u.id);
      const assemblies = derivedUnitIds.length > 0
        ? await ctx.db.assembly.findMany({
            where: { items: { some: { unitId: { in: derivedUnitIds } } } },
            select: { id: true, name: true },
          })
        : [];

      return { derivedUnits, assemblies };
    }),
});
