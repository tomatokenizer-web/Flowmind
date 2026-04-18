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

// ─── Constants ─────────────────────────────────────────────────────

const TEST_USER_ID = "user-sec-001";
const TEST_PROJECT_ID = "a1000000-0000-0000-0000-000000000001";
const TEST_UNIT_ID = "b1000000-0000-0000-0000-000000000001";
const TEST_CONTEXT_ID = "c1000000-0000-0000-0000-000000000001";

const mockUnit = {
  id: TEST_UNIT_ID,
  content: "Security test unit",
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  unitType: "observation",
  originType: "direct_write",
  lifecycle: "draft",
  quality: "raw",
  certainty: null,
  completeness: null,
  abstractionLevel: null,
  stance: null,
  evidenceDomain: null,
  scope: null,
  aiTrustLevel: "user_authored",
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
  createdAt: new Date("2026-01-01T00:00:00Z"),
  modifiedAt: new Date("2026-01-01T00:00:00Z"),
  lastAccessed: new Date("2026-01-01T00:00:00Z"),
};

// ─── Mock Prisma ───────────────────────────────────────────────────

function createMockPrisma() {
  return {
    unit: {
      create: vi.fn().mockResolvedValue(mockUnit),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(mockUnit),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(mockUnit),
      delete: vi.fn().mockResolvedValue(mockUnit),
    },
    unitVersion: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "v1", version: 1, content: "old" }),
    },
    context: {
      findFirst: vi.fn().mockResolvedValue({ id: TEST_CONTEXT_ID }),
      create: vi.fn().mockResolvedValue({ id: TEST_CONTEXT_ID, name: "Test Context" }),
    },
    unitContext: {
      create: vi.fn().mockResolvedValue({ unitId: TEST_UNIT_ID, contextId: TEST_CONTEXT_ID }),
    },
    project: {
      create: vi.fn().mockResolvedValue({ id: TEST_PROJECT_ID, name: "Test Project" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    rateLimit: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

// ─── Caller Helpers ────────────────────────────────────────────────

function createUnauthCaller(db: PrismaClient) {
  return appRouter.createCaller({
    db,
    session: null,
    headers: new Headers(),
  } as Parameters<typeof appRouter.createCaller>[0]);
}

function createAuthCaller(db: PrismaClient) {
  return appRouter.createCaller({
    db,
    session: {
      user: { id: TEST_USER_ID, name: "Security Tester", email: "sec@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    headers: new Headers(),
  } as Parameters<typeof appRouter.createCaller>[0]);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("security: authentication enforcement", () => {
  let mockDb: PrismaClient;
  let unauth: ReturnType<typeof createUnauthCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    unauth = createUnauthCaller(mockDb);
  });

  it("unit.create rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(
      unauth.unit.create({
        content: "Should not be created",
        projectId: TEST_PROJECT_ID,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("unit.delete rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(
      unauth.unit.delete({ id: TEST_UNIT_ID }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("ai.classifyFullMetadata rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(
      unauth.ai.classifyFullMetadata({
        unitId: TEST_UNIT_ID,
        content: "Some content to classify",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("context.create rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(
      unauth.context.create({
        name: "My Context",
        projectId: TEST_PROJECT_ID,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("project.create rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(
      unauth.project.create({
        name: "My Project",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("security: input validation", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createAuthCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createAuthCaller(mockDb);
  });

  it("unit.create rejects empty content", async () => {
    await expect(
      caller.unit.create({
        content: "",
        projectId: TEST_PROJECT_ID,
      }),
    ).rejects.toThrow();
  });

  it("unit.create rejects content exceeding max length (50000 chars)", async () => {
    await expect(
      caller.unit.create({
        content: "x".repeat(50001),
        projectId: TEST_PROJECT_ID,
      }),
    ).rejects.toThrow();
  });

  it("ai.classifyFullMetadata rejects non-UUID unitId", async () => {
    await expect(
      caller.ai.classifyFullMetadata({
        unitId: "not-a-uuid",
        content: "Some content",
      }),
    ).rejects.toThrow();
  });
});

describe("security: rate-limited procedures exist", () => {
  it("ai router exposes rateLimitedProcedure endpoints (suggestType)", () => {
    // Verify the procedure is registered on the router — callable shape check
    const caller = createAuthCaller(createMockPrisma());
    expect(typeof caller.ai.suggestType).toBe("function");
  });

  it("ai router exposes rateLimitedProcedure endpoints (classifyFullMetadata)", () => {
    const caller = createAuthCaller(createMockPrisma());
    expect(typeof caller.ai.classifyFullMetadata).toBe("function");
  });
});
