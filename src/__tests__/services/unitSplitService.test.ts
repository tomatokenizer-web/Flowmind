import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUnitSplitService } from "@/server/services/unitSplitService";
import { eventBus } from "@/server/events/eventBus";
import type { PrismaClient } from "@prisma/client";

const PARENT_ID = "parent-1";

interface FakeUnit {
  id: string;
  content: string;
  userId: string;
  projectId: string;
  unitType: string;
  lifecycle: string;
  originType: string;
  voice: string | null;
  primaryEpistemicAct: string | null;
  epistemicOrigin: string | null;
  applicabilityScope: string | null;
  temporalValidity: string | null;
  revisability: string | null;
  meta: Record<string, unknown> | null;
}

interface FakeRelation {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  subtype: string | null;
  strength: number;
  direction: string;
  layer: string | null;
}

function makeParent(overrides: Partial<FakeUnit> = {}): FakeUnit {
  return {
    id: PARENT_ID,
    content: "First half content. Second half content.",
    userId: "u1",
    projectId: "p1",
    unitType: "claim",
    lifecycle: "draft",
    originType: "direct_write",
    voice: "original",
    primaryEpistemicAct: null,
    epistemicOrigin: null,
    applicabilityScope: null,
    temporalValidity: null,
    revisability: null,
    meta: null,
    ...overrides,
  };
}

function createMockDb(
  parent: FakeUnit | null,
  relations: FakeRelation[] = [],
  assemblyCount = 0,
  perspectiveCount = 0,
) {
  const created: FakeUnit[] = [];
  const updatedMeta: Record<string, unknown> = {};
  let seq = 0;

  const txProxy = {
    unit: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `child-${++seq}`;
        const row: FakeUnit = { ...makeParent(), ...data, id };
        created.push(row);
        return row;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        if (where.id === PARENT_ID) {
          Object.assign(updatedMeta, data);
        }
        return { id: where.id, ...data };
      }),
    },
    relation: {
      findMany: vi.fn().mockResolvedValue(relations),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const rel = relations.find((r) => r.id === where.id);
        if (rel) Object.assign(rel, data);
        return rel;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: `new-rel-${++seq}`,
        ...data,
      })),
    },
    assemblyItem: {
      updateMany: vi.fn().mockResolvedValue({ count: assemblyCount }),
    },
    unitContext: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  };

  const db = {
    unit: {
      findUnique: vi.fn().mockResolvedValue(parent),
    },
    relation: {
      count: vi.fn().mockResolvedValue(relations.length),
    },
    assemblyItem: {
      count: vi.fn().mockResolvedValue(assemblyCount),
    },
    unitPerspective: {
      count: vi.fn().mockResolvedValue(perspectiveCount),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof txProxy) => Promise<unknown>) => {
      return fn(txProxy);
    }),
  } as unknown as PrismaClient;

  return { db, txProxy, created, updatedMeta };
}

