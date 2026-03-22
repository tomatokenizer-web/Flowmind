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
  content: "Test thought unit",
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  unitType: "claim" as const,
  originType: "direct_write" as const,
  lifecycle: "confirmed" as const,
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

const mockUnitWithRelations = {
  ...mockUnit,
  perspectives: [],
  versions: [],
};

// ─── Mock Prisma ───────────────────────────────────────────────────

function createMockPrisma() {
  return {
    unit: {
      create: vi.fn().mockResolvedValue(mockUnit),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(mockUnitWithRelations),
      findMany: vi.fn().mockResolvedValue([mockUnit]),
      update: vi.fn().mockResolvedValue(mockUnit),
      delete: vi.fn().mockResolvedValue(mockUnit),
    },
    unitVersion: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "v1", version: 1, content: "old" }),
    },
  } as unknown as PrismaClient;
}

// ─── Helper: create caller with mock context ───────────────────────

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

describe("unit router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  // ── Authentication ─────────────────────────────────────────────

  describe("authentication", () => {
    it("rejects unauthenticated requests", async () => {
      const unauth = createUnauthCaller(mockDb);
      await expect(
        unauth.unit.create({ content: "test", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── unit.create ────────────────────────────────────────────────

  describe("unit.create", () => {
    it("creates a unit with default lifecycle=confirmed for user input", async () => {
      const result = await caller.unit.create({
        content: "My first claim",
        projectId: TEST_PROJECT_ID,
      });

      expect(result).toBeDefined();
      expect(mockDb.unit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: "My first claim",
          lifecycle: "confirmed",
          aiTrustLevel: "user_authored",
          unitType: "observation",
          originType: "direct_write",
        }),
      });
    });

    it("creates a unit with lifecycle=draft for AI-generated origin", async () => {
      await caller.unit.create({
        content: "AI generated thought",
        projectId: TEST_PROJECT_ID,
        originType: "ai_generated",
      });

      expect(mockDb.unit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lifecycle: "draft",
          aiTrustLevel: "inferred",
          originType: "ai_generated",
        }),
      });
    });

    it("creates a unit with lifecycle=draft for AI-refined origin", async () => {
      await caller.unit.create({
        content: "AI refined thought",
        projectId: TEST_PROJECT_ID,
        originType: "ai_refined",
      });

      expect(mockDb.unit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lifecycle: "draft",
          aiTrustLevel: "inferred",
        }),
      });
    });

    it("emits unit.created event", async () => {
      const handler = vi.fn();
      eventBus.on("unit.created", handler);

      await caller.unit.create({
        content: "Emit test",
        projectId: TEST_PROJECT_ID,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.created",
          payload: expect.objectContaining({
            userId: TEST_USER_ID,
          }),
        }),
      );
    });

    it("validates content is required", async () => {
      await expect(
        caller.unit.create({ content: "", projectId: TEST_PROJECT_ID }),
      ).rejects.toThrow();
    });

    it("validates projectId is a uuid", async () => {
      await expect(
        caller.unit.create({ content: "test", projectId: "not-a-uuid" }),
      ).rejects.toThrow();
    });

    it("validates enum values", async () => {
      await expect(
        caller.unit.create({
          content: "test",
          projectId: TEST_PROJECT_ID,
          unitType: "invalid_type" as "claim",
        }),
      ).rejects.toThrow();
    });

    it("accepts all optional classification fields", async () => {
      await caller.unit.create({
        content: "Full classification",
        projectId: TEST_PROJECT_ID,
        unitType: "evidence",
        certainty: "probable",
        completeness: "needs_evidence",
        abstractionLevel: "concept",
        stance: "support",
        evidenceDomain: "external_public",
        scope: "domain_general",
        energyLevel: "high",
      });

      expect(mockDb.unit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitType: "evidence",
          certainty: "probable",
          completeness: "needs_evidence",
          abstractionLevel: "concept",
          stance: "support",
          evidenceDomain: "external_public",
          scope: "domain_general",
          energyLevel: "high",
        }),
      });
    });
  });

  // ── unit.getById ───────────────────────────────────────────────

  describe("unit.getById", () => {
    it("returns unit with perspectives and relations", async () => {
      const result = await caller.unit.getById({ id: TEST_UNIT_ID });

      expect(result).toBeDefined();
      expect(result.perspectives).toBeDefined();
      expect(result.versions).toBeDefined();
      expect(mockDb.unit.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_UNIT_ID },
        include: {
          perspectives: { include: { relations: true } },
          versions: { orderBy: { version: "desc" }, take: 5 },
        },
      });
    });

    it("throws NOT_FOUND for non-existent unit", async () => {
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(
        caller.unit.getById({ id: TEST_UNIT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("validates id is a uuid", async () => {
      await expect(
        caller.unit.getById({ id: "not-a-uuid" }),
      ).rejects.toThrow();
    });
  });

  // ── unit.list ──────────────────────────────────────────────────

  describe("unit.list", () => {
    it("returns paginated results with cursor", async () => {
      const items = [mockUnit, { ...mockUnit, id: "b0000000-0000-0000-0000-000000000002" }];
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items);

      const result = await caller.unit.list({ projectId: TEST_PROJECT_ID });

      expect(result.items).toBeDefined();
      expect(mockDb.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: TEST_PROJECT_ID },
          orderBy: { createdAt: "desc" },
          take: 21, // limit + 1 for cursor detection
        }),
      );
    });

    it("filters by lifecycle", async () => {
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      await caller.unit.list({
        projectId: TEST_PROJECT_ID,
        lifecycle: "draft",
      });

      expect(mockDb.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: TEST_PROJECT_ID, lifecycle: "draft" },
        }),
      );
    });

    it("filters by unitType", async () => {
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      await caller.unit.list({
        projectId: TEST_PROJECT_ID,
        unitType: "question",
      });

      expect(mockDb.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: TEST_PROJECT_ID, unitType: "question" },
        }),
      );
    });

    it("filters by contextId via perspectives", async () => {
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      const ctxId = "c0000000-0000-0000-0000-000000000001";

      await caller.unit.list({
        projectId: TEST_PROJECT_ID,
        contextId: ctxId,
      });

      expect(mockDb.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: TEST_PROJECT_ID,
            perspectives: { some: { contextId: ctxId } },
          },
        }),
      );
    });

    it("supports sorting by importance", async () => {
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      await caller.unit.list({
        projectId: TEST_PROJECT_ID,
        sortBy: "importance",
        sortOrder: "desc",
      });

      expect(mockDb.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { importance: "desc" },
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      // Return 21 items (limit+1) to indicate there's a next page
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockUnit,
        id: `b0000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
      }));
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items);

      const result = await caller.unit.list({ projectId: TEST_PROJECT_ID, limit: 20 });

      expect(result.nextCursor).toBeDefined();
      expect(result.items).toHaveLength(20);
    });

    it("returns no nextCursor on last page", async () => {
      (mockDb.unit.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([mockUnit]);

      const result = await caller.unit.list({ projectId: TEST_PROJECT_ID });

      expect(result.nextCursor).toBeUndefined();
    });
  });

  // ── unit.update ────────────────────────────────────────────────

  describe("unit.update", () => {
    it("auto-versions before content change", async () => {
      await caller.unit.update({
        id: TEST_UNIT_ID,
        content: "Updated content",
      });

      // Should create a version snapshot
      expect(mockDb.unitVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: mockUnit.content,
          version: 1,
          changeReason: "auto-version before edit",
        }),
      });

      // Should update the unit
      expect(mockDb.unit.update).toHaveBeenCalled();
    });

    it("skips versioning when content unchanged", async () => {
      await caller.unit.update({
        id: TEST_UNIT_ID,
        flagged: true,
      });

      expect(mockDb.unitVersion.create).not.toHaveBeenCalled();
      expect(mockDb.unit.update).toHaveBeenCalled();
    });

    it("emits unit.updated event", async () => {
      const handler = vi.fn();
      eventBus.on("unit.updated", handler);

      await caller.unit.update({ id: TEST_UNIT_ID, pinned: true });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.updated",
          payload: expect.objectContaining({ unitId: TEST_UNIT_ID }),
        }),
      );
    });

    it("throws NOT_FOUND for non-existent unit", async () => {
      (mockDb.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(
        caller.unit.update({ id: TEST_UNIT_ID, content: "new" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── unit.archive ───────────────────────────────────────────────

  describe("unit.archive", () => {
    it("sets lifecycle to archived", async () => {
      await caller.unit.archive({ id: TEST_UNIT_ID });

      expect(mockDb.unit.update).toHaveBeenCalledWith({
        where: { id: TEST_UNIT_ID },
        data: { lifecycle: "archived" },
      });
    });

    it("emits unit.archived event", async () => {
      const handler = vi.fn();
      eventBus.on("unit.archived", handler);

      await caller.unit.archive({ id: TEST_UNIT_ID });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "unit.archived" }),
      );
    });
  });

  // ── unit.delete ────────────────────────────────────────────────

  describe("unit.delete", () => {
    it("deletes the unit", async () => {
      await caller.unit.delete({ id: TEST_UNIT_ID });

      expect(mockDb.unit.delete).toHaveBeenCalledWith({
        where: { id: TEST_UNIT_ID },
      });
    });

    it("emits unit.deleted event", async () => {
      const handler = vi.fn();
      eventBus.on("unit.deleted", handler);

      await caller.unit.delete({ id: TEST_UNIT_ID });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.deleted",
          payload: expect.objectContaining({ unitId: TEST_UNIT_ID }),
        }),
      );
    });
  });
});
