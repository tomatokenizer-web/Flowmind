import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createRelationService } from "@/server/services/relationService";
import { updateLoopbacksForContext } from "@/server/services/cycleDetectionService";
import { createUnitMergeService } from "@/server/services/unitMergeService";
import { createUnitSplitService } from "@/server/services/unitSplitService";
import { createThoughtRankService } from "@/server/services/thoughtRankService";

// ─── Zod Schemas ────────────────────────────────────────────────────

const directionEnum = z.enum(["one_way", "bidirectional"]);

// v3.14 D-05: 2-tier relation enums
const relationLayerEnum = z.enum([
  "structural", "evidential", "dialogical", "generative",
  "temporal", "compositional", "analytical", "meta",
]);

const nsDirectionEnum = z.enum(["nucleus_to_satellite", "satellite_to_nucleus", "multinuclear"]);

const relationCreatedByEnum = z.enum(["user_created", "ai_suggested_confirmed", "ai_auto"]);

const createRelationSchema = z.object({
  sourceUnitId: z.string().uuid(),
  targetUnitId: z.string().uuid(),
  perspectiveId: z.string().uuid().optional(),
  type: z.string(),
  strength: z.number().min(0).max(1).default(0.5),
  direction: directionEnum.default("one_way"),
  purpose: z.array(z.string()).default([]),
  // v3.14 D-05 fields
  layer: relationLayerEnum.optional(),
  subtype: z.string().optional(),
  fromType: z.string().max(50).optional(),
  nsDirection: nsDirectionEnum.optional(),
  relationCreatedBy: relationCreatedByEnum.optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

const updateRelationSchema = z.object({
  id: z.string().uuid(),
  strength: z.number().min(0).max(1).optional(),
  type: z.string().optional(),
  direction: directionEnum.optional(),
  purpose: z.array(z.string()).optional(),
  // v3.14 D-05 fields
  layer: relationLayerEnum.optional(),
  subtype: z.string().optional(),
  fromType: z.string().max(50).optional(),
  nsDirection: nsDirectionEnum.optional(),
  relationCreatedBy: relationCreatedByEnum.optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

const listByUnitSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  layer: relationLayerEnum.optional(),
});

const listByUnitsSchema = z.object({
  unitIds: z.array(z.string().uuid()).max(100),
  contextId: z.string().uuid().optional(),
});

const listBetweenSchema = z.object({
  sourceUnitId: z.string().uuid(),
  targetUnitId: z.string().uuid(),
});

const neighborsByDepthSchema = z.object({
  hubId: z.string().uuid(),
  depth: z.number().int().min(1).max(3).default(1),
  contextId: z.string().uuid().optional(),
});

// ─── Router ─────────────────────────────────────────────────────────

export const relationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createRelationSchema)
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify both units belong to the authenticated user
      const [sourceUnit, targetUnit] = await Promise.all([
        ctx.db.unit.findFirst({ where: { id: input.sourceUnitId, userId: ctx.session.user.id! }, select: { lifecycle: true } }),
        ctx.db.unit.findFirst({ where: { id: input.targetUnitId, userId: ctx.session.user.id! }, select: { lifecycle: true } }),
      ]);

      if (!sourceUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      }
      if (!targetUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });
      }
      const service = createRelationService(ctx.db);
      const relation = await service.create(input as Parameters<typeof service.create>[0], ctx.session.user.id!);

      // Run cycle detection if relation belongs to a context (via perspective)
      if (input.perspectiveId) {
        const perspective = await ctx.db.unitPerspective.findUnique({
          where: { id: input.perspectiveId },
          select: { contextId: true },
        });
        if (perspective) {
          void updateLoopbacksForContext(ctx.db, perspective.contextId).catch(() => {
            // Non-fatal — cycle detection runs best-effort
          });

          // Recompute ThoughtRank for the context (non-blocking)
          const thoughtRankService = createThoughtRankService(ctx.db);
          void thoughtRankService.updateThoughtRankForContext(perspective.contextId).catch(() => {
            // Non-fatal — ThoughtRank update runs best-effort
          });
        }
      }

      return relation;
    }),

  update: protectedProcedure
    .input(updateRelationSchema)
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify the relation's source unit belongs to the authenticated user
      const relation = await ctx.db.relation.findFirst({
        where: { id: input.id, sourceUnit: { userId: ctx.session.user.id! } },
        select: { id: true, perspectiveId: true },
      });
      if (!relation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Relation not found" });
      }
      const { id, ...data } = input;
      const service = createRelationService(ctx.db);
      const result = await service.update(id, data as Parameters<typeof service.update>[1], ctx.session.user.id!);

      // Recompute ThoughtRank if relation belongs to a perspective (non-blocking)
      if (relation.perspectiveId) {
        const perspective = await ctx.db.unitPerspective.findUnique({
          where: { id: relation.perspectiveId },
          select: { contextId: true },
        });
        if (perspective) {
          const thoughtRankService = createThoughtRankService(ctx.db);
          void thoughtRankService.updateThoughtRankForContext(perspective.contextId).catch(() => {
            // Non-fatal — ThoughtRank update runs best-effort
          });
        }
      }

      return result;
    }),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify the relation's source unit belongs to the authenticated user
      const relation = await ctx.db.relation.findFirst({
        where: { id: input.id, sourceUnit: { userId: ctx.session.user.id! } },
        select: { id: true, perspectiveId: true },
      });
      if (!relation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Relation not found" });
      }
      const service = createRelationService(ctx.db);
      const result = await service.delete(input.id, ctx.session.user.id!);

      // Recompute ThoughtRank if relation belonged to a perspective (non-blocking)
      if (relation.perspectiveId) {
        const perspective = await ctx.db.unitPerspective.findUnique({
          where: { id: relation.perspectiveId },
          select: { contextId: true },
        });
        if (perspective) {
          const thoughtRankService = createThoughtRankService(ctx.db);
          void thoughtRankService.updateThoughtRankForContext(perspective.contextId).catch(() => {
            // Non-fatal — ThoughtRank update runs best-effort
          });
        }
      }

      return result;
    }),

  listByUnit: protectedProcedure
    .input(listByUnitSchema)
    .query(async ({ ctx, input }) => {
      // IDOR fix: verify the unit belongs to the authenticated user
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createRelationService(ctx.db);
      return service.listByUnit(input.unitId, input.contextId, input.layer);
    }),

  listByUnits: protectedProcedure
    .input(listByUnitsSchema)
    .query(async ({ ctx, input }) => {
      if (input.unitIds.length === 0) return [];
      // IDOR fix: verify all requested units belong to the authenticated user
      const ownedUnits = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds }, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (ownedUnits.length !== input.unitIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or more units not found" });
      }
      const idSet = new Set(input.unitIds);
      const rows = await ctx.db.relation.findMany({
        where: {
          OR: [
            { sourceUnitId: { in: input.unitIds } },
            { targetUnitId: { in: input.unitIds } },
          ],
          ...(input.contextId
            ? { perspective: { contextId: input.contextId } }
            : {}),
        },
        include: {
          sourceUnit: { select: { id: true, content: true, unitType: true } },
          targetUnit: { select: { id: true, content: true, unitType: true } },
        },
        orderBy: { strength: "desc" },
      });
      // Only return relations where at least one endpoint is in the requested set
      return rows.filter(
        (r) => idSet.has(r.sourceUnitId) || idSet.has(r.targetUnitId),
      );
    }),

  neighborsByDepth: protectedProcedure
    .input(neighborsByDepthSchema)
    .query(async ({ ctx, input }) => {
      // IDOR fix: verify the hub unit belongs to the authenticated user
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.hubId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createRelationService(ctx.db);
      return service.neighborsByDepth(input.hubId, input.depth, input.contextId);
    }),

  listBetween: protectedProcedure
    .input(listBetweenSchema)
    .query(async ({ ctx, input }) => {
      // IDOR fix: verify both units belong to the authenticated user
      const [source, target] = await Promise.all([
        ctx.db.unit.findFirst({ where: { id: input.sourceUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
        ctx.db.unit.findFirst({ where: { id: input.targetUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
      ]);
      if (!source || !target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createRelationService(ctx.db);
      return service.listBetween(input.sourceUnitId, input.targetUnitId);
    }),

  // ─── Unit Merge ──────────────────────────────────────────────────

  mergePreview: protectedProcedure
    .input(z.object({ sourceUnitId: z.string().uuid(), targetUnitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // IDOR fix: verify both units belong to the authenticated user
      const [source, target] = await Promise.all([
        ctx.db.unit.findFirst({ where: { id: input.sourceUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
        ctx.db.unit.findFirst({ where: { id: input.targetUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
      ]);
      if (!source || !target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createUnitMergeService(ctx.db);
      return service.preview(input.sourceUnitId, input.targetUnitId);
    }),

  merge: protectedProcedure
    .input(z.object({
      sourceUnitId: z.string().uuid(),
      targetUnitId: z.string().uuid(),
      keepContent: z.enum(["source", "target"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify both units belong to the authenticated user
      const [source, target] = await Promise.all([
        ctx.db.unit.findFirst({ where: { id: input.sourceUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
        ctx.db.unit.findFirst({ where: { id: input.targetUnitId, userId: ctx.session.user.id! }, select: { id: true } }),
      ]);
      if (!source || !target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createUnitMergeService(ctx.db);
      return service.merge({ ...input, userId: ctx.session.user.id! });
    }),

  // ─── Unit Split (DEC-2026-002 §14) ───────────────────────────────

  splitPreview: protectedProcedure
    .input(z.object({
      sourceUnitId: z.string().uuid(),
      splitAtOffset: z.number().int().min(1),
    }))
    .query(async ({ ctx, input }) => {
      // Ownership check per security review follow-up.
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.sourceUnitId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createUnitSplitService(ctx.db);
      return service.preview(input.sourceUnitId, input.splitAtOffset);
    }),

  split: protectedProcedure
    .input(z.object({
      sourceUnitId: z.string().uuid(),
      splitAtOffset: z.number().int().min(1),
      relationPolicy: z.enum(["first", "second", "both", "none"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.sourceUnitId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createUnitSplitService(ctx.db);
      return service.split({ ...input, userId: ctx.session.user.id! });
    }),
});
