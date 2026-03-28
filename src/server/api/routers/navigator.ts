import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const navigatorRouter = createTRPCRouter({
  /**
   * List navigators by context ID.
   */
  list: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const context = await ctx.db.context.findUnique({
        where: { id: input.contextId },
        include: { project: { select: { userId: true } } },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      if (context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.navigator.findMany({
        where: { contextId: input.contextId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get navigator by ID with ordered items.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const navigator = await ctx.db.navigator.findUnique({
        where: { id: input.id },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
          items: {
            orderBy: { position: "asc" },
          },
        },
      });

      if (!navigator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
      }
      if (navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { context: _context, ...rest } = navigator;
      return rest;
    }),

  /**
   * Create a new navigator.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        contextId: z.string().uuid(),
        mode: z.enum(["query", "path", "selection"]),
        pathType: z
          .enum([
            "argument",
            "discovery",
            "question_anchored",
            "trace_back",
            "branch_explorer",
            "cross_context",
          ])
          .optional(),
        traversalMode: z.enum(["relation", "hierarchy", "work"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const context = await ctx.db.context.findUnique({
        where: { id: input.contextId },
        include: { project: { select: { userId: true } } },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      if (context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.navigator.create({
        data: {
          name: input.name,
          contextId: input.contextId,
          mode: input.mode,
          pathType: input.pathType,
          traversalMode: input.traversalMode ?? "relation",
        },
      });
    }),

  /**
   * Update navigator metadata.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        mode: z.enum(["query", "path", "selection"]).optional(),
        pathType: z
          .enum([
            "argument",
            "discovery",
            "question_anchored",
            "trace_back",
            "branch_explorer",
            "cross_context",
          ])
          .nullish(),
        traversalMode: z.enum(["relation", "hierarchy", "work"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const navigator = await ctx.db.navigator.findUnique({
        where: { id: input.id },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!navigator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
      }
      if (navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.navigator.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.mode !== undefined && { mode: input.mode }),
          ...(input.pathType !== undefined && { pathType: input.pathType }),
          ...(input.traversalMode !== undefined && {
            traversalMode: input.traversalMode,
          }),
        },
      });
    }),

  /**
   * Delete a navigator and its items.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const navigator = await ctx.db.navigator.findUnique({
        where: { id: input.id },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!navigator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
      }
      if (navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.navigator.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Add an item (unit or document) to a navigator at a given position.
   */
  addItem: protectedProcedure
    .input(
      z
        .object({
          navigatorId: z.string().uuid(),
          unitId: z.string().uuid().optional(),
          documentId: z.string().uuid().optional(),
          position: z.number().int().min(0),
          isPassage: z.boolean().optional(),
        })
        .refine((data) => data.unitId || data.documentId, {
          message: "Either unitId or documentId must be provided",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const navigator = await ctx.db.navigator.findUnique({
        where: { id: input.navigatorId },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!navigator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
      }
      if (navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Shift existing items at or after the target position
      await ctx.db.navigatorItem.updateMany({
        where: {
          navigatorId: input.navigatorId,
          position: { gte: input.position },
        },
        data: { position: { increment: 1 } },
      });

      return ctx.db.navigatorItem.create({
        data: {
          navigatorId: input.navigatorId,
          unitId: input.unitId,
          documentId: input.documentId,
          position: input.position,
          isPassage: input.isPassage ?? false,
        },
      });
    }),

  /**
   * Remove an item from a navigator and close the position gap.
   */
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.navigatorItem.findUnique({
        where: { id: input.itemId },
        include: {
          navigator: {
            include: {
              context: {
                include: { project: { select: { userId: true } } },
              },
            },
          },
        },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (item.navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.$transaction([
        ctx.db.navigatorItem.delete({ where: { id: input.itemId } }),
        ctx.db.navigatorItem.updateMany({
          where: {
            navigatorId: item.navigatorId,
            position: { gt: item.position },
          },
          data: { position: { decrement: 1 } },
        }),
      ]);

      return { success: true };
    }),

  /**
   * Bulk reorder items within a navigator.
   */
  reorderItems: protectedProcedure
    .input(
      z.object({
        navigatorId: z.string().uuid(),
        items: z.array(
          z.object({
            itemId: z.string().uuid(),
            position: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const navigator = await ctx.db.navigator.findUnique({
        where: { id: input.navigatorId },
        include: {
          context: {
            include: { project: { select: { userId: true } } },
          },
        },
      });
      if (!navigator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
      }
      if (navigator.context.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.$transaction(
        input.items.map((item) =>
          ctx.db.navigatorItem.update({
            where: { id: item.itemId },
            data: { position: item.position },
          }),
        ),
      );

      return { success: true };
    }),
});
