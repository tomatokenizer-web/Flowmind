import { describe, it, expect, vi, beforeEach } from "vitest";
import { createViewService } from "@/server/services/viewService";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";

// ─── Mock Data ──────────────────────────────────────────────────────

const baseUnit = {
  id: "u1",
  content: "Test unit",
  unitType: "claim",
  lifecycle: "confirmed",
  importance: 0.5,
  createdAt: new Date("2026-01-15"),
  modifiedAt: new Date("2026-01-15"),
  _count: { relationsAsSource: 2, relationsAsTarget: 1 },
};

const orphanUnit = {
  ...baseUnit,
  id: "u2",
  content: "Orphan unit",
  _count: { relationsAsSource: 0, relationsAsTarget: 0 },
};

const questionUnit = {
  ...baseUnit,
  id: "u3",
  content: "Why is the sky blue?",
  unitType: "question",
  relationsAsTarget: [] as { id: string }[],
  _count: { relationsAsSource: 0, relationsAsTarget: 0 },
};

// ─── Mock DB ────────────────────────────────────────────────────────

function createMockDb() {
  return {
    unit: {
      findMany: vi.fn().mockResolvedValue([baseUnit, orphanUnit]),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: {
      findFirst: vi.fn().mockResolvedValue({ id: PROJECT_ID }),
    },
  } as unknown as PrismaClient;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("viewService", () => {
  let db: ReturnType<typeof createMockDb>;
  let service: ReturnType<typeof createViewService>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    service = createViewService(db as unknown as PrismaClient);
  });

  describe("orphanUnits", () => {
    it("returns only units with 0 relations", async () => {
      const result = await service.orphanUnits(PROJECT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("u2");
      expect(result[0]!.relationCount).toBe(0);
    });

    it("respects limit parameter", async () => {
      const manyOrphans = Array.from({ length: 10 }, (_, i) => ({
        ...orphanUnit,
        id: `orphan-${i}`,
      }));
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(manyOrphans);

      const result = await service.orphanUnits(PROJECT_ID, 3);

      expect(result).toHaveLength(3);
    });
  });

  describe("incubating", () => {
    it("returns recently created units with low relation count", async () => {
      const recentUnit = {
        ...baseUnit,
        id: "recent",
        createdAt: new Date(), // just created
        _count: { relationsAsSource: 1, relationsAsTarget: 0 },
      };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([recentUnit]);

      const result = await service.incubating(PROJECT_ID, 7);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("recent");
    });

    it("excludes units with many relations", async () => {
      const wellConnected = {
        ...baseUnit,
        id: "connected",
        createdAt: new Date(),
        _count: { relationsAsSource: 5, relationsAsTarget: 3 },
      };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([wellConnected]);

      const result = await service.incubating(PROJECT_ID, 7);

      expect(result).toHaveLength(0);
    });
  });

  describe("highSalience", () => {
    it("returns units ordered by importance", async () => {
      const highImp = { ...baseUnit, id: "hi", importance: 0.9 };
      const lowImp = { ...baseUnit, id: "lo", importance: 0.3 };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([highImp, lowImp]);

      const result = await service.highSalience(PROJECT_ID, 10);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("hi");
    });
  });

  describe("stale", () => {
    it("returns units not modified in N days", async () => {
      const staleUnit = {
        ...baseUnit,
        id: "stale",
        modifiedAt: new Date("2025-01-01"), // very old
      };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([staleUnit]);

      const result = await service.stale(PROJECT_ID, 30);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("stale");
    });
  });

  describe("conflicting", () => {
    it("returns units involved in contradicts relations", async () => {
      (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { sourceUnitId: "u1", targetUnitId: "u2" },
      ]);
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        baseUnit,
        { ...baseUnit, id: "u2" },
      ]);

      const result = await service.conflicting(PROJECT_ID);

      expect(result).toHaveLength(2);
    });

    it("returns empty when no conflicts exist", async () => {
      (db.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await service.conflicting(PROJECT_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe("unansweredQuestions", () => {
    it("returns questions without answers", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([questionUnit]);

      const result = await service.unansweredQuestions(PROJECT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.unitType).toBe("question");
    });

    it("excludes questions that have answers", async () => {
      const answeredQ = {
        ...questionUnit,
        relationsAsTarget: [{ id: "ans-1" }],
      };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([answeredQ]);

      const result = await service.unansweredQuestions(PROJECT_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe("getAttentionView", () => {
    it("dispatches to correct view by name", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([orphanUnit]);

      const result = await service.getAttentionView("orphan_units", PROJECT_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe("customView", () => {
    it("returns filtered results", async () => {
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([baseUnit]);

      const result = await service.customView(
        PROJECT_ID,
        { unitType: "claim" },
        "date",
        "desc",
        50,
      );

      expect(result).toHaveLength(1);
      expect(db.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitType: "claim" }),
        }),
      );
    });

    it("post-filters by relation count", async () => {
      const manyRels = { ...baseUnit, _count: { relationsAsSource: 5, relationsAsTarget: 5 } };
      const fewRels = { ...baseUnit, id: "few", _count: { relationsAsSource: 1, relationsAsTarget: 0 } };
      (db.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([manyRels, fewRels]);

      const result = await service.customView(
        PROJECT_ID,
        { minRelations: 5 },
        "date",
        "desc",
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.relationCount).toBeGreaterThanOrEqual(5);
    });
  });
});
