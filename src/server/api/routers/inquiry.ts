import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const inquiryRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
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

      const inquiries = await ctx.db.inquiry.findMany({
        where: { projectId: input.projectId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          formation: true,
          status: true,
          startingQuestions: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          domainTemplateId: true,
          _count: {
            select: {
              contexts: true,
              pivotHistory: true,
            },
          },
        },
      });

      return inquiries.map((inq) => ({
        id: inq.id,
        title: inq.title,
        formation: inq.formation,
        status: inq.status,
        startingQuestions: inq.startingQuestions as string[],
        createdAt: inq.createdAt,
        updatedAt: inq.updatedAt,
        completedAt: inq.completedAt,
        domainTemplateId: inq.domainTemplateId,
        counts: {
          contexts: inq._count.contexts,
          pivots: inq._count.pivotHistory,
        },
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.id,
          project: { userId: ctx.session.user.id },
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          formation: true,
          status: true,
          startingQuestions: true,
          formedFrom: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          domainTemplateId: true,
          contexts: {
            select: {
              id: true,
              name: true,
              status: true,
            },
            orderBy: { sortOrder: "asc" },
          },
          compass: {
            select: {
              id: true,
              completeness: true,
              openQuestions: true,
              blockers: true,
              requiredFormalTypes: true,
              currentState: true,
            },
          },
          pivotHistory: {
            select: {
              id: true,
              fromGoal: true,
              toGoal: true,
              reason: true,
              carriedForward: true,
              deprecated: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      return {
        id: inquiry.id,
        title: inquiry.title,
        projectId: inquiry.projectId,
        formation: inquiry.formation,
        status: inquiry.status,
        startingQuestions: inquiry.startingQuestions as string[],
        formedFrom: inquiry.formedFrom,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
        completedAt: inquiry.completedAt,
        domainTemplateId: inquiry.domainTemplateId,
        contexts: inquiry.contexts,
        compass: inquiry.compass,
        pivotHistory: inquiry.pivotHistory,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        projectId: z.string().uuid(),
        domainTemplateId: z.string().uuid().optional(),
        formation: z.enum(["top_down", "organic"]).default("top_down"),
        startingQuestions: z.array(z.string()).default([]),
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

      const inquiry = await ctx.db.inquiry.create({
        data: {
          title: input.title,
          projectId: input.projectId,
          domainTemplateId: input.domainTemplateId ?? null,
          formation: input.formation,
          startingQuestions: input.startingQuestions,
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          formation: true,
          status: true,
          startingQuestions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return inquiry;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        status: z
          .enum(["exploring", "active", "paused", "completed", "abandoned"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.inquiry.findFirst({
        where: {
          id: input.id,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      const inquiry = await ctx.db.inquiry.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.status === "completed" && { completedAt: new Date() }),
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          completedAt: true,
        },
      });

      return inquiry;
    }),

  pivot: protectedProcedure
    .input(
      z.object({
        inquiryId: z.string().uuid(),
        fromGoal: z.string().min(1),
        toGoal: z.string().min(1),
        reason: z.string().min(1),
        carriedForward: z.array(z.string().uuid()).default([]),
        deprecated: z.array(z.string().uuid()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.inquiryId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      const pivotEvent = await ctx.db.pivotEvent.create({
        data: {
          inquiryId: input.inquiryId,
          fromGoal: input.fromGoal,
          toGoal: input.toGoal,
          reason: input.reason,
          carriedForward: input.carriedForward,
          deprecated: input.deprecated,
        },
        select: {
          id: true,
          fromGoal: true,
          toGoal: true,
          reason: true,
          carriedForward: true,
          deprecated: true,
          createdAt: true,
        },
      });

      return pivotEvent;
    }),
});
