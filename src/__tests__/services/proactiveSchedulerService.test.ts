import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProactiveSchedulerService,
  DEFAULT_DAILY_BUDGET,
  PROPOSAL_COST,
  KIND_BASE_PRIORITY,
} from "@/server/services/proactiveSchedulerService";
import type { PrismaClient } from "@prisma/client";

const USER_ID = "user-1";

function createMockDb(
  existingProposals: Array<{ kind: string }> = [],
  suppressions: Array<{ proposalKind: string; targetUnitId: string | null }> = [],
) {
  const created = new Map<string, { id: string; userId: string; status: string }>();
  let seq = 0;
  return {
    proposal: {
      findMany: vi.fn().mockResolvedValue(existingProposals),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `p${++seq}`;
        const row = { id, ...data, status: data.status ?? "pending", userId: data.userId };
        created.set(id, row);
        return row;
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        const row = created.get(where.id);
        return row ?? null;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const row = created.get(where.id);
        if (!row) return null;
        const updated = { ...row, ...data };
        created.set(where.id, updated);
        return updated;
      }),
    },
    unit: {
      findUnique: vi.fn().mockResolvedValue({ id: "u1" }),
    },
    // DEC-2026-002 §8 — scheduler queries this on every schedule/preview
    // call to apply cooldown filtering. Tests default to empty.
    proactiveSuppression: {
      findMany: vi.fn().mockResolvedValue(suppressions),
      create: vi.fn().mockResolvedValue({ id: "s1" }),
    },
    // DEC-2026-002 §19 — proposal.resolve touches this when a
    // compounding proposal is accepted/rejected (not exercised here).
    userInsightMetrics: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "m1" }),
      update: vi.fn().mockResolvedValue({ id: "m1" }),
    },
  } as unknown as PrismaClient;
}

