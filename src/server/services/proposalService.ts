import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── M.2 Proposal Kinds ────────────────────────────────────────────
//
// 8 kinds unified AI write path:
//   reframe         — Suggest alternative framing of a unit
//   counter         — Generate counterargument
//   maturation      — Suggest improvements to raise quality
//   rule_action     — Propose action from rule/pattern detection
//   import_merge    — Suggest merging similar units
//   compounding     — Suggest synthesis of multiple units
//   type_suggest    — Suggest type reclassification
//   relation_suggest — Suggest new relation between units

export const PROPOSAL_KINDS = [
  "reframe", "counter", "maturation", "rule_action",
  "import_merge", "compounding", "type_suggest", "relation_suggest",
] as const;

export type ProposalKind = typeof PROPOSAL_KINDS[number];

export const PROPOSAL_STATUSES = ["pending", "accepted", "rejected", "expired"] as const;
export type ProposalStatus = typeof PROPOSAL_STATUSES[number];

// ─── Input Types ───────────────────────────────────────────────────

export interface CreateProposalInput {
  kind: ProposalKind;
  targetUnitId?: string;
  contextId?: string;
  payload: Record<string, unknown>;
  rationale?: string;
}

export interface ResolveProposalInput {
  status: "accepted" | "rejected";
}

export interface ListProposalsInput {
  userId?: string;
  targetUnitId?: string;
  contextId?: string;
  kind?: ProposalKind;
  status?: ProposalStatus;
  limit?: number;
  cursor?: string;
}

// ─── Service ───────────────────────────────────────────────────────

export function createProposalService(db: PrismaClient) {
  return {
    async create(input: CreateProposalInput, userId: string) {
      // If targetUnitId is set, verify it exists
      if (input.targetUnitId) {
        const unit = await db.unit.findUnique({
          where: { id: input.targetUnitId },
          select: { id: true },
        });
        if (!unit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target unit not found",
          });
        }
      }

      return db.proposal.create({
        data: {
          kind: input.kind,
          targetUnitId: input.targetUnitId ?? null,
          contextId: input.contextId ?? null,
          userId,
          status: "pending",
          payload: input.payload as Prisma.InputJsonValue,
          rationale: input.rationale ?? null,
        },
      });
    },

    async getById(id: string) {
      return db.proposal.findUnique({ where: { id } });
    },

    async list(input: ListProposalsInput) {
      const take = input.limit ?? 20;
      const where: Prisma.ProposalWhereInput = {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.targetUnitId ? { targetUnitId: input.targetUnitId } : {}),
        ...(input.contextId ? { contextId: input.contextId } : {}),
        ...(input.kind ? { kind: input.kind } : {}),
        ...(input.status ? { status: input.status } : {}),
      };

      const args: Prisma.ProposalFindManyArgs = {
        where,
        orderBy: { createdAt: "desc" },
        take: take + 1,
      };

      if (input.cursor) {
        args.cursor = { id: input.cursor };
        args.skip = 1;
      }

      const items = await db.proposal.findMany(args);
      const hasMore = items.length > take;
      if (hasMore) items.pop();

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    },

    async resolve(id: string, input: ResolveProposalInput, userId: string) {
      const existing = await db.proposal.findUnique({
        where: { id },
        select: { id: true, status: true, userId: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      if (existing.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your proposal" });
      }

      if (existing.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Proposal already ${existing.status}`,
        });
      }

      return db.proposal.update({
        where: { id },
        data: {
          status: input.status,
          resolvedAt: new Date(),
        },
      });
    },

    async expireStale(olderThanDays: number = 7) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);

      const result = await db.proposal.updateMany({
        where: {
          status: "pending",
          createdAt: { lt: cutoff },
        },
        data: {
          status: "expired",
          resolvedAt: new Date(),
        },
      });

      return { expiredCount: result.count };
    },

    async countPending(userId: string) {
      return db.proposal.count({
        where: { userId, status: "pending" },
      });
    },
  };
}

export type ProposalService = ReturnType<typeof createProposalService>;
