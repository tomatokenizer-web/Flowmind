import type { PrismaClient } from "@prisma/client";
import { createProposalService, type ProposalKind } from "@/server/services/proposalService";

// ─── Constants ─────────────────────────────────────────────────────
//
// Per DEC-2026-002 §8: Proactive Surfacing is budget-capped.
// Each user gets a daily budget of cost units. Each proposal kind
// consumes a fixed cost. When the budget is exhausted for the day,
// lower-priority candidates are dropped until the next UTC midnight.

export const DEFAULT_DAILY_BUDGET = 5;

/**
 * Cost of surfacing a proposal of a given kind.
 * Higher-cost kinds are more disruptive to user attention and therefore
 * consume more of the daily budget.
 */
export const PROPOSAL_COST: Record<ProposalKind, number> = {
  reframe: 2,           // Rewriting a unit is disruptive
  counter: 2,           // Counterarguments demand attention
  maturation: 1,        // Quality nudges are lightweight
  rule_action: 1,       // Rule-driven suggestions are expected
  import_merge: 2,      // Merge decisions are semi-disruptive
  compounding: 2,       // Synthesis proposals are bigger asks
  type_suggest: 1,      // Type reclassification is small
  relation_suggest: 1,  // Relation hints are small
};

/**
 * Base priority per kind — higher = surfaced first when budget is tight.
 * Combined with per-candidate priority to produce final ordering.
 */
export const KIND_BASE_PRIORITY: Record<ProposalKind, number> = {
  counter: 90,          // Counterarguments are highest-value surfacing
  import_merge: 85,     // Duplicate detection is urgent
  compounding: 80,      // Cross-unit synthesis is high leverage
  reframe: 70,
  maturation: 60,
  rule_action: 55,
  type_suggest: 40,
  relation_suggest: 30,
};

// ─── Types ─────────────────────────────────────────────────────────

/**
 * Capture mode per DEC-2026-002 §B.15.1.
 *   - `review_queue` (default): surfaced proposals stay `pending` until
 *     the user accepts or rejects them. Safe default for new users.
 *   - `auto_apply`: surfaced proposals are created already `accepted`,
 *     bypassing the review step. Expert opt-in — still creates a
 *     Proposal row for audit/undo, but short-circuits the triage UI.
 */
export type CaptureMode = "review_queue" | "auto_apply";

export const DEFAULT_CAPTURE_MODE: CaptureMode = "review_queue";

export interface Candidate {
  kind: ProposalKind;
  targetUnitId?: string;
  contextId?: string;
  payload: Record<string, unknown>;
  rationale?: string;
  /** Additional priority boost from the producer (0-100). */
  priority?: number;
  /** DEC-2026-002 §B.15.6 — monotonic tick for idempotent rule scans. */
  evalTick?: number;
}

export interface ScheduleResult {
  surfaced: number;
  deferred: number;
  /**
   * Candidates filtered out by the §8 cooldown (rejected within the
   * last SUPPRESSION_COOLDOWN_DAYS). Does not consume budget and is
   * returned separately from `dropped` (which is budget-based).
   */
  suppressed: number;
  budgetRemaining: number;
  budgetTotal: number;
  dropped: Candidate[];
}

export interface BudgetStatus {
  date: string;            // YYYY-MM-DD (UTC)
  budgetTotal: number;
  budgetUsed: number;
  budgetRemaining: number;
  surfacedToday: number;
}

// ─── Utilities ─────────────────────────────────────────────────────

/**
 * Produce a UTC-midnight-anchored date key for budget accounting.
 * Ensures budgets reset at UTC midnight regardless of server timezone.
 */
function utcDateKey(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10); // YYYY-MM-DD
}

