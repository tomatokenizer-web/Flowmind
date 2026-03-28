import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";

export const searchRouter = createTRPCRouter({
  /**
   * Full-text search across units within a project.
   * Supports filtering by contextId, types, lifecycle, and tags.
   */
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        projectId: z.string().uuid(),
        contextId: z.string().uuid().optional(),
        types: z.array(z.string()).optional(),
        lifecycle: z
          .enum([
            "draft",
            "pending",
            "confirmed",
            "deferred",
            "complete",
            "archived",
            "discarded",
          ])
          .optional(),
        tagIds: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const where: Prisma.UnitWhereInput = {
        projectId: input.projectId,
        content: { contains: input.query, mode: "insensitive" },
        ...(input.types && input.types.length > 0 && {
          primaryType: { in: input.types },
        }),
        ...(input.lifecycle && { lifecycle: input.lifecycle }),
        ...(input.tagIds && input.tagIds.length > 0 && {
          unitTags: { some: { tagId: { in: input.tagIds } } },
        }),
        ...(input.contextId && {
          unitContexts: { some: { contextId: input.contextId } },
        }),
      };

      const [units, total] = await ctx.db.$transaction([
        ctx.db.unit.findMany({
          where,
          select: {
            id: true,
            content: true,
            primaryType: true,
            typeTier: true,
            lifecycle: true,
            certainty: true,
            completeness: true,
            createdAt: true,
            modifiedAt: true,
          },
          orderBy: { modifiedAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.unit.count({ where }),
      ]);

      return { units, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Search units by tag within a project.
   */
  byTag: protectedProcedure
    .input(
      z.object({
        tagId: z.string(),
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const where: Prisma.UnitWhereInput = {
        projectId: input.projectId,
        unitTags: { some: { tagId: input.tagId } },
      };

      const [units, total] = await ctx.db.$transaction([
        ctx.db.unit.findMany({
          where,
          select: {
            id: true,
            content: true,
            primaryType: true,
            typeTier: true,
            lifecycle: true,
            createdAt: true,
            modifiedAt: true,
          },
          orderBy: { modifiedAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.unit.count({ where }),
      ]);

      return { units, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Get recently modified units in a project.
   */
  recentUnits: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return ctx.db.unit.findMany({
        where: {
          projectId: input.projectId,
          lifecycle: { notIn: ["discarded", "archived"] },
        },
        select: {
          id: true,
          content: true,
          primaryType: true,
          typeTier: true,
          lifecycle: true,
          modifiedAt: true,
        },
        orderBy: { modifiedAt: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Find orphan units -- units with no relations (neither source nor target).
   */
  orphanUnits: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const where: Prisma.UnitWhereInput = {
        projectId: input.projectId,
        lifecycle: { notIn: ["discarded", "archived"] },
        relationsAsSource: { none: {} },
        relationsAsTarget: { none: {} },
      };

      const [units, total] = await ctx.db.$transaction([
        ctx.db.unit.findMany({
          where,
          select: {
            id: true,
            content: true,
            primaryType: true,
            typeTier: true,
            lifecycle: true,
            createdAt: true,
            modifiedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.unit.count({ where }),
      ]);

      return { units, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Get all system relation types (for UI dropdowns).
   */
  systemRelationTypes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.systemRelationType.findMany({
      orderBy: [{ layer: "asc" }, { sortOrder: "asc" }],
    });
  }),

  /**
   * Get all unit types, optionally filtered by tier and/or domain.
   */
  unitTypes: protectedProcedure
    .input(
      z
        .object({
          tier: z.enum(["base", "seed", "formal"]).optional(),
          domain: z.string().max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.unitType.findMany({
        where: {
          ...(input?.tier && { tier: input.tier }),
          ...(input?.domain && { domain: input.domain }),
        },
        orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
      });
    }),

  /**
   * List available domain templates.
   */
  domainTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.domainTemplate.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });
  }),
});
