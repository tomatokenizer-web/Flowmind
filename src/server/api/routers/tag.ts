import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ──────────────────────────────────────────────────────

const createTagInput = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  projectId: z.string().uuid(),
});

const updateTagInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(50).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

const assignTagInput = z.object({
  unitId: z.string().uuid(),
  tagId: z.string(),
});

// ─── Router ─────────────────────────────────────────────────────────────

export const tagRouter = createTRPCRouter({
  /** List all tags for a project */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.tag.findMany({
        where: { projectId: input.projectId },
        include: {
          _count: { select: { units: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  /** Get a single tag by ID with its units */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tag = await ctx.db.tag.findUnique({
        where: { id: input.id },
        include: {
          units: {
            include: {
              unit: {
                select: {
                  id: true,
                  content: true,
                  unitType: true,
                  lifecycle: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      return tag;
    }),

  /** Create a new tag */
  create: protectedProcedure
    .input(createTagInput)
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Project not found or access denied",
        });
      }

      return ctx.db.tag.create({
        data: {
          name: input.name,
          color: input.color,
          projectId: input.projectId,
        },
      });
    }),

  /** Update tag name or color */
  update: protectedProcedure
    .input(updateTagInput)
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.db.tag.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      if (tag.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.tag.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.color !== undefined && { color: input.color }),
        },
      });
    }),

  /** Delete a tag (cascade removes all unit associations) */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.db.tag.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      if (tag.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.tag.delete({ where: { id: input.id } });
    }),

  /** Assign a tag to a unit */
  assign: protectedProcedure
    .input(assignTagInput)
    .mutation(async ({ ctx, input }) => {
      // Verify both unit and tag belong to the same project owned by the user
      const [unit, tag] = await Promise.all([
        ctx.db.unit.findUnique({
          where: { id: input.unitId },
          select: { projectId: true, project: { select: { userId: true } } },
        }),
        ctx.db.tag.findUnique({
          where: { id: input.tagId },
          select: { projectId: true },
        }),
      ]);

      if (!unit || unit.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unit not found or access denied",
        });
      }

      if (!tag || tag.projectId !== unit.projectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tag not found or belongs to a different project",
        });
      }

      return ctx.db.unitTag.create({
        data: {
          unitId: input.unitId,
          tagId: input.tagId,
        },
      });
    }),

  /** Remove a tag from a unit */
  remove: protectedProcedure
    .input(assignTagInput)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before removing
      const unitTag = await ctx.db.unitTag.findUnique({
        where: {
          unitId_tagId: {
            unitId: input.unitId,
            tagId: input.tagId,
          },
        },
        include: {
          unit: {
            select: { project: { select: { userId: true } } },
          },
        },
      });

      if (!unitTag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tag assignment not found",
        });
      }

      if (unitTag.unit.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.unitTag.delete({
        where: {
          unitId_tagId: {
            unitId: input.unitId,
            tagId: input.tagId,
          },
        },
      });
    }),

  /** Get all tags assigned to a specific unit */
  getByUnit: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const unitTags = await ctx.db.unitTag.findMany({
        where: { unitId: input.unitId },
        include: {
          tag: true,
        },
        orderBy: { tag: { name: "asc" } },
      });

      return unitTags.map((ut) => ut.tag);
    }),

  /** Bulk assign multiple tags to a unit at once */
  bulkAssign: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        tagIds: z.array(z.string()).min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { projectId: true, project: { select: { userId: true } } },
      });

      if (!unit || unit.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unit not found or access denied",
        });
      }

      // Verify all tags belong to the same project
      const tags = await ctx.db.tag.findMany({
        where: {
          id: { in: input.tagIds },
          projectId: unit.projectId,
        },
        select: { id: true },
      });

      const validTagIds = new Set(tags.map((t) => t.id));
      const invalidIds = input.tagIds.filter((id) => !validTagIds.has(id));

      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tags not found or belong to different project: ${invalidIds.join(", ")}`,
        });
      }

      // Use createMany with skipDuplicates to handle already-assigned tags
      const result = await ctx.db.unitTag.createMany({
        data: input.tagIds.map((tagId) => ({
          unitId: input.unitId,
          tagId,
        })),
        skipDuplicates: true,
      });

      return { created: result.count };
    }),
});
