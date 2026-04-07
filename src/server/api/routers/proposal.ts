import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createProposalService, PROPOSAL_KINDS, PROPOSAL_STATUSES } from "@/server/services/proposalService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const proposalKindEnum = z.enum([
  "reframe", "counter", "maturation", "rule_action",
  "import_merge", "compounding", "type_suggest", "relation_suggest",
]);

const proposalStatusEnum = z.enum(["pending", "accepted", "rejected", "expired"]);

const createProposalSchema = z.object({
  kind: proposalKindEnum,
  targetUnitId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  rationale: z.string().max(500).optional(),
});

const listProposalsSchema = z.object({
  targetUnitId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  kind: proposalKindEnum.optional(),
  status: proposalStatusEnum.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

const resolveProposalSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
});

// ─── Router ────────────────────────────────────────────────────────

export const proposalRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createProposalSchema)
    .mutation(async ({ ctx, input }) => {
      // If targetUnitId, verify ownership
      if (input.targetUnitId) {
        const unit = await ctx.db.unit.findFirst({
          where: { id: input.targetUnitId, project: { userId: ctx.session.user.id! } },
          select: { id: true },
        });
        if (!unit) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });
        }
      }
      const service = createProposalService(ctx.db);
      return service.create(input, ctx.session.user.id!);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createProposalService(ctx.db);
      const proposal = await service.getById(input.id);
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }
      // Verify ownership
      if (proposal.userId !== ctx.session.user.id!) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }
      return proposal;
    }),

  list: protectedProcedure
    .input(listProposalsSchema)
    .query(async ({ ctx, input }) => {
      const service = createProposalService(ctx.db);
      return service.list({ ...input, userId: ctx.session.user.id! });
    }),

  resolve: protectedProcedure
    .input(resolveProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createProposalService(ctx.db);
      return service.resolve(input.id, { status: input.status }, ctx.session.user.id!);
    }),

  countPending: protectedProcedure
    .query(async ({ ctx }) => {
      const service = createProposalService(ctx.db);
      return service.countPending(ctx.session.user.id!);
    }),

  expireStale: protectedProcedure
    .input(z.object({ olderThanDays: z.number().int().min(1).max(90).default(7) }))
    .mutation(async ({ ctx, input }) => {
      const service = createProposalService(ctx.db);
      return service.expireStale(input.olderThanDays);
    }),
});
