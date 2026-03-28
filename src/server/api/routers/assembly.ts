import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const assemblyRouter = createTRPCRouter({
  /**
   * List assemblies by project ID.
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return ctx.db.assembly.findMany({
        where: { projectId: input.projectId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get assembly by ID with ordered items and their unit content.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.id },
        include: {
          project: { select: { userId: true } },
          items: {
            orderBy: { position: "asc" },
            include: {
              unit: {
                select: {
                  id: true,
                  content: true,
                  primaryType: true,
                  typeTier: true,
                  lifecycle: true,
                  certainty: true,
                  completeness: true,
                },
              },
            },
          },
        },
      });

      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { project: _project, ...rest } = assembly;
      return rest;
    }),

  /**
   * Create a new assembly.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        projectId: z.string().uuid(),
        rhetoricalShape: z
          .enum(["argument", "narrative", "analysis", "comparison", "synthesis"])
          .optional(),
        situationMeta: z
          .object({
            exigence: z.string().optional(),
            audience: z.string().optional(),
            constraints: z.string().optional(),
            rhetorPosition: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return ctx.db.assembly.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          rhetoricalShape: input.rhetoricalShape,
          situationMeta: input.situationMeta ?? undefined,
        },
      });
    }),

  /**
   * Update assembly metadata.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        rhetoricalShape: z
          .enum(["argument", "narrative", "analysis", "comparison", "synthesis"])
          .nullish(),
        situationMeta: z
          .object({
            exigence: z.string().optional(),
            audience: z.string().optional(),
            constraints: z.string().optional(),
            rhetorPosition: z.string().optional(),
          })
          .nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { id, ...data } = input;
      return ctx.db.assembly.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.rhetoricalShape !== undefined && {
            rhetoricalShape: data.rhetoricalShape,
          }),
          ...(data.situationMeta !== undefined && {
            situationMeta: data.situationMeta ?? undefined,
          }),
        },
      });
    }),

  /**
   * Delete an assembly and its items.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.assembly.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Add a unit to an assembly at a given position.
   * Existing items at or after that position are shifted down.
   */
  addItem: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        unitId: z.string().uuid(),
        position: z.number().int().min(0),
        assemblyRole: z.string().max(50).optional(),
        bridgeText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.assemblyId },
        include: { project: { select: { userId: true } } },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Shift items at or after the target position
      await ctx.db.assemblyItem.updateMany({
        where: {
          assemblyId: input.assemblyId,
          position: { gte: input.position },
        },
        data: { position: { increment: 1 } },
      });

      return ctx.db.assemblyItem.create({
        data: {
          assemblyId: input.assemblyId,
          unitId: input.unitId,
          position: input.position,
          assemblyRole: input.assemblyRole,
          bridgeText: input.bridgeText,
        },
      });
    }),

  /**
   * Remove an item from an assembly and close the position gap.
   */
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.assemblyItem.findUnique({
        where: { id: input.itemId },
        include: {
          assembly: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (item.assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.$transaction([
        ctx.db.assemblyItem.delete({ where: { id: input.itemId } }),
        ctx.db.assemblyItem.updateMany({
          where: {
            assemblyId: item.assemblyId,
            position: { gt: item.position },
          },
          data: { position: { decrement: 1 } },
        }),
      ]);

      return { success: true };
    }),

  /**
   * Bulk reorder items within an assembly.
   */
  reorderItems: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        items: z.array(
          z.object({
            itemId: z.string().uuid(),
            position: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.assemblyId },
        include: { project: { select: { userId: true } } },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.$transaction(
        input.items.map((item) =>
          ctx.db.assemblyItem.update({
            where: { id: item.itemId },
            data: { position: item.position },
          }),
        ),
      );

      return { success: true };
    }),

  /**
   * Update assemblyRole or bridgeText on an item.
   */
  updateItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        assemblyRole: z.string().max(50).nullish(),
        bridgeText: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.assemblyItem.findUnique({
        where: { id: input.itemId },
        include: {
          assembly: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (item.assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.assemblyItem.update({
        where: { id: input.itemId },
        data: {
          ...(input.assemblyRole !== undefined && {
            assemblyRole: input.assemblyRole,
          }),
          ...(input.bridgeText !== undefined && {
            bridgeText: input.bridgeText,
          }),
        },
      });
    }),

  /**
   * Create an export history entry for an assembly.
   */
  export: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        format: z.string().max(50),
        unitIds: z.array(z.string().uuid()),
        contentHash: z.string().max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.assemblyId },
        include: { project: { select: { userId: true } } },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }
      if (assembly.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.exportHistory.create({
        data: {
          assemblyId: input.assemblyId,
          userId: ctx.session.user.id,
          format: input.format,
          unitIds: input.unitIds,
          contentHash: input.contentHash,
        },
      });
    }),
});
