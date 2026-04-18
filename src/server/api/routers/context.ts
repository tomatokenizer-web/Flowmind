import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createContextService } from "@/server/services/contextService";
import { createThoughtRankService } from "@/server/services/thoughtRankService";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// ─── Zod Schemas ───────────────────────────────────────────────────

const contextIdSchema = z.object({
  id: z.string().uuid(),
});

const createContextSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

const updateContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const listContextsSchema = z.object({
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullish(),
});

const unitContextSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
});

const splitContextSchema = z.object({
  contextId: z.string().uuid(),
  subContextA: z.object({
    name: z.string().min(1).max(100),
    unitIds: z.array(z.string().uuid()),
  }),
  subContextB: z.object({
    name: z.string().min(1).max(100),
    unitIds: z.array(z.string().uuid()),
  }),
  projectId: z.string().uuid(),
});

const mergeContextSchema = z.object({
  contextIdA: z.string().uuid(),
  contextIdB: z.string().uuid(),
  mergedName: z.string().min(1).max(200),
  conflictResolutions: z.array(z.object({
    unitId: z.string().uuid(),
    keepFrom: z.enum(["A", "B"]),
  })).optional(),
});

const mergeConflictsSchema = z.object({
  contextIdA: z.string().uuid(),
  contextIdB: z.string().uuid(),
});

const reorderContextsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
});

const moveContextSchema = z.object({
  id: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  projectId: z.string().uuid(),
});

// ─── IDOR Helpers ─────────────────────────────────────────────────

/** Verify a context belongs to the authenticated user (via project.userId).
 *  Returns the full context with relations so callers can use the data directly
 *  without a second round-trip to the database. */
async function verifyContextOwnership(db: PrismaClient, contextId: string, userId: string) {
  const ctx = await db.context.findFirst({
    where: { id: contextId, project: { userId } },
    include: {
      children: true,
      parent: true,
      _count: { select: { unitContexts: true, perspectives: true } },
    },
  });
  if (!ctx) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
  }
  return ctx;
}

/** Verify a project belongs to the authenticated user. */
async function verifyProjectOwnership(db: PrismaClient, projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return project;
}

/** Verify a unit belongs to the authenticated user. */
async function verifyUnitOwnership(db: PrismaClient, unitId: string, userId: string) {
  const unit = await db.unit.findFirst({
    where: { id: unitId, userId },
    select: { id: true },
  });
  if (!unit) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
  }
  return unit;
}

// ─── Router ────────────────────────────────────────────────────────

