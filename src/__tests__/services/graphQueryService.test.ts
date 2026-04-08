import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGraphQueryService } from "@/server/services/graphQueryService";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const CONTEXT_A = "c0000000-0000-0000-0000-000000000001";
const CONTEXT_B = "c0000000-0000-0000-0000-000000000002";
const UNIT_A = "u0000000-0000-0000-0000-000000000001";
const UNIT_B = "u0000000-0000-0000-0000-000000000002";
const UNIT_C = "u0000000-0000-0000-0000-000000000003";

// ─── Mock Data ──────────────────────────────────────────────────────

const mockUnits = [
  { id: UNIT_A, content: "Claim A", unitType: "claim", lifecycle: "confirmed", importance: 0.8, createdAt: new Date("2026-01-01") },
  { id: UNIT_B, content: "Evidence B", unitType: "evidence", lifecycle: "confirmed", importance: 0.5, createdAt: new Date("2026-01-15") },
  { id: UNIT_C, content: "Question C", unitType: "question", lifecycle: "draft", importance: 0.3, createdAt: new Date("2026-03-01") },
];

// ─── Mock DB ────────────────────────────────────────────────────────

function createMockDb() {
  return {
    unit: {
      findMany: vi.fn().mockResolvedValue(mockUnits),
      findFirst: vi.fn().mockResolvedValue(mockUnits[0]),
    },
    unitContext: {
      findMany: vi.fn().mockResolvedValue([
        { unitId: UNIT_A },
        { unitId: UNIT_B },
      ]),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue([
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, strength: 0.9 },
      ]),
    },
    context: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: {
      findFirst: vi.fn().mockResolvedValue({ id: PROJECT_ID }),
    },
  } as unknown as PrismaClient;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("graphQueryService", () => {
  let db: ReturnType<typeof createMockDb>;
  let svc: ReturnType<typeof createGraphQueryService>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    svc = createGraphQueryService(db as unknown as PrismaClient);
  });

  describe("resolveScope", () => {
    it("resolves single_context scope", async () => {
      const ids = await svc.resolveScope(PROJECT_ID, "single_context", { contextId: CONTEXT_A });

      expect(db.unitContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { contextId: CONTEXT_A } }),
      );
      expect(ids).toEqual([UNIT_A, UNIT_B]);
    });

    it("resolves global scope", async () => {
      const ids = await svc.resolveScope(PROJECT_ID, "global");

      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: PROJECT_ID } }),
      );
      expect(ids).toHaveLength(3);
    });

    it("returns empty for single_context without contextId", async () => {
      const ids = await svc.resolveScope(PROJECT_ID, "single_context");
      expect(ids).toEqual([]);
    });
  });

  describe("structural", () => {
    it("queries by unitType", async () => {
      const result = await svc.structural(PROJECT_ID, { unitType: "claim" });

      expect(result.method).toBe("structural");
      expect(result.trustLevel).toBe("deterministic");
      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitType: "claim" }),
        }),
      );
    });

    it("filters units with no incoming supports", async () => {
      await svc.structural(PROJECT_ID, { hasNoIncoming: "supports" });

      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relationsAsTarget: { none: { subtype: "supports" } },
          }),
        }),
      );
    });

    it("scopes to single context", async () => {
      await svc.structural(PROJECT_ID, {}, "single_context", { contextId: CONTEXT_A });

      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitContexts: { some: { contextId: CONTEXT_A } },
          }),
        }),
      );
    });
  });

  describe("attribute", () => {
    it("filters by multiple attributes", async () => {
      await svc.attribute(PROJECT_ID, {
        lifecycle: "confirmed",
        flagged: true,
        importanceMin: 0.5,
      });

      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lifecycle: "confirmed",
            flagged: true,
            importance: { gte: 0.5 },
          }),
        }),
      );
    });
  });

  describe("topological", () => {
    it("computes centrality scores", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockUnits) // resolveScope
        .mockResolvedValueOnce(mockUnits); // final fetch

      const result = await svc.topological(PROJECT_ID, { metric: "centrality" });

      expect(result.method).toBe("topological");
      expect(result.trustLevel).toBe("algorithmic");
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("finds orphan units", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockUnits); // resolveScope
      (db.relation.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]); // no relations
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockUnits); // final fetch

      const result = await svc.topological(PROJECT_ID, { metric: "orphans" });

      // All units are orphans when no relations exist
      expect(result.items).toHaveLength(3);
    });
  });

  describe("temporal", () => {
    it("queries by period", async () => {
      const result = await svc.temporal(PROJECT_ID, { period: "this_month" });

      expect(result.method).toBe("temporal");
      expect(result.trustLevel).toBe("deterministic");
      expect(db.unit.findMany).toHaveBeenCalled();
    });

    it("supports custom date range", async () => {
      const from = new Date("2026-01-01");
      const to = new Date("2026-02-01");

      await svc.temporal(PROJECT_ID, { period: "custom", dateFrom: from, dateTo: to });

      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        }),
      );
    });
  });

  describe("comparative", () => {
    it("finds units unique to each context and shared", async () => {
      (db.unitContext.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ unitId: UNIT_A }, { unitId: UNIT_B }]) // context A
        .mockResolvedValueOnce([{ unitId: UNIT_B }, { unitId: UNIT_C }]); // context B

      const result = await svc.comparative(PROJECT_ID, CONTEXT_A, CONTEXT_B);

      expect(result.method).toBe("comparative");
      // UNIT_A only in A, UNIT_C only in B, UNIT_B shared
      expect(result.onlyA).toHaveLength(1);
      expect(result.onlyA[0]!.id).toBe(UNIT_A);
      expect(result.onlyB).toHaveLength(1);
      expect(result.onlyB[0]!.id).toBe(UNIT_C);
      expect(result.shared).toHaveLength(1);
      expect(result.shared[0]!.id).toBe(UNIT_B);
    });
  });

  describe("aggregation", () => {
    it("groups by unitType", async () => {
      const result = await svc.aggregation(PROJECT_ID, "unitType");

      expect(result.method).toBe("aggregation");
      expect(result.data.groupBy).toBe("unitType");
      expect(result.data.total).toBe(3);
      expect((result.data.distribution as Record<string, number>)["claim"]).toBe(1);
      expect((result.data.distribution as Record<string, number>)["evidence"]).toBe(1);
      expect((result.data.distribution as Record<string, number>)["question"]).toBe(1);
    });
  });

  describe("pathQuery", () => {
    it("traverses descendants from a unit", async () => {
      (db.relation.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ sourceUnitId: UNIT_A, targetUnitId: UNIT_B }])
        .mockResolvedValueOnce([]); // no further

      const result = await svc.pathQuery(UNIT_A, "descendants", 3);

      expect(result.method).toBe("path");
      expect(result.trustLevel).toBe("deterministic");
    });

    it("returns empty for isolated unit", async () => {
      (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await svc.pathQuery(UNIT_A, "both", 3);

      expect(result.items).toHaveLength(0);
    });
  });

  describe("semantic", () => {
    it("finds similar units by word overlap", async () => {
      const similarUnits = [
        { id: UNIT_A, content: "Knowledge compounding is important for learning", unitType: "claim", lifecycle: "confirmed", importance: 0.8, createdAt: new Date() },
        { id: UNIT_B, content: "Learning requires knowledge retention", unitType: "evidence", lifecycle: "confirmed", importance: 0.5, createdAt: new Date() },
        { id: UNIT_C, content: "Unrelated topic about cooking", unitType: "question", lifecycle: "draft", importance: 0.3, createdAt: new Date() },
      ];

      (db.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(similarUnits[0]);
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(similarUnits.slice(1)); // candidates (excluding anchor)

      const result = await svc.semantic(PROJECT_ID, {
        anchorUnitId: UNIT_A,
        threshold: 0.05, // low threshold to catch word overlap
      });

      expect(result.method).toBe("semantic");
      expect(result.trustLevel).toBe("ai_interpreted");
      // UNIT_B shares "knowledge"/"learning" with anchor, UNIT_C doesn't
      expect(result.items.length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to text search", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([mockUnits[0]!]);

      const result = await svc.semantic(PROJECT_ID, { text: "Claim" });

      expect(result.method).toBe("semantic");
      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: { contains: "Claim", mode: "insensitive" },
          }),
        }),
      );
    });

    it("returns empty with no params", async () => {
      const result = await svc.semantic(PROJECT_ID, {});
      expect(result.items).toHaveLength(0);
    });
  });

  describe("composite", () => {
    it("chains structural and temporal queries", async () => {
      // First step: structural returns A and B
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockUnits[0]!, mockUnits[1]!]) // structural
        .mockResolvedValueOnce([mockUnits[0]!]) // temporal (only A matches)
        .mockResolvedValueOnce([mockUnits[0]!]); // final fetch

      const result = await svc.composite(PROJECT_ID, [
        { method: "structural", params: { unitType: "claim" } },
        { method: "temporal", params: { period: "this_month" } },
      ]);

      expect(result.method).toBe("composite");
      expect(result.trustLevel).toBe("algorithmic");
    });

    it("returns empty when intersection is empty", async () => {
      // Step 1 returns A, Step 2 returns B — no overlap
      (db.unit.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockUnits[0]!]) // structural: only A
        .mockResolvedValueOnce([mockUnits[1]!]); // temporal: only B

      const result = await svc.composite(PROJECT_ID, [
        { method: "structural", params: { unitType: "claim" } },
        { method: "temporal", params: { period: "today" } },
      ]);

      expect(result.items).toHaveLength(0);
    });
  });
});
