import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRuleProposalBridgeService,
  violationsToCandidates,
} from "@/server/services/ruleProposalBridgeService";
import type { PrismaClient } from "@prisma/client";

const USER_ID = "user-1";

function createMockDb() {
  return {
    proposal: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: `p${Math.random()}`,
        ...data,
      })),
    },
    unit: {
      findUnique: vi.fn().mockResolvedValue({ id: "u1" }),
    },
    // DEC-2026-002 §8 — scheduler queries this during schedule/preview.
    proactiveSuppression: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "s1" }),
    },
    userInsightMetrics: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "m1" }),
      update: vi.fn().mockResolvedValue({ id: "m1" }),
    },
  } as unknown as PrismaClient;
}

describe("ruleProposalBridgeService", () => {
  let db: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  describe("violationsToCandidates", () => {
    it("maps certainty-language violation to soften_certainty action", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "transparent_confidence",
            severity: "warning",
            message: 'Unit contains certainty language ("always") that may indicate overconfidence.',
            field: "content",
          },
        ],
        { targetUnitId: "u1" },
      );
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.kind).toBe("rule_action");
      expect((candidates[0]!.payload as { action: string }).action).toBe("soften_certainty");
      expect(candidates[0]!.targetUnitId).toBe("u1");
    });

    it("maps adversarial_balance violation to add_counterargument action", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "adversarial_balance",
            severity: "info",
            message: "Response contains only supporting evidence. Consider prompting for counterarguments.",
          },
        ],
        {},
      );
      expect(candidates).toHaveLength(1);
      expect((candidates[0]!.payload as { action: string }).action).toBe("add_counterargument");
    });

    it("maps no_fabrication info to add_evidence action", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "no_fabrication",
            severity: "info",
            message: "2 claim(s) found without supporting evidence.",
          },
        ],
        {},
      );
      expect(candidates).toHaveLength(1);
      expect((candidates[0]!.payload as { action: string }).action).toBe("add_evidence");
    });

    it("maps circular-reasoning violation to break_cycle action", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "no_hidden_assumptions",
            severity: "warning",
            message: "Circular reasoning detected: a support chain loops back to its origin.",
          },
        ],
        {},
      );
      expect(candidates).toHaveLength(1);
      expect((candidates[0]!.payload as { action: string }).action).toBe("break_cycle");
    });

    it("applies severity-based priority boost (error > warning > info)", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "transparent_confidence",
            severity: "error",
            message: "Missing confidence",
          },
          {
            rule: "transparent_confidence",
            severity: "warning",
            message: "Missing confidence",
          },
          {
            rule: "adversarial_balance",
            severity: "info",
            message: "Only supporting evidence",
          },
        ],
        {},
      );
      expect(candidates).toHaveLength(3);
      expect(candidates[0]!.priority).toBe(100);
      expect(candidates[1]!.priority).toBe(60);
      expect(candidates[2]!.priority).toBe(20);
    });

    it("skips unknown rules (returns empty array)", () => {
      const candidates = violationsToCandidates(
        [
          {
            rule: "some_unknown_rule",
            severity: "warning",
            message: "?",
          },
        ],
        {},
      );
      expect(candidates).toHaveLength(0);
    });
  });

  describe("scanAndPropose", () => {
    it("detects certainty language and surfaces a rule_action proposal", async () => {
      const svc = createRuleProposalBridgeService(db);
      const units = [
        { id: "u1", unitType: "claim", content: "This is definitely the right approach." },
      ];
      const result = await svc.scanAndPropose(USER_ID, units, [], {
        dailyBudget: 5,
      });

      expect(result.ruleResult.violations.length).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.surfaced).toBeGreaterThan(0);
      // The scheduler should have persisted at least one proposal
      expect((db.proposal.create as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });

    it("dry run does not create proposals", async () => {
      const svc = createRuleProposalBridgeService(db);
      const units = [
        { id: "u1", unitType: "claim", content: "This will always work." },
      ];
      const result = await svc.scanAndPropose(USER_ID, units, [], {
        dailyBudget: 5,
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.surfaced).toBeGreaterThan(0);
      expect(db.proposal.create).not.toHaveBeenCalled();
    });

    it("returns zero candidates when there are no violations", async () => {
      const svc = createRuleProposalBridgeService(db);
      const units = [
        { id: "u1", unitType: "claim", content: "It may rain tomorrow." },
        { id: "u2", unitType: "evidence", content: "Forecast shows 60% chance." },
      ];
      const relations = [
        { subtype: "supports", sourceId: "u2", targetId: "u1" },
      ];
      const result = await svc.scanAndPropose(USER_ID, units, relations, {
        dailyBudget: 5,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.surfaced).toBe(0);
      expect(result.deferred).toBe(0);
    });

    // ─── DEC-2026-002 §B.15.6: evalTick idempotency ──────────────

    it("stamps evalTick on created proposals", async () => {
      const svc = createRuleProposalBridgeService(db);
      await svc.scanAndPropose(
        USER_ID,
        [{ id: "u1", unitType: "claim", content: "This is definitely the right approach." }],
        [],
        { dailyBudget: 5 },
      );
      const createCall = (db.proposal.create as ReturnType<typeof vi.fn>)
        .mock.calls[0]?.[0];
      expect(createCall?.data?.evalTick).toBeTypeOf("number");
      expect(createCall?.data?.evalTick).toBeGreaterThan(0);
    });

    it("deduplicates candidates matching existing pending rule_action proposals", async () => {
      // Seed: pending rule_action already exists for u1 / transparent_confidence.
      // Our scan will find BOTH a transparent_confidence violation (pointing
      // at u1, → deduplicated) and other rule violations (→ still surfaced).
      (db.proposal.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          targetUnitId: "u1",
          payload: { rule: "transparent_confidence", action: "soften_certainty" },
        },
      ]);
      const svc = createRuleProposalBridgeService(db);
      const result = await svc.scanAndPropose(
        USER_ID,
        [{ id: "u1", unitType: "claim", content: "This is definitely the right approach." }],
        [],
        { dailyBudget: 10 },
      );
      expect(result.deduplicated).toBeGreaterThanOrEqual(1);
      // No transparent_confidence + u1 proposal should have been created.
      const createCalls = (db.proposal.create as ReturnType<typeof vi.fn>).mock.calls;
      for (const call of createCalls) {
        const data = call[0]?.data;
        const payload = data?.payload as { rule?: string } | undefined;
        if (payload?.rule === "transparent_confidence") {
          expect(data?.targetUnitId).not.toBe("u1");
        }
      }
    });

    it("attaches targetUnitId to certainty-language candidates", async () => {
      const svc = createRuleProposalBridgeService(db);
      const units = [
        { id: "ua", unitType: "claim", content: "It might work." },
        { id: "ub", unitType: "claim", content: "This is absolutely correct." },
      ];
      const result = await svc.scanAndPropose(USER_ID, units, [], {
        dailyBudget: 5,
        dryRun: true,
      });

      const certaintyCandidate = result.candidates.find(
        (c) => (c.payload as { action: string }).action === "soften_certainty",
      );
      expect(certaintyCandidate).toBeDefined();
      expect(certaintyCandidate!.targetUnitId).toBe("ub");
    });
  });
});
