import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCompassService } from "@/server/services/compassService";
import type { PrismaClient } from "@prisma/client";

// ─── Fixtures ──────────────────────────────────────────────────────
const PROJECT_ID = "p0000000-0000-0000-0000-000000000001";
const C1 = "c0000000-0000-0000-0000-000000000001";

// 3 claims, 1 evidence, 1 counterargument, 1 definition, 1 question
const UNITS = [
  { id: "u1", content: "Claim about X", unitType: "claim", lifecycle: "draft" },
  { id: "u2", content: "Claim about Y", unitType: "claim", lifecycle: "confirmed" },
  { id: "u3", content: "Claim about Z", unitType: "claim", lifecycle: "pending" },
  { id: "u4", content: "Evidence supporting X", unitType: "evidence", lifecycle: "confirmed" },
  { id: "u5", content: "Counter to X", unitType: "counterargument", lifecycle: "draft" },
  { id: "u6", content: "Definition of X", unitType: "definition", lifecycle: "confirmed" },
  { id: "u7", content: "Is X always true?", unitType: "question", lifecycle: "pending" },
  { id: "u8", content: "X assumes Y", unitType: "assumption", lifecycle: "draft" },
];

// u4 --supports--> u1, u5 --contradicts--> u1, u6 --elaboration--> u1 (defines),
// u8 --depends_on--> u1 (assumption surfaced for u1)
// u7 has no answer → unresolved
const RELATIONS = [
  { sourceUnitId: "u4", targetUnitId: "u1", subtype: "supports" },
  { sourceUnitId: "u5", targetUnitId: "u1", subtype: "contradicts" },
  { sourceUnitId: "u6", targetUnitId: "u1", subtype: "elaboration" },
  { sourceUnitId: "u8", targetUnitId: "u1", subtype: "depends_on" },
];

function createMockDb() {
  return {
    unit: {
      findMany: vi.fn().mockResolvedValue(UNITS),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue(RELATIONS),
    },
  } as unknown as PrismaClient;
}

// ─── Tests ─────────────────────────────────────────────────────────
describe("compassService", () => {
  let db: ReturnType<typeof createMockDb>;
  let svc: ReturnType<typeof createCompassService>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    svc = createCompassService(db as unknown as PrismaClient);
  });

  it("returns parallel structure + depth scores, never a merged overall", async () => {
    const result = await svc.calculateCompass(PROJECT_ID, C1);

    // DEC §4: no `overall` field — two independent scores
    expect(result).toHaveProperty("structure");
    expect(result).toHaveProperty("depth");
    expect(result).not.toHaveProperty("overall");

    expect(result.structure.score).toBeGreaterThanOrEqual(0);
    expect(result.structure.score).toBeLessThanOrEqual(100);
    expect(result.depth.score).toBeGreaterThanOrEqual(0);
    expect(result.depth.score).toBeLessThanOrEqual(100);
  });

  it("tags each dimension with its category", async () => {
    const result = await svc.calculateCompass(PROJECT_ID, C1);

    const byName = Object.fromEntries(result.dimensions.map((d) => [d.name, d]));

    expect(byName.evidence_coverage!.category).toBe("structure");
    expect(byName.counter_argument_coverage!.category).toBe("structure");
    expect(byName.definition_coverage!.category).toBe("structure");
    expect(byName.scope_balance!.category).toBe("structure");
    expect(byName.assumption_surfacing!.category).toBe("depth");
    expect(byName.question_resolution!.category).toBe("depth");
  });

  it("partitions dimensions into structure and depth buckets with no overlap", async () => {
    const result = await svc.calculateCompass(PROJECT_ID, C1);

    const structureNames = result.structure.dimensions.map((d) => d.name).sort();
    const depthNames = result.depth.dimensions.map((d) => d.name).sort();

    expect(structureNames).toEqual([
      "counter_argument_coverage",
      "definition_coverage",
      "evidence_coverage",
      "scope_balance",
    ]);
    expect(depthNames).toEqual(["assumption_surfacing", "question_resolution"]);

    // Disjoint
    for (const n of structureNames) {
      expect(depthNames).not.toContain(n);
    }
  });

  it("returns empty-graph category scores when there are no units", async () => {
    (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await svc.calculateCompass(PROJECT_ID);

    // With no units, ratio-based dims default to 100, but scope_balance
    // uses entropy which is 0 on an empty set. Depth has no entropy dim,
    // so it sits at 100; structure is dragged down by the 0.15-weighted
    // scope contribution.
    expect(result.depth.score).toBe(100);
    expect(result.structure.score).toBeGreaterThan(80);
    expect(result.structure.score).toBeLessThanOrEqual(100);
    expect(result.dimensions.length).toBe(6);
  });

  it("only surfaces claims without supporting evidence as gaps", async () => {
    const result = await svc.calculateCompass(PROJECT_ID, C1);

    const evidence = result.dimensions.find((d) => d.name === "evidence_coverage")!;
    // u1 has supports, u2 and u3 do not → 1/3
    expect(evidence.numerator).toBe(1);
    expect(evidence.denominator).toBe(3);
    expect(evidence.gaps.length).toBeGreaterThan(0);
  });
});
