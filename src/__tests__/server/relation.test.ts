import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/server/events/eventBus", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
    removeAllListeners: vi.fn(),
  },
}));
vi.mock("@/server/services/cycleDetectionService", () => ({
  updateLoopbacksForContext: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/services/thoughtRankService", () => ({
  createThoughtRankService: vi.fn().mockReturnValue({
    updateThoughtRankForContext: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { appRouter } from "@/server/api/root";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Constants ─────────────────────────────────────────────────────
const TEST_USER_ID = "user-123";
const TEST_SOURCE_UNIT_ID = "b0000000-0000-0000-0000-000000000001";
const TEST_TARGET_UNIT_ID = "b0000000-0000-0000-0000-000000000002";
const TEST_RELATION_ID = "c0000000-0000-0000-0000-000000000001";

const mockUnit = {
  id: TEST_SOURCE_UNIT_ID,
  userId: TEST_USER_ID,
  unitType: "claim",
  lifecycle: "confirmed",
};

const mockRelation = {
  id: TEST_RELATION_ID,
  sourceUnitId: TEST_SOURCE_UNIT_ID,
  targetUnitId: TEST_TARGET_UNIT_ID,
  type: "supports",
  strength: 0.5,
  direction: "one_way",
  purpose: [],
  isLoopback: false,
  perspectiveId: null,
  isCustom: false,
  customName: null,
  sourceUnit: { id: TEST_SOURCE_UNIT_ID, content: "Source thought", unitType: "claim" },
  targetUnit: { id: TEST_TARGET_UNIT_ID, content: "Target thought", unitType: "claim" },
};

// ─── Mock Prisma ────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    unit: {
      findFirst: vi.fn().mockResolvedValue(mockUnit),
      findUnique: vi.fn().mockResolvedValue(mockUnit),
      findMany: vi.fn().mockResolvedValue([mockUnit]),
    },
    relation: {
      create: vi.fn().mockResolvedValue(mockRelation),
      findFirst: vi.fn().mockResolvedValue(mockRelation),
      findUnique: vi.fn().mockResolvedValue(mockRelation),
      findMany: vi.fn().mockResolvedValue([mockRelation]),
      update: vi.fn().mockResolvedValue(mockRelation),
      delete: vi.fn().mockResolvedValue(mockRelation),
    },
    unitPerspective: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClient;
}

// ─── Helpers ───────────────────────────────────────────────────────

function createTestCaller(db: PrismaClient) {
  return appRouter.createCaller({
    db,
    session: {
      user: { id: TEST_USER_ID, name: "Test", email: "test@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    headers: new Headers(),
  } as Parameters<typeof appRouter.createCaller>[0]);
}

function createUnauthCaller(db: PrismaClient) {
  return appRouter.createCaller({
    db,
    session: null,
    headers: new Headers(),
  } as Parameters<typeof appRouter.createCaller>[0]);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("relation router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("authentication", () => {
    it("rejects unauthenticated relation.create", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.relation.create({
          sourceUnitId: TEST_SOURCE_UNIT_ID,
          targetUnitId: TEST_TARGET_UNIT_ID,
          type: "supports",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated relation.listByUnit", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.relation.listByUnit({ unitId: TEST_SOURCE_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("relation.create", () => {
    it("creates a relation between two units", async () => {
      const result = await caller.relation.create({
        sourceUnitId: TEST_SOURCE_UNIT_ID,
        targetUnitId: TEST_TARGET_UNIT_ID,
        type: "supports",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_RELATION_ID);
    });

    it("throws NOT_FOUND when source unit not owned by user", async () => {
      // First findFirst call (source unit) returns null
      (mockDb.unit.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUnit);

      await expect(
        caller.relation.create({
          sourceUnitId: TEST_SOURCE_UNIT_ID,
          targetUnitId: TEST_TARGET_UNIT_ID,
          type: "supports",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when target unit not owned by user", async () => {
      (mockDb.unit.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce(null);

      await expect(
        caller.relation.create({
          sourceUnitId: TEST_SOURCE_UNIT_ID,
          targetUnitId: TEST_TARGET_UNIT_ID,
          type: "supports",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid uuid for sourceUnitId", async () => {
      await expect(
        caller.relation.create({
          sourceUnitId: "not-a-uuid",
          targetUnitId: TEST_TARGET_UNIT_ID,
          type: "supports",
        }),
      ).rejects.toThrow();
    });
  });

  describe("relation.listByUnit", () => {
    it("returns relations for a unit owned by the user", async () => {
      // listByUnit first calls unit.findFirst (ownership check), then relation service calls relation.findMany
      (mockDb.relation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRelation]);

      const result = await caller.relation.listByUnit({ unitId: TEST_SOURCE_UNIT_ID });
      expect(Array.isArray(result)).toBe(true);
    });

    it("throws NOT_FOUND when unit not owned by user", async () => {
      (mockDb.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.relation.listByUnit({ unitId: TEST_SOURCE_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("relation.delete", () => {
    it("deletes a relation owned by the user", async () => {
      (mockDb.relation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: TEST_RELATION_ID,
        perspectiveId: null,
      });
      (mockDb.relation.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockRelation);

      const result = await caller.relation.delete({ id: TEST_RELATION_ID });
      expect(result).toBeDefined();
    });

    it("throws NOT_FOUND when relation not owned by user", async () => {
      (mockDb.relation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.relation.delete({ id: TEST_RELATION_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid uuid", async () => {
      await expect(caller.relation.delete({ id: "bad-id" })).rejects.toThrow();
    });
  });
});
