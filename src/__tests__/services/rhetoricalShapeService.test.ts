import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRhetoricalShapeService } from "@/server/services/rhetoricalShapeService";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────
const PROJECT_ID = "p0000000-0000-0000-0000-000000000001";
const CONTEXT_ID = "c0000000-0000-0000-0000-000000000001";
const U1 = "u0000000-0000-0000-0000-000000000001";
const U2 = "u0000000-0000-0000-0000-000000000002";
const U3 = "u0000000-0000-0000-0000-000000000003";
const U4 = "u0000000-0000-0000-0000-000000000004";
const U5 = "u0000000-0000-0000-0000-000000000005";

// ─── Mock DB ────────────────────────────────────────────────────────
function createMockDb() {
  return {
    unitContext: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaClient;
}

// ─── Tests ──────────────────────────────────────────────────────────
describe("rhetoricalShapeService", () => {
  let db: ReturnType<typeof createMockDb>;
  let svc: ReturnType<typeof createRhetoricalShapeService>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    svc = createRhetoricalShapeService(db as unknown as PrismaClient);
  });

  it("returns mesh for empty context", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    expect(result.dominant.shape).toBe("mesh");
    expect(result.dominant.confidence).toBe(1);
    expect(result.unitCount).toBe(0);
    expect(result.relationCount).toBe(0);
  });

  it("returns mesh for units with no relations", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    expect(result.dominant.shape).toBe("mesh");
    expect(result.unitCount).toBe(3);
    expect(result.relationCount).toBe(0);
  });

  it("detects convergent shape (N → 1)", async () => {
    // U1, U2, U3, U4 all point to U5
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 }, { unitId: U4 }, { unitId: U5 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U2, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U3, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U4, targetUnitId: U5, subtype: "supports" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    expect(result.dominant.shape).toBe("convergent");
    expect(result.dominant.confidence).toBeGreaterThan(0);
    expect(result.dominant.metrics.maxInDegree).toBe(4);
  });

  it("detects divergent shape (1 → N)", async () => {
    // U1 points to U2, U3, U4, U5
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 }, { unitId: U4 }, { unitId: U5 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U2, subtype: "elaboration" },
      { sourceUnitId: U1, targetUnitId: U3, subtype: "elaboration" },
      { sourceUnitId: U1, targetUnitId: U4, subtype: "elaboration" },
      { sourceUnitId: U1, targetUnitId: U5, subtype: "elaboration" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    // Divergent and convergent can both register, but divergent should be dominant
    const divergent = [result.dominant, ...result.secondary].find((d) => d.shape === "divergent");
    expect(divergent).toBeDefined();
    expect(divergent!.confidence).toBeGreaterThan(0);
    expect(divergent!.metrics.maxOutDegree).toBe(4);
  });

  it("detects dialectical shape (contradicts without synthesis)", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U2, subtype: "contradicts" },
      { sourceUnitId: U2, targetUnitId: U3, subtype: "rebuts" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    const dialectical = [result.dominant, ...result.secondary].find((d) => d.shape === "dialectical");
    expect(dialectical).toBeDefined();
    expect(dialectical!.confidence).toBeGreaterThan(0);
    expect(dialectical!.metrics.unresolvedPairs).toBe(2);
  });

  it("detects cyclic shape (A → B → C → A)", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U2, subtype: "supports" },
      { sourceUnitId: U2, targetUnitId: U3, subtype: "supports" },
      { sourceUnitId: U3, targetUnitId: U1, subtype: "supports" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    const cyclic = [result.dominant, ...result.secondary].find((d) => d.shape === "cyclic");
    expect(cyclic).toBeDefined();
    expect(cyclic!.confidence).toBeGreaterThan(0);
    expect(cyclic!.metrics.cycleCount).toBeGreaterThanOrEqual(1);
  });

  it("detects reframing shape (revises/supersedes edges)", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U2, targetUnitId: U1, subtype: "revises" },
      { sourceUnitId: U3, targetUnitId: U2, subtype: "supersedes" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    const reframing = [result.dominant, ...result.secondary].find((d) => d.shape === "reframing");
    expect(reframing).toBeDefined();
    expect(reframing!.metrics.reframingPairs).toBe(2);
  });

  it("detects parallel shape (shared parent, no inter-edges)", async () => {
    // U1 → U2, U1 → U3, U1 → U4 (no edges between U2, U3, U4)
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 }, { unitId: U4 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U2, subtype: "elaboration" },
      { sourceUnitId: U1, targetUnitId: U3, subtype: "elaboration" },
      { sourceUnitId: U1, targetUnitId: U4, subtype: "elaboration" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    const parallel = [result.dominant, ...result.secondary].find((d) => d.shape === "parallel");
    expect(parallel).toBeDefined();
    expect(parallel!.metrics.largestParallelGroup).toBe(3);
  });

  it("returns secondary shapes sorted by confidence", async () => {
    // Mix of patterns: convergent + dialectical
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 }, { unitId: U3 }, { unitId: U4 }, { unitId: U5 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U2, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U3, targetUnitId: U5, subtype: "supports" },
      { sourceUnitId: U1, targetUnitId: U4, subtype: "contradicts" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    // Should have at least dominant + some secondary shapes
    expect(result.dominant).toBeDefined();
    expect(result.dominant.confidence).toBeGreaterThan(0);
    // Secondary should be sorted descending by confidence
    for (let i = 1; i < result.secondary.length; i++) {
      expect(result.secondary[i - 1]!.confidence).toBeGreaterThanOrEqual(
        result.secondary[i]!.confidence,
      );
    }
  });

  it("reports unit and relation counts", async () => {
    (db.unitContext.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { unitId: U1 }, { unitId: U2 },
    ]);
    (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { sourceUnitId: U1, targetUnitId: U2, subtype: "supports" },
    ]);

    const result = await svc.detectShape(PROJECT_ID, CONTEXT_ID);

    expect(result.unitCount).toBe(2);
    expect(result.relationCount).toBe(1);
  });
});