describe("proactiveSchedulerService", () => {
  let db: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("surfaces candidates up to the daily budget", async () => {
    const svc = createProactiveSchedulerService(db);
    const candidates = [
      { kind: "counter" as const, payload: { a: 1 } },      // cost 2
      { kind: "maturation" as const, payload: { b: 2 } },    // cost 1
      { kind: "type_suggest" as const, payload: { c: 3 } },  // cost 1
      { kind: "relation_suggest" as const, payload: { d: 4 } }, // cost 1
    ];

    const result = await svc.schedule(USER_ID, candidates, {
      dailyBudget: 5,
    });

    // Total cost: 2 + 1 + 1 + 1 = 5 → all fit
    expect(result.surfaced).toBe(4);
    expect(result.deferred).toBe(0);
    expect(result.budgetRemaining).toBe(0);
  });

  it("defers candidates once budget is exhausted", async () => {
    const svc = createProactiveSchedulerService(db);
    const candidates = [
      { kind: "counter" as const, payload: {} },        // cost 2
      { kind: "counter" as const, payload: {} },        // cost 2
      { kind: "counter" as const, payload: {} },        // cost 2 → would exceed
    ];

    const result = await svc.schedule(USER_ID, candidates, {
      dailyBudget: 5,
    });

    // 2 + 2 = 4 spent, next counter costs 2 > 1 remaining → deferred
    expect(result.surfaced).toBe(2);
    expect(result.deferred).toBe(1);
    expect(result.budgetRemaining).toBe(1);
  });

  it("prioritises higher-base-priority kinds when budget is tight", async () => {
    const svc = createProactiveSchedulerService(db);
    // Budget 2 → can afford one cost-2 OR two cost-1 candidates
    const candidates = [
      { kind: "relation_suggest" as const, payload: { name: "low" } }, // cost 1, prio 30
      { kind: "counter" as const, payload: { name: "high" } },          // cost 2, prio 90
    ];

    const result = await svc.schedule(USER_ID, candidates, {
      dailyBudget: 2,
    });

    // counter (prio 90) surfaces first, costs 2, budget exhausted → relation_suggest deferred
    expect(result.surfaced).toBe(1);
    expect(result.deferred).toBe(1);
    const createCalls = (db.proposal.create as ReturnType<typeof vi.fn>).mock.calls;
    expect(createCalls[0]?.[0]?.data?.kind).toBe("counter");
  });

  it("respects per-candidate priority boost for tie-breaking", async () => {
    const svc = createProactiveSchedulerService(db);
    const low = svc.scoreCandidate({
      kind: "maturation",
      payload: {},
      priority: 0,
    });
    const high = svc.scoreCandidate({
      kind: "maturation",
      payload: {},
      priority: 100,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("computes budget remaining from today's existing proposals", async () => {
    const existing = [
      { kind: "counter" },    // 2
      { kind: "maturation" }, // 1
    ];
    db = createMockDb(existing);
    const svc = createProactiveSchedulerService(db);

    const status = await svc.getBudgetStatus(USER_ID, 5);

    expect(status.budgetTotal).toBe(5);
    expect(status.budgetUsed).toBe(3);
    expect(status.budgetRemaining).toBe(2);
    expect(status.surfacedToday).toBe(2);
  });

  it("preview does not create proposals", async () => {
    const svc = createProactiveSchedulerService(db);
    const candidates = [
      { kind: "counter" as const, payload: {} },
      { kind: "maturation" as const, payload: {} },
    ];

    const preview = await svc.preview(USER_ID, candidates, { dailyBudget: 5 });

    expect(preview.wouldSurface).toHaveLength(2);
    expect(preview.wouldDefer).toHaveLength(0);
    expect(db.proposal.create).not.toHaveBeenCalled();
  });

  it("default daily budget is 5 cost units per DEC-002 §8", () => {
    expect(DEFAULT_DAILY_BUDGET).toBe(5);
  });

  it("all 8 proposal kinds have a cost", () => {
    const kinds = [
      "reframe", "counter", "maturation", "rule_action",
      "import_merge", "compounding", "type_suggest", "relation_suggest",
    ] as const;
    for (const k of kinds) {
      expect(PROPOSAL_COST[k]).toBeGreaterThan(0);
      expect(KIND_BASE_PRIORITY[k]).toBeGreaterThan(0);
    }
  });

  it("review_queue captureMode leaves proposals pending (no update call)", async () => {
    const svc = createProactiveSchedulerService(db);
    await svc.schedule(
      USER_ID,
      [{ kind: "maturation" as const, payload: {} }],
      { dailyBudget: 5, captureMode: "review_queue" },
    );
    expect(db.proposal.create).toHaveBeenCalledTimes(1);
    expect(db.proposal.update).not.toHaveBeenCalled();
  });

  it("auto_apply captureMode resolves surfaced proposals as accepted", async () => {
    const svc = createProactiveSchedulerService(db);
    await svc.schedule(
      USER_ID,
      [{ kind: "maturation" as const, payload: {} }],
      { dailyBudget: 5, captureMode: "auto_apply" },
    );
    expect(db.proposal.create).toHaveBeenCalledTimes(1);
    expect(db.proposal.update).toHaveBeenCalledTimes(1);
    const updateCall = (db.proposal.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateCall?.data?.status).toBe("accepted");
  });

  it("defaults to review_queue captureMode when not specified", async () => {
    const svc = createProactiveSchedulerService(db);
    await svc.schedule(
      USER_ID,
      [{ kind: "maturation" as const, payload: {} }],
      { dailyBudget: 5 },
    );
    expect(db.proposal.update).not.toHaveBeenCalled();
  });

  // ─── DEC-2026-002 §8: suppression / cooldown filtering ──────────

  it("filters out candidates matching an active suppression row", async () => {
    // Seed a targeted suppression: reframe + u1 is in cooldown.
    const suppressedDb = createMockDb([], [
      { proposalKind: "reframe", targetUnitId: "u1" },
    ]);
    const svc = createProactiveSchedulerService(suppressedDb);
    const result = await svc.schedule(
      USER_ID,
      [
        { kind: "reframe" as const, targetUnitId: "u1", payload: {} },  // should be suppressed
        { kind: "reframe" as const, targetUnitId: "u2", payload: {} },  // should pass
      ],
      { dailyBudget: 10 },
    );
    expect(result.suppressed).toBe(1);
    expect(result.surfaced).toBe(1);
    expect(suppressedDb.proposal.create).toHaveBeenCalledTimes(1);
    const createdCall = (suppressedDb.proposal.create as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0];
    expect(createdCall?.data?.targetUnitId).toBe("u2");
  });

  it("wildcard suppression (null targetUnitId) suppresses the entire kind", async () => {
    const suppressedDb = createMockDb([], [
      { proposalKind: "counter", targetUnitId: null },
    ]);
    const svc = createProactiveSchedulerService(suppressedDb);
    const result = await svc.schedule(
      USER_ID,
      [
        { kind: "counter" as const, targetUnitId: "u1", payload: {} },
        { kind: "counter" as const, targetUnitId: "u2", payload: {} },
        { kind: "maturation" as const, targetUnitId: "u3", payload: {} }, // different kind — passes
      ],
      { dailyBudget: 10 },
    );
    expect(result.suppressed).toBe(2);
    expect(result.surfaced).toBe(1);
  });
});
