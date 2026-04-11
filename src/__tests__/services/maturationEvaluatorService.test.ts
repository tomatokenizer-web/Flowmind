import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMaturationEvaluatorService } from "@/server/services/maturationEvaluatorService";
import type { PrismaClient } from "@prisma/client";

const PROJECT_ID = "proj-1";

interface FakeUnit {
  id: string;
  content: string;
  unitType: string;
  modifiedAt: Date;
}
interface FakeRelation {
  sourceUnitId: string;
  targetUnitId: string;
  subtype: string | null;
}

function createMockDb(units: FakeUnit[], relations: FakeRelation[]) {
  return {
    unit: {
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        if (where.unitType === "claim") {
          return units.filter((u) => u.unitType === "claim");
        }
        if (where.unitType === "definition") {
          return units.filter((u) => u.unitType === "definition");
        }
        return units;
      }),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue(relations),
    },
  } as unknown as PrismaClient;
}

describe("maturationEvaluatorService", () => {
  let now: Date;

  beforeEach(() => {
    now = new Date();
  });

  it("returns empty when project has no claims", async () => {
    const db = createMockDb([], []);
    const svc = createMaturationEvaluatorService(db);
    const result = await svc.evaluateProject(PROJECT_ID);
    expect(result.breakdowns).toHaveLength(0);
    expect(result.candidates).toHaveLength(0);
  });

  it("emits a candidate for a claim with no supporting evidence", async () => {
    const units: FakeUnit[] = [
      {
        id: "u1",
        content: "The project will likely succeed.",
        unitType: "claim",
        modifiedAt: now,
      },
    ];
    const db = createMockDb(units, []);
    const svc = createMaturationEvaluatorService(db);
    const result = await svc.evaluateProject(PROJECT_ID);

    expect(result.candidates).toHaveLength(1);
    const c = result.candidates[0]!;
    expect(c.kind).toBe("maturation");
    expect(c.targetUnitId).toBe("u1");
    // Evidence and counter both zero — one of them is weakest.
    expect(["evidence", "counter"]).toContain(c.payload.weakestDimension);
  });

  it("flags absolutist language via the hedging dimension", async () => {
    const units: FakeUnit[] = [
      {
        id: "u1",
        // 4 absolutist phrases → hedging score = max(0, 1 - 0.8) = 0.2
        content: "This will always work and never fail definitely absolutely.",
        unitType: "claim",
        modifiedAt: now,
      },
    ];
    const db = createMockDb(units, []);
    const svc = createMaturationEvaluatorService(db);
    const result = await svc.evaluateProject(PROJECT_ID);

    expect(result.breakdowns[0]!.dimensions.hedging).toBeLessThan(0.5);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it("scores below threshold -> candidate; above threshold -> no candidate", async () => {
    const recent = now;
    const units: FakeUnit[] = [
      // A claim with 2+ supports, 1 counter, soft language, recent → mature
      {
        id: "mature",
        content: "It may rain tomorrow.",
        unitType: "claim",
        modifiedAt: recent,
      },
      {
        id: "support1",
        content: "Forecast 60%.",
        unitType: "evidence",
        modifiedAt: recent,
      },
      {
        id: "support2",
        content: "Pressure dropping.",
        unitType: "evidence",
        modifiedAt: recent,
      },
      {
        id: "counter1",
        content: "High pressure moving in.",
        unitType: "evidence",
        modifiedAt: recent,
      },
    ];
    const relations: FakeRelation[] = [
      { sourceUnitId: "support1", targetUnitId: "mature", subtype: "supports" },
      { sourceUnitId: "support2", targetUnitId: "mature", subtype: "supports" },
      { sourceUnitId: "counter1", targetUnitId: "mature", subtype: "contradicts" },
    ];
    const db = createMockDb(units, relations);
    const svc = createMaturationEvaluatorService(db);
    const result = await svc.evaluateProject(PROJECT_ID);

    const matureBreakdown = result.breakdowns.find((b) => b.unitId === "mature")!;
    expect(matureBreakdown.score).toBeGreaterThanOrEqual(0.65);
    // No candidate because score >= threshold.
    expect(result.candidates.find((c) => c.targetUnitId === "mature")).toBeUndefined();
  });

  it("candidates are sorted by priority (weakest claims first) and capped by limit", async () => {
    const base = now;
    const units: FakeUnit[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `u${i}`,
      content: "a claim with no grounding or evidence",
      unitType: "claim",
      modifiedAt: base,
    }));
    const db = createMockDb(units, []);
    const svc = createMaturationEvaluatorService(db);
    const result = await svc.evaluateProject(PROJECT_ID, { limit: 3 });

    expect(result.candidates.length).toBe(3);
    // Sorted descending by priority
    for (let i = 0; i < result.candidates.length - 1; i++) {
      const a = result.candidates[i]!.priority ?? 0;
      const b = result.candidates[i + 1]!.priority ?? 0;
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it("threshold override affects candidate emission", async () => {
    const units: FakeUnit[] = [
      {
        id: "u1",
        content: "Some claim",
        unitType: "claim",
        modifiedAt: now,
      },
    ];
    const db = createMockDb(units, []);
    const svc = createMaturationEvaluatorService(db);

    // Very low threshold → no candidates even though dimensions are weak.
    const loose = await svc.evaluateProject(PROJECT_ID, { threshold: 0.0 });
    expect(loose.candidates).toHaveLength(0);

    // Very high threshold → every claim emits a candidate.
    const strict = await svc.evaluateProject(PROJECT_ID, { threshold: 1.0 });
    expect(strict.candidates.length).toBeGreaterThan(0);
  });
});
