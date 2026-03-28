import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            inquiries: true,
            contexts: true,
            units: true,
          },
        },
      },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      counts: {
        inquiries: p._count.inquiries,
        contexts: p._count.contexts,
        units: p._count.units,
      },
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          description: true,
          branchedFrom: true,
          branchReason: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              inquiries: true,
              contexts: true,
              units: true,
              assemblies: true,
              documents: true,
              branches: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        branchedFrom: project.branchedFrom,
        branchReason: project.branchReason,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        counts: {
          inquiries: project._count.inquiries,
          contexts: project._count.contexts,
          units: project._count.units,
          assemblies: project._count.assemblies,
          documents: project._count.documents,
          branches: project._count.branches,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          userId: ctx.session.user.id!,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const project = await ctx.db.project.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description ?? null,
          }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return project;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Soft-archive: set all units in the project to archived lifecycle
      await ctx.db.unit.updateMany({
        where: { projectId: input.id, userId: ctx.session.user.id },
        data: { isArchived: true, lifecycle: "archived" },
      });

      // Archive all contexts
      await ctx.db.context.updateMany({
        where: { projectId: input.id },
        data: { status: "archived" },
      });

      // Archive all inquiries
      await ctx.db.inquiry.updateMany({
        where: { projectId: input.id },
        data: { status: "abandoned" },
      });

      return { id: input.id, archived: true };
    }),
});