describe("unitSplitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(eventBus, "emit").mockResolvedValue(undefined);
  });

  describe("preview", () => {
    it("returns both halves trimmed with counts", async () => {
      const { db } = createMockDb(makeParent(), [], 3, 2);
      const svc = createUnitSplitService(db);
      const preview = await svc.preview(PARENT_ID, 20);
      expect(preview.firstContent).toBe("First half content.");
      expect(preview.secondContent).toBe("Second half content.");
      expect(preview.assemblyItemsToUpdate).toBe(3);
      expect(preview.perspectivesToTransfer).toBe(2);
    });

    it("throws on out-of-range offset", async () => {
      const { db } = createMockDb(makeParent());
      const svc = createUnitSplitService(db);
      await expect(svc.preview(PARENT_ID, 0)).rejects.toThrow(/out of range/);
      await expect(svc.preview(PARENT_ID, 999)).rejects.toThrow(/out of range/);
    });

    it("throws when one half is whitespace-only", async () => {
      const { db } = createMockDb(
        makeParent({ content: "real content       " }),
      );
      const svc = createUnitSplitService(db);
      // offset 12 → "real content" | "       " — second half is all whitespace.
      await expect(svc.preview(PARENT_ID, 12)).rejects.toThrow(/non-whitespace/);
    });

    it("throws NOT_FOUND when source unit is missing", async () => {
      const { db } = createMockDb(null);
      const svc = createUnitSplitService(db);
      await expect(svc.preview(PARENT_ID, 5)).rejects.toThrow(/Source unit not found/);
    });
  });

  describe("split", () => {
    it("creates two child units, redirects relations to first, and archives parent", async () => {
      const relations: FakeRelation[] = [
        {
          id: "r1",
          sourceUnitId: PARENT_ID,
          targetUnitId: "other",
          type: "supports",
          subtype: null,
          strength: 0.7,
          direction: "one_way",
          layer: null,
        },
      ];
      const { db, txProxy, created, updatedMeta } = createMockDb(
        makeParent(),
        relations,
      );
      const svc = createUnitSplitService(db);
      const result = await svc.split({
        sourceUnitId: PARENT_ID,
        splitAtOffset: 20,
      });

      expect(result.parentUnitId).toBe(PARENT_ID);
      expect(result.firstChildId).toBe("child-1");
      expect(result.secondChildId).toBe("child-2");
      expect(created).toHaveLength(2);
      expect(txProxy.relation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "r1" },
          data: { sourceUnitId: "child-1" },
        }),
      );
      expect((updatedMeta as { lifecycle?: string }).lifecycle).toBe("archived");
    });

    it("relationPolicy=second routes relations to the second child", async () => {
      const relations: FakeRelation[] = [
        {
          id: "r1",
          sourceUnitId: "other",
          targetUnitId: PARENT_ID,
          type: "contradicts",
          subtype: null,
          strength: 0.5,
          direction: "one_way",
          layer: null,
        },
      ];
      const { db, txProxy } = createMockDb(makeParent(), relations);
      const svc = createUnitSplitService(db);
      await svc.split({
        sourceUnitId: PARENT_ID,
        splitAtOffset: 20,
        relationPolicy: "second",
      });
      expect(txProxy.relation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "r1" },
          data: { targetUnitId: "child-2" },
        }),
      );
    });

    it("relationPolicy=both clones every relation onto the second child", async () => {
      const relations: FakeRelation[] = [
        {
          id: "r1",
          sourceUnitId: PARENT_ID,
          targetUnitId: "other",
          type: "supports",
          subtype: null,
          strength: 0.7,
          direction: "one_way",
          layer: null,
        },
      ];
      const { db, txProxy } = createMockDb(makeParent(), relations);
      const svc = createUnitSplitService(db);
      await svc.split({
        sourceUnitId: PARENT_ID,
        splitAtOffset: 20,
        relationPolicy: "both",
      });
      // First child gets the updated existing relation, second child gets a clone.
      expect(txProxy.relation.create).toHaveBeenCalledTimes(1);
      const createCall = txProxy.relation.create.mock.calls[0]![0] as {
        data: { sourceUnitId?: string; targetUnitId?: string; type?: string };
      };
      expect(createCall.data.sourceUnitId).toBe("child-2");
      expect(createCall.data.type).toBe("supports");
    });

    it("relationPolicy=none leaves relations untouched", async () => {
      const relations: FakeRelation[] = [
        {
          id: "r1",
          sourceUnitId: PARENT_ID,
          targetUnitId: "other",
          type: "supports",
          subtype: null,
          strength: 0.7,
          direction: "one_way",
          layer: null,
        },
      ];
      const { db, txProxy } = createMockDb(makeParent(), relations);
      const svc = createUnitSplitService(db);
      await svc.split({
        sourceUnitId: PARENT_ID,
        splitAtOffset: 20,
        relationPolicy: "none",
      });
      expect(txProxy.relation.update).not.toHaveBeenCalled();
      expect(txProxy.relation.create).not.toHaveBeenCalled();
    });

    it("refuses to split an already-archived unit", async () => {
      const { db } = createMockDb(makeParent({ lifecycle: "archived" }));
      const svc = createUnitSplitService(db);
      await expect(
        svc.split({ sourceUnitId: PARENT_ID, splitAtOffset: 20 }),
      ).rejects.toThrow(/already-archived/);
    });

    it("emits a unit.split event after success", async () => {
      const { db } = createMockDb(makeParent());
      const svc = createUnitSplitService(db);
      await svc.split({
        sourceUnitId: PARENT_ID,
        splitAtOffset: 20,
        userId: "u1",
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.split",
          payload: expect.objectContaining({
            parentUnitId: PARENT_ID,
            userId: "u1",
          }),
        }),
      );
    });
  });
});
