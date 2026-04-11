import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEmbeddingDualReadService } from "@/server/services/embeddingDualReadService";
import type { PrismaClient } from "@prisma/client";

interface Registry {
  name: string;
  provider: string;
  dimension: number;
  scope: string;
  isActive: boolean;
}

function createMockDb(
  initialRegistry: Registry[] = [],
  unitsByModel: Record<string, number> = {},
) {
  const registry = new Map<string, Registry>(
    initialRegistry.map((r) => [r.name, { ...r }]),
  );
  const units = { ...unitsByModel };

  return {
    embeddingModelRegistry: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        return registry.get(where.name) ?? null;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        registry.set(data.name, { ...data });
        return { id: `m-${data.name}`, ...data };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const row = registry.get(where.name);
        if (!row) throw new Error("not found");
        const next = { ...row, ...data };
        registry.set(where.name, next);
        return next;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        const rows = Array.from(registry.values());
        if (where?.isActive === true) return rows.filter((r) => r.isActive);
        return rows;
      }),
    },
    unit: {
      count: vi.fn().mockImplementation(async ({ where }) => {
        return units[where.embeddingModel] ?? 0;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where }) => {
        const count = units[where.embeddingModel] ?? 0;
        // Move them into "pending" bucket (null embeddingModel).
        units.__pending = (units.__pending ?? 0) + count;
        delete units[where.embeddingModel];
        return { count };
      }),
      groupBy: vi.fn().mockImplementation(async () => {
        const rows: Array<{ embeddingModel: string | null; _count: { _all: number } }> = [];
        for (const [key, n] of Object.entries(units)) {
          rows.push({
            embeddingModel: key === "__pending" ? null : key,
            _count: { _all: n },
          });
        }
        return rows;
      }),
    },
  } as unknown as PrismaClient;
}

describe("embeddingDualReadService", () => {
  let db: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerNewModel", () => {
    it("creates a new active model row when none exists", async () => {
      db = createMockDb([]);
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.registerNewModel({
        name: "voyage-3",
        provider: "voyage",
        dimension: 1024,
      });
      expect(result.created).toBe(true);
      expect(db.embeddingModelRegistry.create).toHaveBeenCalledTimes(1);
    });

    it("reactivates an existing inactive row instead of duplicating", async () => {
      db = createMockDb([
        {
          name: "voyage-3",
          provider: "voyage",
          dimension: 1024,
          scope: "general",
          isActive: false,
        },
      ]);
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.registerNewModel({
        name: "voyage-3",
        provider: "voyage",
        dimension: 1024,
      });
      expect(result.created).toBe(false);
      expect(db.embeddingModelRegistry.create).not.toHaveBeenCalled();
      expect(db.embeddingModelRegistry.update).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when the model is already active", async () => {
      db = createMockDb([
        {
          name: "voyage-3",
          provider: "voyage",
          dimension: 1024,
          scope: "general",
          isActive: true,
        },
      ]);
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.registerNewModel({
        name: "voyage-3",
        provider: "voyage",
        dimension: 1024,
      });
      expect(result.created).toBe(false);
      expect(db.embeddingModelRegistry.create).not.toHaveBeenCalled();
      expect(db.embeddingModelRegistry.update).not.toHaveBeenCalled();
    });
  });

  describe("deactivateModel", () => {
    it("flips isActive and reports remaining unit count", async () => {
      db = createMockDb(
        [
          {
            name: "old-model",
            provider: "openai",
            dimension: 1536,
            scope: "general",
            isActive: true,
          },
        ],
        { "old-model": 42 },
      );
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.deactivateModel("old-model");
      expect(result.deactivated).toBe(true);
      expect(result.remaining).toBe(42);
    });

    it("returns deactivated=false for an unknown model", async () => {
      db = createMockDb([]);
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.deactivateModel("ghost");
      expect(result.deactivated).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("markForReembed", () => {
    it("nulls embeddingModel on every matching unit and reports the count", async () => {
      db = createMockDb([], { "old-model": 7 });
      const svc = createEmbeddingDualReadService(db);
      const result = await svc.markForReembed("old-model");
      expect(result.queued).toBe(7);
      expect(db.unit.updateMany).toHaveBeenCalledWith({
        where: { embeddingModel: "old-model" },
        data: { embeddingModel: null },
      });
    });
  });

  describe("getStatus", () => {
    it("marks dual-read active when more than one model is active", async () => {
      db = createMockDb(
        [
          {
            name: "A",
            provider: "openai",
            dimension: 1536,
            scope: "general",
            isActive: true,
          },
          {
            name: "B",
            provider: "voyage",
            dimension: 1024,
            scope: "general",
            isActive: true,
          },
        ],
        { A: 10, B: 3, __pending: 5 },
      );
      const svc = createEmbeddingDualReadService(db);
      const status = await svc.getStatus();
      expect(status.dualReadActive).toBe(true);
      expect(status.activeModels).toHaveLength(2);
      expect(status.unitsPendingReembed).toBe(5);
      const a = status.activeModels.find((m) => m.name === "A")!;
      expect(a.unitsEmbedded).toBe(10);
    });

    it("reports dual-read inactive when only one model is active", async () => {
      db = createMockDb(
        [
          {
            name: "A",
            provider: "openai",
            dimension: 1536,
            scope: "general",
            isActive: true,
          },
        ],
        { A: 10 },
      );
      const svc = createEmbeddingDualReadService(db);
      const status = await svc.getStatus();
      expect(status.dualReadActive).toBe(false);
      expect(status.activeModels).toHaveLength(1);
      expect(status.unitsPendingReembed).toBe(0);
    });
  });
});
