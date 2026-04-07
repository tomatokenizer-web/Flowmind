import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRelationService } from "@/server/services/relationService";
import { eventBus } from "@/server/events/eventBus";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const USER_ID = "user-abc";
const SOURCE_UNIT_ID = "b0000000-0000-0000-0000-000000000001";
const TARGET_UNIT_ID = "b0000000-0000-0000-0000-000000000002";
const RELATION_ID = "r0000000-0000-0000-0000-000000000001";
const PERSPECTIVE_ID = "p0000000-0000-0000-0000-000000000001";

// ─── Mock Data ──────────────────────────────────────────────────────

function makeUnit(id: string, lifecycle: "confirmed" | "draft" | "pending" = "confirmed") {
  return {
    id,
    content: `Unit ${id}`,
    lifecycle,
    unitType: "claim" as const,
  };
}

const mockRelation = {
  id: RELATION_ID,
  sourceUnitId: SOURCE_UNIT_ID,
  targetUnitId: TARGET_UNIT_ID,
  perspectiveId: null,
  type: "supports",
  strength: 0.5,
  direction: "one_way" as const,
  purpose: [],
  isCustom: false,
  customName: null,
  isLoopback: false,
  createdAt: new Date("2026-03-18T00:00:00Z"),
  sourceUnit: { id: SOURCE_UNIT_ID, content: "Source", unitType: "claim" },
  targetUnit: { id: TARGET_UNIT_ID, content: "Target", unitType: "claim" },
};

// ─── Mock Builder ───────────────────────────────────────────────────

