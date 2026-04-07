import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createInquiryService } from "@/server/services/inquiryService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const pursuitStatusEnum = z.enum([
  "active_pursuit", "paused_pursuit", "completed_pursuit", "archived_pursuit",
]);

const inquiryStatusEnum = z.enum([
  "exploring", "active", "paused", "completed", "abandoned",
]);

const inquiryFormationEnum = z.enum(["top_down", "organic"]);

const createPursuitSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  status: pursuitStatusEnum.optional(),
});

const updatePursuitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: pursuitStatusEnum.optional(),
});

const createInquirySchema = z.object({
  title: z.string().min(1).max(500),
  pursuitId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  secondaryTemplates: z.array(z.string().uuid()).optional(),
  formation: inquiryFormationEnum.optional(),
  status: inquiryStatusEnum.optional(),
  startingQuestions: z.array(z.string().max(1000)).max(20).optional(),
});

const updateInquirySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  templateId: z.string().uuid().optional(),
  secondaryTemplates: z.array(z.string().uuid()).optional(),
  formation: inquiryFormationEnum.optional(),
  status: inquiryStatusEnum.optional(),
  startingQuestions: z.array(z.string().max(1000)).max(20).optional(),
  compass: z.record(z.unknown()).optional(),
});

const createPivotEventSchema = z.object({
  inquiryId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
  fromGoal: z.string().max(1000).optional(),
  toGoal: z.string().max(1000).optional(),
});

// ─── Router ────────────────────────────────────────────────────────

export const inquiryRouter = createTRPCRouter({
  // ─── Pursuit endpoints ─────────────────────────────────────────

  createPursuit: protectedProcedure
    .input(createPursuitSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.createPursuit(input);
    }),

  getPursuit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createInquiryService(ctx.db);
      const pursuit = await service.getPursuit(input.id);
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      // Verify ownership via project
      const project = await ctx.db.project.findFirst({
        where: { id: pursuit.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      return pursuit;
    }),

  listPursuits: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.listPursuits(input.projectId);
    }),

  updatePursuit: protectedProcedure
    .input(updatePursuitSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via pursuit → project
      const pursuit = await ctx.db.pursuit.findFirst({
        where: { id: input.id, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      const { id, ...data } = input;
      const service = createInquiryService(ctx.db);
      return service.updatePursuit(id, data);
    }),

  deletePursuit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const pursuit = await ctx.db.pursuit.findFirst({
        where: { id: input.id, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.deletePursuit(input.id);
    }),

  // ─── Inquiry endpoints ─────────────────────────────────────────

  createInquiry: protectedProcedure
    .input(createInquirySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify pursuit ownership
      const pursuit = await ctx.db.pursuit.findFirst({
        where: { id: input.pursuitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.createInquiry(input);
    }),

  getInquiry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createInquiryService(ctx.db);
      const inquiry = await service.getInquiry(input.id);
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      // Verify ownership via pursuit → project
      const pursuit = await ctx.db.pursuit.findFirst({
        where: { id: inquiry.pursuitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      return inquiry;
    }),

  listInquiries: protectedProcedure
    .input(z.object({ pursuitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify pursuit ownership
      const pursuit = await ctx.db.pursuit.findFirst({
        where: { id: input.pursuitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pursuit not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.listInquiries(input.pursuitId);
    }),

  updateInquiry: protectedProcedure
    .input(updateInquirySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via inquiry → pursuit → project
      const inquiry = await ctx.db.inquiry.findFirst({
        where: { id: input.id, pursuit: { project: { userId: ctx.session.user.id! } } },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      const { id, ...data } = input;
      const service = createInquiryService(ctx.db);
      return service.updateInquiry(id, data);
    }),

  deleteInquiry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const inquiry = await ctx.db.inquiry.findFirst({
        where: { id: input.id, pursuit: { project: { userId: ctx.session.user.id! } } },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.deleteInquiry(input.id);
    }),

  // ─── Inquiry ↔ Context link endpoints ─────────────────────────

  addContextToInquiry: protectedProcedure
    .input(z.object({ inquiryId: z.string().uuid(), contextId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify inquiry ownership via pursuit → project
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.inquiryId,
          pursuit: { project: { userId: ctx.session.user.id! } },
        },
        select: { id: true, pursuit: { select: { projectId: true } } },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      // Verify context belongs to same project
      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, projectId: inquiry.pursuit.projectId },
        select: { id: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found in this project" });
      }
      return ctx.db.context.update({
        where: { id: input.contextId },
        data: { inquiryId: input.inquiryId },
        select: { id: true, name: true, inquiryId: true },
      });
    }),

  removeContextFromInquiry: protectedProcedure
    .input(z.object({ inquiryId: z.string().uuid(), contextId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify inquiry ownership via pursuit → project
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.inquiryId,
          pursuit: { project: { userId: ctx.session.user.id! } },
        },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      // Verify context is actually linked to this inquiry
      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, inquiryId: input.inquiryId },
        select: { id: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not linked to this inquiry" });
      }
      return ctx.db.context.update({
        where: { id: input.contextId },
        data: { inquiryId: null },
        select: { id: true, name: true, inquiryId: true },
      });
    }),

  // ─── Pivot Event endpoints ─────────────────────────────────────

  createPivotEvent: protectedProcedure
    .input(createPivotEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via inquiry → pursuit → project
      const inquiry = await ctx.db.inquiry.findFirst({
        where: { id: input.inquiryId, pursuit: { project: { userId: ctx.session.user.id! } } },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.createPivotEvent(input);
    }),

  listPivotEvents: protectedProcedure
    .input(z.object({ inquiryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const inquiry = await ctx.db.inquiry.findFirst({
        where: { id: input.inquiryId, pursuit: { project: { userId: ctx.session.user.id! } } },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found" });
      }
      const service = createInquiryService(ctx.db);
      return service.listPivotEvents(input.inquiryId);
    }),
});
