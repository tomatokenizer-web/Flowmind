import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/server/services/scaffoldService", () => ({
  createScaffoldUnits: vi.fn().mockResolvedValue(undefined),
}));

import { appRouter } from "@/server/api/root";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Constants ─────────────────────────────────────────────────────
const TEST_USER_ID = "user-123";
const TEST_PROJECT_ID = "a0000000-0000-0000-0000-000000000001";

const mockProject = {
  id: TEST_PROJECT_ID,
  name: "Test Project",
  type: null,
  constraintLevel: "guided",
  templateId: null,
  template: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  userId: TEST_USER_ID,
  _count: { contexts: 2, units: 5, assemblies: 1 },
};

// ─── Mock Prisma ────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    project: {
      findFirst: vi.fn().mockResolvedValue(mockProject),
      findMany: vi.fn().mockResolvedValue([mockProject]),
      create: vi.fn().mockResolvedValue(mockProject),
      update: vi.fn().mockResolvedValue(mockProject),
      delete: vi.fn().mockResolvedValue(mockProject),
      count: vi.fn().mockResolvedValue(2),
    },
    context: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    unit: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
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

describe("project router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("authentication", () => {
    it("rejects unauthenticated project.create", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.project.create({ name: "My Project" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated project.list", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(unauth.project.list()).rejects.toThrow(TRPCError);
    });
  });

  describe("project.create", () => {
    it("creates a project with required fields", async () => {
      const result = await caller.project.create({ name: "New Project" });

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_PROJECT_ID);
      expect((mockDb.project.create as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it("creates with constraintLevel default guided", async () => {
      await caller.project.create({ name: "New Project" });

      const createCall = (mockDb.project.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(createCall?.data?.constraintLevel).toBe("guided");
    });

    it("rejects empty name", async () => {
      await expect(caller.project.create({ name: "" })).rejects.toThrow();
    });

    it("rejects name over 100 chars", async () => {
      await expect(caller.project.create({ name: "a".repeat(101) })).rejects.toThrow();
    });
  });

  describe("project.list", () => {
    it("returns list of projects for user", async () => {
      const result = await caller.project.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.id).toBe(TEST_PROJECT_ID);
      expect(result[0]?.contextCount).toBe(2);
      expect(result[0]?.unitCount).toBe(5);
    });

    it("returns empty array when no projects", async () => {
      (mockDb.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await caller.project.list();
      expect(result).toEqual([]);
    });
  });

  describe("project.getById", () => {
    it("returns project with counts", async () => {
      const result = await caller.project.getById({ id: TEST_PROJECT_ID });

      expect(result.id).toBe(TEST_PROJECT_ID);
      expect(result.contextCount).toBe(2);
      expect(result.unitCount).toBe(5);
      expect(result.assemblyCount).toBe(1);
    });

    it("throws NOT_FOUND when project missing", async () => {
      (mockDb.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.project.getById({ id: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid uuid", async () => {
      await expect(caller.project.getById({ id: "not-a-uuid" })).rejects.toThrow();
    });
  });

  describe("project.getProjectStats", () => {
    it("returns null when no projectId provided", async () => {
      const result = await caller.project.getProjectStats({ projectId: undefined });
      expect(result).toBeNull();
    });

    it("returns stats for a valid project", async () => {
      (mockDb.context.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctx-1", name: "Main Context", _count: { unitContexts: 10 } },
      ]);

      const result = await caller.project.getProjectStats({ projectId: TEST_PROJECT_ID });

      expect(result).toBeDefined();
      expect(result?.totalUnits).toBe(5);
      expect(result?.contextCount).toBe(2);
      expect(result?.assemblyCount).toBe(1);
      expect(result?.mostActiveContext?.id).toBe("ctx-1");
    });

    it("throws NOT_FOUND when project missing", async () => {
      (mockDb.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.project.getProjectStats({ projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