function buildService(overrides: Partial<Record<string, unknown>> = {}) {
  const mockDb = {
    unit: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === SOURCE_UNIT_ID) return Promise.resolve(makeUnit(SOURCE_UNIT_ID));
        if (where.id === TARGET_UNIT_ID) return Promise.resolve(makeUnit(TARGET_UNIT_ID));
        return Promise.resolve(null);
      }),
    },
    relation: {
      create: vi.fn().mockResolvedValue(mockRelation),
      findUnique: vi.fn().mockResolvedValue(mockRelation),
      findMany: vi.fn().mockResolvedValue([mockRelation]),
      update: vi.fn().mockResolvedValue(mockRelation),
      delete: vi.fn().mockResolvedValue(mockRelation),
    },
    ...overrides,
  } as unknown as PrismaClient;

  const service = createRelationService(mockDb);
  return { service, mockDb };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("relationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  // ── create ─────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a relation between two confirmed units", async () => {
      const { service, mockDb } = buildService();

      const result = await service.create(
        {
          sourceUnitId: SOURCE_UNIT_ID,
          targetUnitId: TARGET_UNIT_ID,
          type: "supports",
        },
        USER_ID,
      );

      expect(result).toBeDefined();
      expect((mockDb.relation.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceUnitId: SOURCE_UNIT_ID,
            targetUnitId: TARGET_UNIT_ID,
            type: "supports",
          }),
        }),
      );
    });

    it("throws NOT_FOUND when source unit does not exist", async () => {
      const { service, mockDb } = buildService();
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(
        service.create(
          { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
          USER_ID,
        ),
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when target unit does not exist", async () => {
      const { service, mockDb } = buildService();
      // First call returns source, second returns null for target
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(makeUnit(SOURCE_UNIT_ID))
        .mockResolvedValueOnce(null);

      await expect(
        service.create(
          { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
          USER_ID,
        ),
      ).rejects.toThrow(TRPCError);
    });

    it("allows creating relation when source unit is in draft lifecycle", async () => {
      const { service, mockDb } = buildService();
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(makeUnit(SOURCE_UNIT_ID, "draft"))
        .mockResolvedValueOnce(makeUnit(TARGET_UNIT_ID));

      const result = await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(RELATION_ID);
    });

    it("allows creating relation when target unit is in draft lifecycle", async () => {
      const { service, mockDb } = buildService();
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(makeUnit(SOURCE_UNIT_ID))
        .mockResolvedValueOnce(makeUnit(TARGET_UNIT_ID, "draft"));

      const result = await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(RELATION_ID);
    });

    it("sets isLoopback=true when source and target are the same unit", async () => {
      const { service, mockDb } = buildService();
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(makeUnit(SOURCE_UNIT_ID))
        .mockResolvedValueOnce(makeUnit(SOURCE_UNIT_ID));

      await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: SOURCE_UNIT_ID, type: "self_ref" },
        USER_ID,
      );

      expect((mockDb.relation.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isLoopback: true }),
        }),
      );
    });

    it("defaults strength to 0.5 when not provided", async () => {
      const { service, mockDb } = buildService();

      await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect((mockDb.relation.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ strength: 0.5 }),
        }),
      );
    });

    it("defaults direction to one_way when not provided", async () => {
      const { service, mockDb } = buildService();

      await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect((mockDb.relation.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ direction: "one_way" }),
        }),
      );
    });

    it("emits relation.created event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("relation.created", handler);

      await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "relation.created" }),
      );
    });

    it("emits unit.updated events for both source and target units", async () => {
      const { service } = buildService();
      const updatedIds: string[] = [];
      eventBus.on("unit.updated", (e) => {
        updatedIds.push((e as { payload: { unitId: string } }).payload.unitId);
      });

      await service.create(
        { sourceUnitId: SOURCE_UNIT_ID, targetUnitId: TARGET_UNIT_ID, type: "supports" },
        USER_ID,
      );

      expect(updatedIds).toContain(SOURCE_UNIT_ID);
      expect(updatedIds).toContain(TARGET_UNIT_ID);
    });

    it("accepts optional perspectiveId", async () => {
      const { service, mockDb } = buildService();

      await service.create(
        {
          sourceUnitId: SOURCE_UNIT_ID,
          targetUnitId: TARGET_UNIT_ID,
          type: "supports",
          perspectiveId: PERSPECTIVE_ID,
        },
        USER_ID,
      );

      expect((mockDb.relation.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ perspectiveId: PERSPECTIVE_ID }),
        }),
      );
    });
  });

  // ── delete ─────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing relation", async () => {
      const { service, mockDb } = buildService();

      await service.delete(RELATION_ID, USER_ID);

      expect((mockDb.relation.delete as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
        where: { id: RELATION_ID },
      });
    });

    it("throws NOT_FOUND when relation does not exist", async () => {
      const { service, mockDb } = buildService();
      (mockDb.relation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(service.delete(RELATION_ID, USER_ID)).rejects.toThrow(TRPCError);
    });

    it("emits relation.deleted event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("relation.deleted", handler);

      await service.delete(RELATION_ID, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "relation.deleted",
          payload: expect.objectContaining({ relationId: RELATION_ID }),
        }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("updates a relation's strength", async () => {
      const { service, mockDb } = buildService();

      await service.update(RELATION_ID, { strength: 0.9 }, USER_ID);

      expect((mockDb.relation.update as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: RELATION_ID },
          data: expect.objectContaining({ strength: 0.9 }),
        }),
      );
    });

    it("throws NOT_FOUND when relation does not exist", async () => {
      const { service, mockDb } = buildService();
      (mockDb.relation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(
        service.update(RELATION_ID, { strength: 0.9 }, USER_ID),
      ).rejects.toThrow(TRPCError);
    });

    it("emits relation.updated event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("relation.updated", handler);

      await service.update(RELATION_ID, { type: "refutes" }, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "relation.updated" }),
      );
    });
  });

  // ── listByUnit ─────────────────────────────────────────────────

  describe("listByUnit", () => {
    it("returns relations where unit is source or target", async () => {
      const { service, mockDb } = buildService();

      await service.listByUnit(SOURCE_UNIT_ID);

      expect((mockDb.relation.findMany as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { sourceUnitId: SOURCE_UNIT_ID },
              { targetUnitId: SOURCE_UNIT_ID },
            ],
          }),
        }),
      );
    });

    it("applies contextId filter via perspective when provided", async () => {
      const { service, mockDb } = buildService();
      const ctxId = "c0000000-0000-0000-0000-000000000001";

      await service.listByUnit(SOURCE_UNIT_ID, ctxId);

      expect((mockDb.relation.findMany as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            perspective: { contextId: ctxId },
          }),
        }),
      );
    });
  });

  // ── neighborsByDepth ───────────────────────────────────────────

  describe("neighborsByDepth", () => {
    it("returns relations and layers for a hub unit", async () => {
      const { service, mockDb } = buildService();
      (mockDb.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: RELATION_ID,
          sourceUnitId: SOURCE_UNIT_ID,
          targetUnitId: TARGET_UNIT_ID,
          type: "supports",
          strength: 0.8,
          direction: "one_way",
        },
      ]);

      const result = await service.neighborsByDepth(SOURCE_UNIT_ID, 1);

      expect(result.relations).toHaveLength(1);
      expect(result.layers[0]).toContain(SOURCE_UNIT_ID);
      expect(result.layers[1]).toContain(TARGET_UNIT_ID);
    });

    it("clamps depth to a maximum of 3", async () => {
      const { service, mockDb } = buildService();
      (mockDb.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.neighborsByDepth(SOURCE_UNIT_ID, 99);

      // With no relations, findMany is called at most 3 times (clamped depth=3)
      expect((mockDb.relation.findMany as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(3);
    });

    it("does not return duplicate relations when traversing multiple hops", async () => {
      const { service, mockDb } = buildService();
      const sameRelation = {
        id: RELATION_ID,
        sourceUnitId: SOURCE_UNIT_ID,
        targetUnitId: TARGET_UNIT_ID,
        type: "supports",
        strength: 0.8,
        direction: "one_way",
      };
      // Return the same relation on both depth traversals
      (mockDb.relation.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([sameRelation])
        .mockResolvedValueOnce([sameRelation]);

      const result = await service.neighborsByDepth(SOURCE_UNIT_ID, 2);

      // Deduplication should ensure the same relation appears only once
      expect(result.relations.filter((r) => r.id === RELATION_ID)).toHaveLength(1);
    });
  });
});
