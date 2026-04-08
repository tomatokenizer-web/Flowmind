import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createDecisionJournalService } from "@/server/services/decisionJournalService";

const optionSchema = z.object({
  label: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  pros: z.array(z.string().max(500)).default([]),
  cons: z.array(z.string().max(500)).default([]),
});

async function verifyProject(
  db: Parameters<typeof createDecisionJournalService>[0],
  projectId: string,
  userId: string,
) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

export const decisionJournalRouter = createTRPCRouter({
  /** Create a new decision journal entry */
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      context: z.string().max(2000),
      options: z.array(optionSchema).min(1).max(10),
      projectId: z.string(),
      unitIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createDecisionJournalService(ctx.db);
      return svc.create({
        ...input,
        userId: ctx.session.user.id!,
      });
    }),

  /** List all decision journal entries for a project */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createDecisionJournalService(ctx.db);
      return svc.listByProject(input.projectId);
    }),

  /** Get a single entry by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const svc = createDecisionJournalService(ctx.db);
      const entry = await svc.getById(input.id);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found" });
      return entry;
    }),

  /** Record which option was chosen and why */
  recordDecision: protectedProcedure
    .input(z.object({
      id: z.string(),
      chosen: z.string().min(1).max(200),
      rationale: z.string().max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createDecisionJournalService(ctx.db);
      return svc.recordDecision(input.id, input.chosen, input.rationale);
    }),

  /** Record the outcome of a past decision */
  recordOutcome: protectedProcedure
    .input(z.object({
      id: z.string(),
      outcome: z.string().max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createDecisionJournalService(ctx.db);
      return svc.recordOutcome(input.id, input.outcome);
    }),

  /** Link additional units to a decision */
  linkUnits: protectedProcedure
    .input(z.object({
      id: z.string(),
      unitIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createDecisionJournalService(ctx.db);
      return svc.linkUnits(input.id, input.unitIds);
    }),

  /** Delete a decision journal entry */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = createDecisionJournalService(ctx.db);
      await svc.remove(input.id);
      return { success: true };
    }),
});
