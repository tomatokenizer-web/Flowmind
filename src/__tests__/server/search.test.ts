import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/server/ai/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(null),
}));

import { appRouter } from "@/server/api/root";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Constants ─────────────────────────────────────────────────────
const TEST_USER_ID = "user-123";
const TEST_PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const TEST_UNIT_ID = "b0000000-0000-0000-0000-000000000001";

const mockSearchRow = {
  id: TEST_UNIT_ID,
  content: "A relevant thought about testing",
  unit_type: "claim",
  lifecycle: "confirmed",
  created_at: new Date("2026-01-01T00:00:00Z"),
  project_id: TEST_PROJECT_ID,
};

const mockRelationCountRow = {
  sourceUnitId: TEST_UNIT_ID,
  _count: { _all: 3 },
};

// ─── Mock Prisma ────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([mockSearchRow]),
    unit: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: TEST_UNIT_ID,
          content: "A relevant thought about testing",
          unitType: "claim",
          lifecycle: "confirmed",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          _count: {
            relationsAsSource: 2,
            relationsAsTarget: 1,
          },
        },
      ]),
    },
    relation: {
      groupBy: vi.fn().mockResolvedValue([mockRelationCountRow]),
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

describe("search router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("authentication", () => {
    it("rejects unauthenticated search.query", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.search.query({ query: "test", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("search.query (fullText / text layer)", () => {
    it("returns search results for a text query", async () => {
      const result = await caller.search.query({
        query: "relevant",
        projectId: TEST_PROJECT_ID,
        layers: ["text"],
      });

      expect(Array.isArray(result)).toBe(true);
      // $queryRaw was called for text layer search
      expect((mockDb.$queryRaw as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it("returns empty array when no matches", async () => {
      (mockDb.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await caller.search.query({
        query: "xyznotfound",
        projectId: TEST_PROJECT_ID,
        layers: ["text"],
      });

      expect(result).toEqual([]);
    });

    it("rejects query longer than 500 chars", async () => {
      await expect(
        caller.search.query({
          query: "a".repeat(501),
          projectId: TEST_PROJECT_ID,
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid projectId uuid", async () => {
      await expect(
        caller.search.query({ query: "test", projectId: "not-a-uuid" }),
      ).rejects.toThrow();
    });

    it("searches structural layer using unit.findMany", async () => {
      const result = await caller.search.query({
        query: "thought",
        projectId: TEST_PROJECT_ID,
        layers: ["structural"],
        unitTypes: ["claim"],
      });

      expect(Array.isArray(result)).toBe(true);
      expect((mockDb.unit.findMany as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it("returns results with required SearchResult fields", async () => {
      const result = await caller.search.query({
        query: "relevant",
        projectId: TEST_PROJECT_ID,
        layers: ["text"],
      });

      if (result.length > 0) {
        const first = result[0]!;
        expect(first).toHaveProperty("unitId");
        expect(first).toHaveProperty("content");
        expect(first).toHaveProperty("score");
        expect(first).toHaveProperty("matchLayer");
        expect(first).toHaveProperty("highlights");
      }
    });
  });
});