export const contextRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
      if (input.parentId) {
        await verifyContextOwnership(ctx.db, input.parentId, ctx.session.user.id!);
      }
      const service = createContextService(ctx.db);
      return service.createContext(input);
    }),

  getById: protectedProcedure
    .input(contextIdSchema)
    .query(async ({ ctx, input }) => {
      // Single query: ownership check + full data fetch in one round-trip
      return verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
    }),

  list: protectedProcedure
    .input(listContextsSchema)
    .query(async ({ ctx, input }) => {
      if (!input.projectId) return [];
      // Single query: ownership enforced via userId filter inside listContexts
      const service = createContextService(ctx.db);
      return service.listContexts(input.projectId, input.parentId, ctx.session.user.id!);
    }),

  update: protectedProcedure
    .input(updateContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      const { id, ...data } = input;
      return service.updateContext(id, data);
    }),

  delete: protectedProcedure
    .input(contextIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.deleteContext(input.id);
    }),

  addUnit: protectedProcedure
    .input(unitContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.addUnit(input.unitId, input.contextId);
    }),

  addUnits: protectedProcedure
    .input(z.object({
      unitIds: z.array(z.string().uuid()).min(1).max(50),
      contextId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      const ownedUnits = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds }, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      const ownedIds = new Set(ownedUnits.map(u => u.id));
      const unauthorized = input.unitIds.filter(id => !ownedIds.has(id));
      if (unauthorized.length > 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Units not found: ${unauthorized.join(", ")}` });
      }
      const service = createContextService(ctx.db);
      const results = await Promise.all(
        input.unitIds.map((uid) => service.addUnit(uid, input.contextId)),
      );
      return { added: results.length };
    }),

  removeUnit: protectedProcedure
    .input(unitContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.removeUnit(input.unitId, input.contextId);
    }),

  getUnitsForContext: protectedProcedure
    .input(z.object({ id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (!input.id) return [];
      await verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.getUnitsForContext(input.id);
    }),

  getMergeConflicts: protectedProcedure
    .input(mergeConflictsSchema)
    .query(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextIdA, ctx.session.user.id!);
      await verifyContextOwnership(ctx.db, input.contextIdB, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.getMergeConflicts(input.contextIdA, input.contextIdB);
    }),

  split: protectedProcedure
    .input(splitContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.splitContext(input);
    }),

  merge: protectedProcedure
    .input(mergeContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextIdA, ctx.session.user.id!);
      await verifyContextOwnership(ctx.db, input.contextIdB, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      return service.mergeContexts(input);
    }),

  reorder: protectedProcedure
    .input(reorderContextsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
      const service = createContextService(ctx.db);
      await service.reorderContexts(input.orderedIds, input.projectId, input.parentId);
      return { success: true };
    }),

  move: protectedProcedure
    .input(moveContextSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
      if (input.newParentId) {
        await verifyContextOwnership(ctx.db, input.newParentId, ctx.session.user.id!);
      }
      const service = createContextService(ctx.db);
      return service.moveContext(input.id, input.newParentId, input.projectId);
    }),

  recomputeThoughtRank: protectedProcedure
    .input(contextIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.id, ctx.session.user.id!);
      const service = createThoughtRankService(ctx.db);
      await service.updateThoughtRankForContext(input.id);
      return { success: true };
    }),

  // ─── Story 6.6: Context stats ──────────────────────────────────
  getContextStats: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { contextId } = input;

      await verifyContextOwnership(ctx.db, contextId, ctx.session.user.id!);

      // Fetch all unit-context records with unit details
      const unitContexts = await ctx.db.unitContext.findMany({
        where: { contextId },
        include: {
          unit: {
            select: {
              id: true,
              unitType: true,
              createdAt: true,
            },
          },
        },
      });

      const unitIds = unitContexts.map((uc) => uc.unit.id);

      // Count relations that connect units within this context
      const relationCount = await ctx.db.relation.count({
        where: {
          sourceUnitId: { in: unitIds },
          targetUnitId: { in: unitIds },
        },
      });

      const unitCount = unitContexts.length;
      const claimCount = unitContexts.filter((uc) => uc.unit.unitType === "claim").length;
      const evidenceCount = unitContexts.filter((uc) => uc.unit.unitType === "evidence").length;
      const questionCount = unitContexts.filter((uc) => uc.unit.unitType === "question").length;
      const avgRelationsPerUnit = unitCount > 0 ? Math.round((relationCount * 2 / unitCount) * 10) / 10 : 0;

      // Recent activity: count of units created per day over last 7 days
      const recentActivity: Array<{ date: string; unitCount: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const count = unitContexts.filter((uc) => {
          const d = uc.unit.createdAt;
          return d >= dayStart && d <= dayEnd;
        }).length;

        recentActivity.push({
          date: dayStart.toISOString().slice(0, 10),
          unitCount: count,
        });
      }

      // Top contributing unit types by count
      const typeCounts: Record<string, number> = {};
      for (const uc of unitContexts) {
        typeCounts[uc.unit.unitType] = (typeCounts[uc.unit.unitType] ?? 0) + 1;
      }
      const topContributingTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({
          type,
          count,
          pct: unitCount > 0 ? Math.round((count / unitCount) * 100) : 0,
        }));

      return {
        unitCount,
        claimCount,
        evidenceCount,
        questionCount,
        relationCount,
        avgRelationsPerUnit,
        recentActivity,
        topContributingTypes,
      };
    }),
});
