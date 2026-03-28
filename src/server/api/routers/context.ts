import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const contextRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        inquiryId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const contexts = await ctx.db.context.findMany({
        where: {
          projectId: input.projectId,
          ...(input.inquiryId !== undefined && {
            inquiryId: input.inquiryId,
          }),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          parentId: true,
          inquiryId: true,
          snapshot: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              unitContexts: true,
              perspectives: true,
              children: true,
            },
          },
        },
      });

      return contexts.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        parentId: c.parentId,
        inquiryId: c.inquiryId,
        snapshot: c.snapshot,
        sortOrder: c.sortOrder,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        counts: {
          units: c._count.unitContexts,
          perspectives: c._count.perspectives,
          children: c._count.children,
        },
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const context = await ctx.db.context.findFirst({
        where: {
          id: input.id,
          project: { userId: ctx.session.user.id },
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          parentId: true,
          inquiryId: true,
          projectId: true,
          snapshot: true,
          openQuestions: true,
          contradictions: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              unitContexts: true,
              perspectives: true,
              children: true,
              navigators: true,
            },
          },
        },
      });

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context not found",
        });
      }

      return {
        id: context.id,
        name: context.name,
        description: context.description,
        status: context.status,
        parentId: context.parentId,
        inquiryId: context.inquiryId,
        projectId: context.projectId,
        snapshot: context.snapshot,
        openQuestions: context.openQuestions as string[],
        contradictions: context.contradictions as string[],
        sortOrder: context.sortOrder,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
        counts: {
          units: context._count.unitContexts,
          perspectives: context._count.perspectives,
          children: context._count.children,
          navigators: context._count.navigators,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        projectId: z.string().uuid(),
        inquiryId: z.string().uuid().optional(),
        parentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Verify inquiry belongs to same project if provided
      if (input.inquiryId) {
        const inquiry = await ctx.db.inquiry.findFirst({
          where: {
            id: input.inquiryId,
            projectId: input.projectId,
          },
          select: { id: true },
        });

        if (!inquiry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Inquiry not found in this project",
          });
        }
      }

      // Verify parent context belongs to same project if provided
      if (input.parentId) {
        const parent = await ctx.db.context.findFirst({
          where: {
            id: input.parentId,
            projectId: input.projectId,
          },
          select: { id: true },
        });

        if (!parent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent context not found in this project",
          });
        }
      }

      const context = await ctx.db.context.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          projectId: input.projectId,
          inquiryId: input.inquiryId ?? null,
          parentId: input.parentId ?? null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          parentId: true,
          inquiryId: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return context;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullish(),
        status: z
          .enum(["active", "paused", "resolved", "archived"])
          .optional(),
        snapshot: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.context.findFirst({
        where: {
          id: input.id,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context not found",
        });
      }

      const context = await ctx.db.context.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description ?? null,
          }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.snapshot !== undefined && { snapshot: input.snapshot }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          snapshot: true,
          updatedAt: true,
        },
      });

      return context;
    }),

  assignToInquiry: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        inquiryId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const context = await ctx.db.context.findFirst({
        where: {
          id: input.contextId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true, projectId: true },
      });

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context not found",
        });
      }

      // Verify inquiry belongs to same project
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.inquiryId,
          projectId: context.projectId,
        },
        select: { id: true },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Inquiry not found in the same project",
        });
      }

      const updated = await ctx.db.context.update({
        where: { id: input.contextId },
        data: { inquiryId: input.inquiryId },
        select: {
          id: true,
          name: true,
          inquiryId: true,
          updatedAt: true,
        },
      });

      return updated;
    }),

  mute: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        unitId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify context ownership
      const context = await ctx.db.context.findFirst({
        where: {
          id: input.contextId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context not found",
        });
      }

      // Remove the unit-context association (mute = hide from this context)
      const deleted = await ctx.db.unitContext.deleteMany({
        where: {
          contextId: input.contextId,
          unitId: input.unitId,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit is not associated with this context",
        });
      }

      return { contextId: input.contextId, unitId: input.unitId, muted: true };
    }),
});
