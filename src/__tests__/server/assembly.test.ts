import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));

import { appRouter } from "@/server/api/root";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Constants ─────────────────────────────────────────────────────
const TEST_USER_ID = "user-123";
const TEST_PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const TEST_ASSEMBLY_ID = "d0000000-0000-0000-0000-000000000001";
const TEST_UNIT_ID = "b0000000-0000-0000-0000-000000000001";

const mockProject = {
  id: TEST_PROJECT_ID,
  name: "Test Project",
  userId: TEST_USER_ID,
};

const mockAssembly = {
  id: TEST_ASSEMBLY_ID,
  name: "My Assembly",
  projectId: TEST_PROJECT_ID,
  templateType: null,
  sourceMap: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  items: [],
  _count: { items: 0 },
};

const mockUnit = {
  id: TEST_UNIT_ID,
  userId: TEST_USER_ID,
  unitType: "claim",
  lifecycle: "confirmed",
  content: "A confirmed thought",
};

const mockAssemblyItem = {
  id: "item-001",
  assemblyId: TEST_ASSEMBLY_ID,
  unitId: TEST_UNIT_ID,
  position: 0,
  slotName: null,
  bridgeText: null,
  unit: mockUnit,
};

// ─── Mock Prisma ────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    project: {
      findFirst: vi.fn().mockResolvedValue(mockProject),
    },
    assembly: {
      create: vi.fn().mockResolvedValue(mockAssembly),
      findFirst: vi.fn().mockResolvedValue({
        ...mockAssembly,
        items: [],
        project: { userId: TEST_USER_ID },
      }),
      findMany: vi.fn().mockResolvedValue([mockAssembly]),
      update: vi.fn().mockResolvedValue(mockAssembly),
      delete: vi.fn().mockResolvedValue(mockAssembly),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    assemblyItem: {
      create: vi.fn().mockResolvedValue(mockAssemblyItem),
      // findFirst returns null by default (no duplicate) — tests can override
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([mockAssemblyItem]),
      update: vi.fn().mockResolvedValue(mockAssemblyItem),
      delete: vi.fn().mockResolvedValue(mockAssemblyItem),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    unit: {
      findFirst: vi.fn().mockResolvedValue(mockUnit),
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

describe("assembly router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("authentication", () => {
    it("rejects unauthenticated assembly.create", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.assembly.create({ name: "My Assembly", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated assembly.getById", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(unauth.assembly.getById({ id: TEST_ASSEMBLY_ID })).rejects.toThrow(TRPCError);
    });
  });

  describe("assembly.create", () => {
    it("creates an assembly for a valid project", async () => {
      const result = await caller.assembly.create({
        name: "My Assembly",
        projectId: TEST_PROJECT_ID,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_ASSEMBLY_ID);
      expect((mockDb.assembly.create as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when project not owned by user", async () => {
      (mockDb.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.assembly.create({ name: "My Assembly", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects empty name", async () => {
      await expect(
        caller.assembly.create({ name: "", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow();
    });

    it("rejects invalid projectId uuid", async () => {
      await expect(
        caller.assembly.create({ name: "Ok", projectId: "not-a-uuid" }),
      ).rejects.toThrow();
    });
  });

  describe("assembly.getById", () => {
    it("returns assembly with items", async () => {
      const fullAssembly = {
        ...mockAssembly,
        items: [mockAssemblyItem],
        _count: { items: 1 },
        project: { userId: TEST_USER_ID },
      };
      (mockDb.assembly.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(fullAssembly);

      const result = await caller.assembly.getById({ id: TEST_ASSEMBLY_ID });

      expect(result).toBeDefined();
      expect(result?.id).toBe(TEST_ASSEMBLY_ID);
    });

    it("throws NOT_FOUND when assembly does not exist", async () => {
      (mockDb.assembly.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.assembly.getById({ id: TEST_ASSEMBLY_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid uuid", async () => {
      await expect(caller.assembly.getById({ id: "bad-id" })).rejects.toThrow();
    });
  });

  describe("assembly.addUnit", () => {
    it("adds a confirmed unit to an assembly", async () => {
      const result = await caller.assembly.addUnit({
        assemblyId: TEST_ASSEMBLY_ID,
        unitId: TEST_UNIT_ID,
      });

      expect(result).toBeDefined();
      expect(result.unitId).toBe(TEST_UNIT_ID);
    });

    it("throws NOT_FOUND when assembly not owned by user", async () => {
      (mockDb.assembly.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.assembly.addUnit({ assemblyId: TEST_ASSEMBLY_ID, unitId: TEST_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when adding a draft unit", async () => {
      (mockDb.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUnit,
        lifecycle: "draft",
      });

      await expect(
        caller.assembly.addUnit({ assemblyId: TEST_ASSEMBLY_ID, unitId: TEST_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when unit not owned by user", async () => {
      // assembly found but unit not found
      (mockDb.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.assembly.addUnit({ assemblyId: TEST_ASSEMBLY_ID, unitId: TEST_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
