import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────

const unitTypeEnum = z.enum([
  "claim", "question", "evidence", "counterargument",
  "observation", "idea", "definition", "assumption", "action",
]);

const originTypeEnum = z.enum([
  "direct_write", "external_excerpt", "external_inspiration",
  "external_summary", "ai_generated", "ai_refined",
]);

const lifecycleEnum = z.enum([
  "draft", "pending", "confirmed", "deferred",
  "complete", "archived", "discarded",
]);

const qualityEnum = z.enum(["raw", "refined", "verified", "published"]);

const certaintyEnum = z.enum(["certain", "probable", "hypothesis", "uncertain"]);

const completenessEnum = z.enum([
  "complete", "needs_evidence", "unaddressed_counterarg", "exploring", "fragment",
]);

const abstractionLevelEnum = z.enum(["principle", "concept", "case_study", "detail"]);

const stanceEnum = z.enum(["support", "oppose", "neutral", "exploring"]);

const evidenceDomainEnum = z.enum([
  "external_public", "external_private", "personal_event",
  "personal_belief", "personal_intuition", "reasoned_inference",
]);

const scopeEnum = z.enum([
  "universal", "domain_general", "domain_specific",
  "situational", "interpersonal", "personal",
]);

const aiTrustLevelEnum = z.enum(["user_authored", "verified", "inferred", "uncertain"]);

const energyLevelEnum = z.enum(["high", "neutral", "low"]);

const createUnitSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  projectId: z.string().uuid(),
  unitType: unitTypeEnum.optional(),
  originType: originTypeEnum.optional(),
  lifecycle: lifecycleEnum.optional(),
  quality: qualityEnum.optional(),
  certainty: certaintyEnum.optional(),
  completeness: completenessEnum.optional(),
  abstractionLevel: abstractionLevelEnum.optional(),
  stance: stanceEnum.optional(),
  evidenceDomain: evidenceDomainEnum.optional(),
  scope: scopeEnum.optional(),
  aiTrustLevel: aiTrustLevelEnum.optional(),
  energyLevel: energyLevelEnum.optional(),
  sourceUrl: z.string().url().optional(),
  sourceTitle: z.string().max(500).optional(),
  author: z.string().max(200).optional(),
  isQuote: z.boolean().optional(),
  sourceSpan: z.record(z.unknown()).optional(),
  parentInputId: z.string().optional(),
  conversationId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

const updateUnitSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(50000).optional(),
  unitType: unitTypeEnum.optional(),
  lifecycle: lifecycleEnum.optional(),
  quality: qualityEnum.optional(),
  certainty: certaintyEnum.optional(),
  completeness: completenessEnum.optional(),
  abstractionLevel: abstractionLevelEnum.optional(),
  stance: stanceEnum.optional(),
  evidenceDomain: evidenceDomainEnum.optional(),
  scope: scopeEnum.optional(),
  aiTrustLevel: aiTrustLevelEnum.optional(),
  energyLevel: energyLevelEnum.optional(),
  flagged: z.boolean().optional(),
  pinned: z.boolean().optional(),
  incubating: z.boolean().optional(),
  locked: z.boolean().optional(),
  actionRequired: z.boolean().optional(),
  meta: z.record(z.unknown()).optional(),
});

const listUnitsSchema = z.object({
  projectId: z.string().uuid().optional(),
  lifecycle: lifecycleEnum.optional(),
  unitType: unitTypeEnum.optional(),
  contextId: z.string().uuid().optional(),
  search: z.string().max(500).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "modifiedAt", "importance"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const listByIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ─── Router ────────────────────────────────────────────────────────

export const unitRouter = createTRPCRouter({
  hasAny: protectedProcedure
    .query(async ({ ctx }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { userId: ctx.session.user.id! },
        select: { id: true },
      });
      return { hasAny: !!unit };
    }),

  create: protectedProcedure
    .input(createUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);
      try {
        return await service.create(
          {
            ...input,
            sourceSpan: input.sourceSpan as Prisma.InputJsonValue | undefined,
            meta: input.meta as Prisma.InputJsonValue | undefined,
          },
          ctx.session.user.id!,
        );
      } catch (error) {
        if (error instanceof DuplicateUnitContentError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
            cause: { code: error.code, existingUnitId: error.existingUnitId },
          });
        }
        throw error;
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Single query: ownership check + full data fetch in one round-trip
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.id, userId: ctx.session.user.id! },
        include: {
          perspectives: { include: { relations: true } },
          versions: { orderBy: { version: "desc" }, take: 5 },
          resources: { include: { resource: true }, orderBy: { sortOrder: "asc" } },
        },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      // Fire-and-forget lastAccessed — don't block the read
      void ctx.db.unit.update({ where: { id: input.id }, data: { lastAccessed: new Date() } }).catch(() => {});
      return unit;
    }),

  list: protectedProcedure
    .input(listUnitsSchema)
    .query(async ({ ctx, input }) => {
      if (!input.projectId) {
        return { items: [], nextCursor: null };
      }
      // Single query: ownership enforced via userId filter in the service where clause
      const service = createUnitService(ctx.db);
      return service.list({ ...input, projectId: input.projectId, userId: ctx.session.user.id! });
    }),

  listByIds: protectedProcedure
    .input(listByIdsSchema)
    .query(async ({ ctx, input }) => {
      const units = await ctx.db.unit.findMany({
        where: {
          id: { in: input.ids },
          project: { userId: ctx.session.user.id! },
        },
      });
      return units;
    }),

  update: protectedProcedure
    .input(updateUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // IDOR: verify the unit belongs to a project owned by the authenticated user
      const owned = await ctx.db.unit.findFirst({
        where: { id, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const service = createUnitService(ctx.db);
      const unit = await service.update(
        id,
        { ...data, meta: data.meta as Prisma.InputJsonValue | undefined },
        ctx.session.user.id!,
      );
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      return unit;
    }),

  lifecycleTransition: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        targetState: lifecycleEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);
      const result = await service.transitionLifecycle(
        input.id,
        input.targetState,
        ctx.session.user.id!,
      );
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      return result;
    }),

  lifecycleBulkTransition: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(50),
        targetState: lifecycleEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);
      return service.bulkTransitionLifecycle(
        input.ids,
        input.targetState,
        ctx.session.user.id!,
      );
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        newIndex: z.number().int().min(0),
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id } },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      return ctx.db.unit.update({
        where: { id: input.unitId },
        data: { sortOrder: input.newIndex },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);
      return service.archive(input.id, ctx.session.user.id!);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);
      return service.delete(input.id, ctx.session.user.id!);
    }),

  /**
   * Get all contexts a unit belongs to, with unit count per context.
   */
  getContextsForUnit: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify the unit belongs to the authenticated user
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }

      const unitContexts = await ctx.db.unitContext.findMany({
        where: { unitId: input.unitId },
        include: {
          context: {
            select: {
              id: true,
              name: true,
              _count: { select: { unitContexts: true } },
            },
          },
        },
      });

      return unitContexts.map((uc) => ({
        id: uc.context.id,
        name: uc.context.name,
        unitCount: uc.context._count.unitContexts,
        assignedAt: uc.assignedAt,
      }));
    }),
});
