import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth and db before importing app code
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));

import { appRouter } from "@/server/api/root";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { eventBus } from "@/server/events/eventBus";

// ─── Mock Data ─────────────────────────────────────────────────────

const TEST_USER_ID = "user-123";
const TEST_PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const TEST_UNIT_ID = "b0000000-0000-0000-0000-000000000001";

const mockUnit = {
  id: TEST_UNIT_ID,
  content: "A quick thought",
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  unitType: "observation" as const,
  originType: "direct_write" as const,
  lifecycle: "draft" as const,
  quality: "raw" as const,
  certainty: null,
  completeness: null,
  abstractionLevel: null,
  stance: null,
  evidenceDomain: null,
  scope: null,
  aiTrustLevel: "user_authored" as const,
  energyLevel: null,
  actionRequired: false,
  flagged: false,
  pinned: false,
  incubating: false,
  locked: false,
  sourceUrl: null,
  sourceTitle: null,
  author: null,
  isQuote: false,
  conversationId: null,
  parentInputId: null,
  sourceSpan: null,
  capturedAt: null,
  validUntil: null,
  temporalContext: null,
  recurrence: null,
  importance: 0,
  branchPotential: 0,
  driftScore: 0,
  embedding: null,
  meta: null,
  createdAt: new Date("2026-03-18T00:00:00Z"),
  modifiedAt: new Date("2026-03-18T00:00:00Z"),
  lastAccessed: new Date("2026-03-18T00:00:00Z"),
};

// ─── Mock Prisma ───────────────────────────────────────────────────

function createMockPrisma() {
  return {
    unit: {
      create: vi.fn().mockResolvedValue(mockUnit),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(mockUnit),
      delete: vi.fn().mockResolvedValue(mockUnit),
    },
    unitVersion: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "v1", version: 1, content: "old" }),
    },
  } as unknown as PrismaClient;
}

// ─── Helper ────────────────────────────────────────────────────────

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

describe("capture router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("authentication", () => {
    it("rejects unauthenticated capture submissions", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.capture.submit({
          content: "test thought",
          projectId: TEST_PROJECT_ID,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("capture.submit", () => {
    it("creates a unit with capture defaults (draft, observation, direct_write)", async () => {
      const result = await caller.capture.submit({
        content: "A quick thought",
        projectId: TEST_PROJECT_ID,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_UNIT_ID);

      // Verify Prisma was called with capture defaults
      const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
      expect(createCall?.data).toMatchObject({
        content: "A quick thought",
        unitType: "observation",
        lifecycle: "draft",
        originType: "direct_write",
        aiTrustLevel: "user_authored",
      });
    });

    it("defaults to capture mode when mode is not specified", async () => {
      await caller.capture.submit({
        content: "No mode specified",
        projectId: TEST_PROJECT_ID,
      });

      const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
      // No meta.pendingDecomposition in capture mode
      expect(createCall?.data?.meta).toBeUndefined();
    });

    it("sets pendingDecomposition flag in organize mode", async () => {
      await caller.capture.submit({
        content: "Organize this thought",
        projectId: TEST_PROJECT_ID,
        mode: "organize",
      });

      const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
      expect(createCall?.data?.meta).toEqual({ pendingDecomposition: true });
    });

    it("stores text as-is without AI processing in capture mode", async () => {
      const rawText = "   messy thought with  spacing   \n\nand newlines  ";
      await caller.capture.submit({
        content: rawText,
        projectId: TEST_PROJECT_ID,
        mode: "capture",
      });

      const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
      expect(createCall?.data?.content).toBe(rawText);
    });

    it("rejects empty content", async () => {
      await expect(
        caller.capture.submit({
          content: "",
          projectId: TEST_PROJECT_ID,
        }),
      ).rejects.toThrow();
    });

    it("accepts text of any length", async () => {
      const longText = "a".repeat(10000);
      await caller.capture.submit({
        content: longText,
        projectId: TEST_PROJECT_ID,
      });

      const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
      expect(createCall?.data?.content).toBe(longText);
    });
  });
});
