import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient, type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Verify the unit exists and belongs to the current user (via project). */
async function verifyUnitOwnership(
  db: PrismaClient,
  unitId: string,
  userId: string,
) {
  const unit = await db.unit.findUnique({
    where: { id: unitId },
    select: { id: true, project: { select: { userId: true } } },
  });
  if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
  if (unit.project.userId !== userId)
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });
  return unit;
}

/** Verify a project belongs to the current user. */
async function verifyProjectOwnership(
  db: PrismaClient,
  projectId: string,
  userId: string,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (project.userId !== userId)
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your project" });
  return project;
}

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------

export const unitRouter = createTRPCRouter({
  // ---- list (cursor-based pagination) ----
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        contextId: z.string().uuid().optional(),
        type: z.string().optional(),
        lifecycle: z.string().optional(),
        search: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);

      const where: Record<string, unknown> = {
        projectId: input.projectId,
      };
      if (input.type) where.primaryType = input.type;
      if (input.lifecycle) where.lifecycle = input.lifecycle;
      if (input.search) where.content = { contains: input.search, mode: "insensitive" };
      if (input.contextId) {
        where.unitContexts = { some: { contextId: input.contextId } };
      }

      const items = await ctx.db.unit.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          unitTags: { include: { tag: true } },
          unitContexts: true,
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  // ---- getById ----
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.id },
        include: {
          perspectives: { include: { context: true } },
          relationsAsSource: { include: { targetUnit: true } },
          relationsAsTarget: { include: { sourceUnit: true } },
          unitTags: { include: { tag: true } },
          versions: { orderBy: { version: "desc" } },
          unitContexts: { include: { context: true } },
          project: { select: { userId: true } },
        },
      });

      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.project.userId !== ctx.session.user.id!)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });

      return unit;
    }),

  // ---- create ----
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        projectId: z.string().uuid(),
        primaryType: z.string().default("claim"),
        typeTier: z.enum(["base", "seed", "formal"]).default("base"),
        contextId: z.string().uuid().optional(),
        secondaryTypes: z.array(z.string()).optional(),
        contextDependency: z.enum(["free", "anchored", "passage"]).optional(),
        anchorUnitId: z.string().uuid().optional(),
        certainty: z.enum(["certain", "probable", "hypothesis", "uncertain"]).optional(),
        completeness: z
          .enum(["complete", "needs_evidence", "unaddressed_counterarg", "exploring", "fragment"])
          .optional(),
        abstractionLevel: z.enum(["principle", "concept", "case_study", "detail"]).optional(),
        originType: z
          .enum([
            "direct_write",
            "external_excerpt",
            "external_inspiration",
            "external_summary",
            "ai_generated",
            "ai_refined",
          ])
          .optional(),
        sourceUrl: z.string().url().optional(),
        sourceTitle: z.string().optional(),
        author: z.string().optional(),
        isQuote: z.boolean().optional(),
        evidenceDomain: z
          .enum([
            "external_public",
            "external_private",
            "personal_event",
            "personal_belief",
            "personal_intuition",
            "reasoned_inference",
          ])
          .optional(),
        scope: z
          .enum([
            "universal",
            "domain_general",
            "domain_specific",
            "situational",
            "interpersonal",
            "personal",
          ])
          .optional(),
        domain: z.string().optional(),
        energyLevel: z.enum(["high", "neutral", "low"]).optional(),
        meta: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);

      const { contextId, ...unitData } = input;

      const { meta: unitMeta, ...unitDataWithoutMeta } = unitData;
      const unit = await ctx.db.unit.create({
        data: {
          ...unitDataWithoutMeta,
          ...(unitMeta !== undefined && { meta: unitMeta as Prisma.InputJsonValue }),
          userId: ctx.session.user.id!,
          lifecycle: "draft",
        },
      });

      // Auto-create UnitContext if contextId provided
      if (contextId) {
        await ctx.db.unitContext.create({
          data: { unitId: unit.id, contextId },
        });
      }

      return unit;
    }),

  // ---- update ----
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().min(1).optional(),
        primaryType: z.string().optional(),
        typeTier: z.enum(["base", "seed", "formal"]).optional(),
        lifecycle: z
          .enum(["draft", "pending", "confirmed", "deferred", "complete", "archived", "discarded"])
          .optional(),
        quality: z.enum(["raw", "refined", "verified", "published"]).optional(),
        certainty: z.enum(["certain", "probable", "hypothesis", "uncertain"]).optional(),
        completeness: z
          .enum(["complete", "needs_evidence", "unaddressed_counterarg", "exploring", "fragment"])
          .optional(),
        abstractionLevel: z.enum(["principle", "concept", "case_study", "detail"]).optional(),
        contextDependency: z.enum(["free", "anchored", "passage"]).optional(),
        actionRequired: z.boolean().optional(),
        flagged: z.boolean().optional(),
        pinned: z.boolean().optional(),
        incubating: z.boolean().optional(),
        locked: z.boolean().optional(),
        energyLevel: z.enum(["high", "neutral", "low"]).optional(),
        meta: z.record(z.unknown()).optional(),
        changeReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);

      const { id, changeReason, ...data } = input;

      // If content is changing, create a version snapshot first
      if (data.content) {
        const current = await ctx.db.unit.findUniqueOrThrow({
          where: { id },
          select: { content: true, primaryType: true, meta: true },
        });

        const versionCount = await ctx.db.unitVersion.count({ where: { unitId: id } });

        await ctx.db.unitVersion.create({
          data: {
            unitId: id,
            version: versionCount + 1,
            content: current.content,
            primaryType: current.primaryType,
            meta: current.meta ?? undefined,
            changeReason: changeReason ?? null,
            versionOrigin: "manual",
          },
        });
      }

      const { meta: updateMeta, ...dataWithoutMeta } = data;
      return ctx.db.unit.update({
        where: { id },
        data: {
          ...dataWithoutMeta,
          ...(updateMeta !== undefined && { meta: updateMeta as Prisma.InputJsonValue }),
        },
      });
    }),

  // ---- archive ----
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.unit.update({
        where: { id: input.id },
        data: { lifecycle: "archived", isArchived: true },
      });
    }),

  // ---- discard ----
  discard: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.unit.update({
        where: { id: input.id },
        data: { lifecycle: "discarded" },
      });
    }),

  // ---- split ----
  split: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        splitPosition: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);

      const original = await ctx.db.unit.findUniqueOrThrow({
        where: { id: input.id },
        include: { unitContexts: true },
      });

      if (input.splitPosition >= original.content.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Split position exceeds content length",
        });
      }

      const contentA = original.content.slice(0, input.splitPosition).trim();
      const contentB = original.content.slice(input.splitPosition).trim();

      if (!contentA || !contentB) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Split would produce an empty unit",
        });
      }

      // Version the original before modifying
      const versionCount = await ctx.db.unitVersion.count({ where: { unitId: input.id } });
      await ctx.db.unitVersion.create({
        data: {
          unitId: input.id,
          version: versionCount + 1,
          content: original.content,
          primaryType: original.primaryType,
          changeReason: "Pre-split snapshot",
          versionOrigin: "split",
        },
      });

      // Update original with first half
      await ctx.db.unit.update({
        where: { id: input.id },
        data: { content: contentA },
      });

      // Create new unit with second half
      const newUnit = await ctx.db.unit.create({
        data: {
          content: contentB,
          userId: original.userId,
          projectId: original.projectId,
          primaryType: original.primaryType,
          typeTier: original.typeTier,
          lifecycle: "draft",
        },
      });

      // Copy context assignments
      if (original.unitContexts.length > 0) {
        await ctx.db.unitContext.createMany({
          data: original.unitContexts.map((uc) => ({
            unitId: newUnit.id,
            contextId: uc.contextId,
          })),
        });
      }

      // Create derived_from relation
      await ctx.db.relation.create({
        data: {
          sourceUnitId: newUnit.id,
          targetUnitId: input.id,
          type: "derived_from",
          createdBy: "user",
        },
      });

      return { original: { id: input.id, content: contentA }, newUnit };
    }),

  // ---- merge ----
  merge: protectedProcedure
    .input(
      z.object({
        unitIds: z.array(z.string().uuid()).min(2),
        separator: z.string().default("\n\n"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify all units and collect data
      const units = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds } },
        include: {
          project: { select: { userId: true } },
          relationsAsSource: true,
          relationsAsTarget: true,
          unitContexts: true,
          unitTags: true,
        },
        orderBy: { createdAt: "asc" },
      });

      if (units.length !== input.unitIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or more units not found" });
      }

      const projectIds = new Set(units.map((u) => u.projectId));
      if (projectIds.size > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All units must belong to the same project",
        });
      }

      for (const unit of units) {
        if (unit.project.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });
        }
      }

      const mergedContent = units.map((u) => u.content).join(input.separator);
      const firstUnit = units[0]!;

      // Create the merged unit
      const mergedUnit = await ctx.db.unit.create({
        data: {
          content: mergedContent,
          userId,
          projectId: firstUnit.projectId,
          primaryType: firstUnit.primaryType,
          typeTier: firstUnit.typeTier,
          lifecycle: "draft",
        },
      });

      // Collect unique context IDs and tag IDs from all source units
      const contextIds = new Set<string>();
      const tagIds = new Set<string>();
      for (const unit of units) {
        for (const uc of unit.unitContexts) contextIds.add(uc.contextId);
        for (const ut of unit.unitTags) tagIds.add(ut.tagId);
      }

      // Copy context assignments
      if (contextIds.size > 0) {
        await ctx.db.unitContext.createMany({
          data: [...contextIds].map((contextId) => ({
            unitId: mergedUnit.id,
            contextId,
          })),
        });
      }

      // Copy tag assignments
      if (tagIds.size > 0) {
        await ctx.db.unitTag.createMany({
          data: [...tagIds].map((tagId) => ({
            unitId: mergedUnit.id,
            tagId,
          })),
        });
      }

      // Re-point external relations to the merged unit
      for (const unit of units) {
        // Relations where this unit is source (pointing outward) — skip inter-merge relations
        for (const rel of unit.relationsAsSource) {
          if (input.unitIds.includes(rel.targetUnitId)) continue;
          await ctx.db.relation.create({
            data: {
              sourceUnitId: mergedUnit.id,
              targetUnitId: rel.targetUnitId,
              type: rel.type,
              fromType: rel.fromType,
              strength: rel.strength,
              direction: rel.direction,
              nsDirection: rel.nsDirection,
              purpose: rel.purpose,
              createdBy: rel.createdBy,
            },
          });
        }
        // Relations where this unit is target (pointing inward)
        for (const rel of unit.relationsAsTarget) {
          if (input.unitIds.includes(rel.sourceUnitId)) continue;
          await ctx.db.relation.create({
            data: {
              sourceUnitId: rel.sourceUnitId,
              targetUnitId: mergedUnit.id,
              type: rel.type,
              fromType: rel.fromType,
              strength: rel.strength,
              direction: rel.direction,
              nsDirection: rel.nsDirection,
              purpose: rel.purpose,
              createdBy: rel.createdBy,
            },
          });
        }
      }

      // Mark originals as absorbed
      await ctx.db.unit.updateMany({
        where: { id: { in: input.unitIds } },
        data: {
          maturationPathway: "absorbed",
          lifecycle: "archived",
          isArchived: true,
        },
      });

      // Create absorbed_into relations
      await ctx.db.relation.createMany({
        data: input.unitIds.map((sourceId) => ({
          sourceUnitId: sourceId,
          targetUnitId: mergedUnit.id,
          type: "absorbed_into",
          createdBy: "user" as const,
        })),
      });

      return mergedUnit;
    }),

  // ---- assignToContext ----
  assignToContext: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        contextId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);
      return ctx.db.unitContext.create({
        data: { unitId: input.unitId, contextId: input.contextId },
      });
    }),

  // ---- removeFromContext ----
  removeFromContext: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        contextId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);

      const entry = await ctx.db.unitContext.findUnique({
        where: { unitId_contextId: { unitId: input.unitId, contextId: input.contextId } },
      });
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit is not in this context" });
      }

      return ctx.db.unitContext.delete({
        where: { unitId_contextId: { unitId: input.unitId, contextId: input.contextId } },
      });
    }),

  // ---- addTag ----
  addTag: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        tagName: z.string().min(1).max(50),
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);

      // Upsert the tag
      const tag = await ctx.db.tag.upsert({
        where: { projectId_name: { projectId: input.projectId, name: input.tagName } },
        create: { name: input.tagName, projectId: input.projectId },
        update: {},
      });

      return ctx.db.unitTag.create({
        data: { unitId: input.unitId, tagId: tag.id },
      });
    }),

  // ---- removeTag ----
  removeTag: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        tagId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.unitId, ctx.session.user.id!);
      return ctx.db.unitTag.delete({
        where: { unitId_tagId: { unitId: input.unitId, tagId: input.tagId } },
      });
    }),

  // ---- toggleEvergreen ----
  toggleEvergreen: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);
      const unit = await ctx.db.unit.findUniqueOrThrow({
        where: { id: input.id },
        select: { isEvergreen: true },
      });
      return ctx.db.unit.update({
        where: { id: input.id },
        data: { isEvergreen: !unit.isEvergreen },
      });
    }),

  // ---- updateLastAccessed ----
  updateLastAccessed: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyUnitOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.unit.update({
        where: { id: input.id },
        data: { lastAccessed: new Date() },
      });
    }),
});
