import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── DEC-2026-002 §8: Proactive Suppression cooldown ──────────────
//
// Kinds that represent unsolicited AI surfacing. When the user
// rejects one of these, the scheduler backs off for COOLDOWN_DAYS
// so the same nudge doesn't re-fire tomorrow.
const PROACTIVE_SURFACING_KINDS: ReadonlySet<string> = new Set([
  "reframe",
  "counter",
  "maturation",
  "rule_action",
  "compounding",
  "import_merge",
]);
const SUPPRESSION_COOLDOWN_DAYS = 7;

// ─── DEC-2026-002 §19: Compounding auto-disable thresholds ────────
//
// If the user rejects ≥80% of compounding proposals within the last
// COMPOUNDING_WINDOW_SIZE resolutions, the extractor auto-disables
// until the user explicitly re-enables it via settings.
const COMPOUNDING_WINDOW_SIZE = 10;
const COMPOUNDING_MIN_ACCEPTANCE = 0.2;

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
  /**
   * DEC-2026-002 §B.15.6 — monotonic evaluation tick used to make
   * rule-scan writes idempotent. Callers that repeatedly re-evaluate
   * the same unit stamp the same evalTick so duplicate surfacing can
   * be detected in bulk later.
   */
  evalTick?: number;
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
          evalTick: input.evalTick ?? null,
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
        select: {
          id: true,
          status: true,
          userId: true,
          kind: true,
          targetUnitId: true,
        },
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

      const updated = await db.proposal.update({
        where: { id },
        data: {
          status: input.status,
          resolvedAt: new Date(),
        },
      });

      // DEC-2026-002 §8 — rejection records a cooldown suppression so
      // the scheduler doesn't immediately re-surface the same nudge.
      if (
        input.status === "rejected" &&
        PROACTIVE_SURFACING_KINDS.has(existing.kind)
      ) {
        const expiresAt = new Date();
        expiresAt.setUTCDate(expiresAt.getUTCDate() + SUPPRESSION_COOLDOWN_DAYS);
        await db.proactiveSuppression.create({
          data: {
            userId,
            proposalKind: existing.kind,
            targetUnitId: existing.targetUnitId,
            reason: "user_rejected",
            expiresAt,
          },
        });
      }

      // DEC-2026-002 §19 — every resolved compounding proposal feeds
      // the rolling-window acceptance metric. When acceptance drops
      // below the minimum over a full window, compounding auto-disables.
      if (existing.kind === "compounding") {
        await recordCompoundingOutcome(db, userId, input.status);
      }

      return updated;
    },

    async expireStale(olderThanDays: number = 7, userId?: string) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);

      const result = await db.proposal.updateMany({
        where: {
          status: "pending",
          createdAt: { lt: cutoff },
          // IDOR fix: scope to user's proposals when userId provided
          ...(userId ? { userId } : {}),
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

    /**
     * Returns true if the compounding extractor has been auto-disabled
     * for this user (DEC-2026-002 §19). Re-enabled only via explicit
     * reactivation — a newer reactivatedAt supersedes disabledAt.
     */
    async isCompoundingDisabled(userId: string): Promise<boolean> {
      const row = await db.userInsightMetrics.findUnique({
        where: { userId },
        select: { compoundingDisabledAt: true, compoundingReactivatedAt: true },
      });
      if (!row?.compoundingDisabledAt) return false;
      if (!row.compoundingReactivatedAt) return true;
      return row.compoundingReactivatedAt < row.compoundingDisabledAt;
    },

    /**
     * Explicitly reactivate compounding for a user (§19 opt-in revival).
     */
    async reactivateCompounding(userId: string): Promise<void> {
      await db.userInsightMetrics.update({
        where: { userId },
        data: {
          compoundingReactivatedAt: new Date(),
          compoundingWindow: [],
        },
      });
    },
  };
}

export type ProposalService = ReturnType<typeof createProposalService>;

// ─── §19 compounding metrics helper (module-private) ──────────────

type CompoundingOutcome = "accepted" | "rejected";

async function recordCompoundingOutcome(
  db: PrismaClient,
  userId: string,
  outcome: CompoundingOutcome,
): Promise<void> {
  // Load current window (tolerant of missing row).
  const existing = await db.userInsightMetrics.findUnique({
    where: { userId },
    select: {
      compoundingWindow: true,
      compoundingAccepted: true,
      compoundingRejected: true,
      compoundingDisabledAt: true,
      compoundingReactivatedAt: true,
    },
  });

  const prevWindow = Array.isArray(existing?.compoundingWindow)
    ? (existing!.compoundingWindow as unknown[]).filter(
        (v): v is CompoundingOutcome => v === "accepted" || v === "rejected",
      )
    : [];
  const nextWindow = [...prevWindow, outcome].slice(-COMPOUNDING_WINDOW_SIZE);

  // Determine whether the window now warrants auto-disable.
  const reactivated =
    existing?.compoundingReactivatedAt &&
    existing?.compoundingDisabledAt &&
    existing.compoundingReactivatedAt >= existing.compoundingDisabledAt;
  const currentlyDisabled =
    !!existing?.compoundingDisabledAt && !reactivated;

  let nextDisabledAt: Date | null = existing?.compoundingDisabledAt ?? null;
  if (!currentlyDisabled && nextWindow.length >= COMPOUNDING_WINDOW_SIZE) {
    const accepted = nextWindow.filter((o) => o === "accepted").length;
    const rate = accepted / nextWindow.length;
    if (rate < COMPOUNDING_MIN_ACCEPTANCE) {
      nextDisabledAt = new Date();
    }
  }

  await db.userInsightMetrics.upsert({
    where: { userId },
    create: {
      userId,
      compoundingAccepted: outcome === "accepted" ? 1 : 0,
      compoundingRejected: outcome === "rejected" ? 1 : 0,
      compoundingWindow: nextWindow,
      compoundingDisabledAt: nextDisabledAt,
    },
    update: {
      compoundingAccepted:
        (existing?.compoundingAccepted ?? 0) + (outcome === "accepted" ? 1 : 0),
      compoundingRejected:
        (existing?.compoundingRejected ?? 0) + (outcome === "rejected" ? 1 : 0),
      compoundingWindow: nextWindow,
      compoundingDisabledAt: nextDisabledAt,
    },
  });
}