function utcDayStart(at: Date = new Date()): Date {
  const d = new Date(at);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function utcDayEnd(at: Date = new Date()): Date {
  const d = utcDayStart(at);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Compute the composite priority score for a candidate.
 * Higher = surface first.
 */
function scoreCandidate(c: Candidate): number {
  const base = KIND_BASE_PRIORITY[c.kind] ?? 0;
  const boost = Math.min(100, Math.max(0, c.priority ?? 0));
  // Weighted sum: base contributes 70%, boost 30%.
  return base * 0.7 + boost * 0.3;
}

// ─── Service ───────────────────────────────────────────────────────

/**
 * Proactive surfacing scheduler.
 *
 * Accepts a bag of candidate proposals, sorts them by priority, and
 * writes as many as the user's daily budget permits. The rest are
 * deferred (dropped silently — callers can resubmit next day).
 *
 * This is the single entry point for any subsystem that wants to
 * automatically create Proposals without direct user action.
 * Direct user actions (accept/reject) bypass this scheduler.
 */
export function createProactiveSchedulerService(db: PrismaClient) {
  const proposalService = createProposalService(db);

  /**
   * Count how many cost units a user has already consumed today.
   * We count proposals created by the scheduler by looking at the
   * kind and createdAt — all proactive-created proposals are
   * distinguishable by their creation time within the day window.
   *
   * Since Proposal rows have no creator discriminator, we attribute
   * ALL pending/accepted proposals from the user today to the budget.
   * This is conservative: it prevents runaway surfacing if a user has
   * also created proposals through other means.
   */
  async function getBudgetStatus(
    userId: string,
    dailyBudget: number = DEFAULT_DAILY_BUDGET,
  ): Promise<BudgetStatus> {
    const dayStart = utcDayStart();
    const dayEnd = utcDayEnd();

    const todaysProposals = await db.proposal.findMany({
      where: {
        userId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      select: { kind: true },
    });

    const budgetUsed = todaysProposals.reduce((sum, p) => {
      const cost = PROPOSAL_COST[p.kind as ProposalKind] ?? 1;
      return sum + cost;
    }, 0);

    return {
      date: utcDateKey(),
      budgetTotal: dailyBudget,
      budgetUsed,
      budgetRemaining: Math.max(0, dailyBudget - budgetUsed),
      surfacedToday: todaysProposals.length,
    };
  }

  /**
   * Schedule a batch of candidate proposals.
   *
   * Pipeline:
   *   1. Fetch current budget status.
   *   2. Sort candidates by composite priority (desc).
   *   3. Greedily surface until budget is exhausted.
   *   4. Return counts and any dropped candidates for caller introspection.
   */
  async function schedule(
    userId: string,
    candidates: Candidate[],
    opts: { dailyBudget?: number; captureMode?: CaptureMode } = {},
  ): Promise<ScheduleResult> {
    const dailyBudget = opts.dailyBudget ?? DEFAULT_DAILY_BUDGET;
    const captureMode = opts.captureMode ?? DEFAULT_CAPTURE_MODE;
    const status = await getBudgetStatus(userId, dailyBudget);

    let budgetRemaining = status.budgetRemaining;

    // DEC-2026-002 §8 — drop any candidate whose (kind, targetUnitId)
    // matches an unexpired suppression row.
    const active = await db.proactiveSuppression.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { proposalKind: true, targetUnitId: true },
    });
    const suppressionKeys = new Set<string>();
    for (const s of active) {
      // A NULL targetUnitId suppresses the whole kind.
      suppressionKeys.add(`${s.proposalKind}::${s.targetUnitId ?? "*"}`);
    }
    const isSuppressed = (c: Candidate) => {
      if (suppressionKeys.has(`${c.kind}::*`)) return true;
      if (c.targetUnitId && suppressionKeys.has(`${c.kind}::${c.targetUnitId}`)) {
        return true;
      }
      return false;
    };

    // Sort by priority (stable) — highest first.
    const sorted = [...candidates]
      .map((c, idx) => ({ c, idx, score: scoreCandidate(c) }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => x.c);

    const surfaced: Candidate[] = [];
    const dropped: Candidate[] = [];
    let suppressedCount = 0;

    for (const candidate of sorted) {
      if (isSuppressed(candidate)) {
        suppressedCount++;
        continue;
      }
      const cost = PROPOSAL_COST[candidate.kind] ?? 1;
      if (cost <= budgetRemaining) {
        const created = await proposalService.create(
          {
            kind: candidate.kind,
            targetUnitId: candidate.targetUnitId,
            contextId: candidate.contextId,
            payload: candidate.payload,
            rationale: candidate.rationale,
            evalTick: candidate.evalTick,
          },
          userId,
        );
        // DEC-2026-002 §B.15.1 — auto_apply captureMode short-circuits
        // the review queue by immediately resolving the proposal as
        // accepted. The row still exists for audit/undo purposes.
        if (captureMode === "auto_apply") {
          await proposalService.resolve(
            created.id,
            { status: "accepted" },
            userId,
          );
        }
        budgetRemaining -= cost;
        surfaced.push(candidate);
      } else {
        dropped.push(candidate);
      }
    }

    return {
      surfaced: surfaced.length,
      deferred: dropped.length,
      suppressed: suppressedCount,
      budgetRemaining,
      budgetTotal: dailyBudget,
      dropped,
    };
  }

  /**
   * Simulate scheduling without actually creating proposals.
   * Useful for UI previews and debugging.
   */
  async function preview(
    userId: string,
    candidates: Candidate[],
    opts: { dailyBudget?: number } = {},
  ): Promise<{
    wouldSurface: Candidate[];
    wouldDefer: Candidate[];
    wouldSuppress: Candidate[];
    budgetStatus: BudgetStatus;
  }> {
    const dailyBudget = opts.dailyBudget ?? DEFAULT_DAILY_BUDGET;
    const status = await getBudgetStatus(userId, dailyBudget);

    const active = await db.proactiveSuppression.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { proposalKind: true, targetUnitId: true },
    });
    const suppressionKeys = new Set<string>();
    for (const s of active) {
      suppressionKeys.add(`${s.proposalKind}::${s.targetUnitId ?? "*"}`);
    }

    let remaining = status.budgetRemaining;
    const sorted = [...candidates].sort(
      (a, b) => scoreCandidate(b) - scoreCandidate(a),
    );
    const wouldSurface: Candidate[] = [];
    const wouldDefer: Candidate[] = [];
    const wouldSuppress: Candidate[] = [];

    for (const c of sorted) {
      const suppressed =
        suppressionKeys.has(`${c.kind}::*`) ||
        (c.targetUnitId !== undefined &&
          suppressionKeys.has(`${c.kind}::${c.targetUnitId}`));
      if (suppressed) {
        wouldSuppress.push(c);
        continue;
      }
      const cost = PROPOSAL_COST[c.kind] ?? 1;
      if (cost <= remaining) {
        wouldSurface.push(c);
        remaining -= cost;
      } else {
        wouldDefer.push(c);
      }
    }

    return {
      wouldSurface,
      wouldDefer,
      wouldSuppress,
      budgetStatus: status,
    };
  }

  return {
    schedule,
    preview,
    getBudgetStatus,
    scoreCandidate,
  };
}

export type ProactiveSchedulerService = ReturnType<
  typeof createProactiveSchedulerService
>;
