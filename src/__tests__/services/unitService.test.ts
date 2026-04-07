import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
import { eventBus } from "@/server/events/eventBus";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const USER_ID = "user-abc";
const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const UNIT_ID = "b0000000-0000-0000-0000-000000000001";

// ─── Mock Data ──────────────────────────────────────────────────────

const baseUnit = {
  id: UNIT_ID,
  content: "Test unit content",
  userId: USER_ID,
  projectId: PROJECT_ID,
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
  perspectives: [],
  versions: [],
};

// ─── Mock Repository ────────────────────────────────────────────────

function createMockRepo() {
  return {
    create: vi.fn().mockResolvedValue(baseUnit),
    findById: vi.fn().mockResolvedValue(baseUnit),
    findMany: vi.fn().mockResolvedValue({ items: [baseUnit], nextCursor: undefined }),
    update: vi.fn().mockResolvedValue(baseUnit),
    delete: vi.fn().mockResolvedValue(baseUnit),
    getLatestVersionNumber: vi.fn().mockResolvedValue(0),
    createVersion: vi.fn().mockResolvedValue({ id: "v1", version: 1 }),
    findByExactContent: vi.fn().mockResolvedValue(null),
  };
}

// The service uses createUnitRepository internally, so we mock the module.
vi.mock("@/server/repositories/unitRepository", () => ({
  createUnitRepository: vi.fn(),
}));

// Also stub the heuristic so tests don't depend on rule logic
vi.mock("@/server/services/typeHeuristicService", () => ({
  suggestUnitType: vi.fn().mockReturnValue({ unitType: "claim", confidence: "low", matchedRule: "fallback" }),
}));

import { createUnitRepository } from "@/server/repositories/unitRepository";

// ─── Helper ─────────────────────────────────────────────────────────

function buildService() {
  const mockRepo = createMockRepo();
  (createUnitRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockRepo);
  const db = {
    navigator: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    assemblyItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as PrismaClient;
  const service = createUnitService(db);
  return { service, mockRepo };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("unitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  // ── create ─────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a unit with confirmed lifecycle for user-authored content", async () => {
      const { service, mockRepo } = buildService();

      const result = await service.create(
        { content: "My idea", projectId: PROJECT_ID },
        USER_ID,
      );

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: "confirmed",
          aiTrustLevel: "user_authored",
          originType: "direct_write",
        }),
      );
    });

    it("creates a unit with draft lifecycle for ai_generated origin", async () => {
      const { service, mockRepo } = buildService();

      await service.create(
        { content: "AI generated", projectId: PROJECT_ID, originType: "ai_generated" },
        USER_ID,
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: "draft",
          aiTrustLevel: "inferred",
          originType: "ai_generated",
        }),
      );
    });

    it("creates a unit with draft lifecycle for ai_refined origin", async () => {
      const { service, mockRepo } = buildService();

      await service.create(
        { content: "AI refined", projectId: PROJECT_ID, originType: "ai_refined" },
        USER_ID,
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: "draft", aiTrustLevel: "inferred" }),
      );
    });

    it("respects explicit lifecycle override", async () => {
      const { service, mockRepo } = buildService();

      await service.create(
        { content: "Explicit", projectId: PROJECT_ID, lifecycle: "pending" },
        USER_ID,
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: "pending" }),
      );
    });

    it("throws DuplicateUnitContentError when exact content exists in project", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findByExactContent.mockResolvedValueOnce({ id: "existing-id", content: "duplicate" });

      await expect(
        service.create({ content: "duplicate", projectId: PROJECT_ID }, USER_ID),
      ).rejects.toThrow(DuplicateUnitContentError);
    });

    it("emits unit.created event after creation", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("unit.created", handler);

      await service.create({ content: "emit test", projectId: PROJECT_ID }, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.created",
          payload: expect.objectContaining({ userId: USER_ID }),
        }),
      );
    });

    it("stores isQuote=false by default", async () => {
      const { service, mockRepo } = buildService();

      await service.create({ content: "plain content", projectId: PROJECT_ID }, USER_ID);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isQuote: false }),
      );
    });

    it("stores quality=raw by default", async () => {
      const { service, mockRepo } = buildService();

      await service.create({ content: "raw content", projectId: PROJECT_ID }, USER_ID);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quality: "raw" }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("returns null when unit does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.update(UNIT_ID, { content: "new content" }, USER_ID);

      expect(result).toBeNull();
    });

    it("creates a version snapshot before content change", async () => {
      const { service, mockRepo } = buildService();

      await service.update(UNIT_ID, { content: "updated content" }, USER_ID);

      expect(mockRepo.createVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          content: baseUnit.content,
          version: 1,
          changeReason: "auto-version before edit",
        }),
      );
    });

    it("skips versioning when content is unchanged", async () => {
      const { service, mockRepo } = buildService();

      await service.update(UNIT_ID, { flagged: true }, USER_ID);

      expect(mockRepo.createVersion).not.toHaveBeenCalled();
    });

    it("skips versioning when content field is same as existing", async () => {
      const { service, mockRepo } = buildService();

      // Pass the same content as what already exists
      await service.update(UNIT_ID, { content: baseUnit.content }, USER_ID);

      expect(mockRepo.createVersion).not.toHaveBeenCalled();
    });

    it("emits unit.updated event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("unit.updated", handler);

      await service.update(UNIT_ID, { pinned: true }, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.updated",
          payload: expect.objectContaining({ unitId: UNIT_ID, userId: USER_ID }),
        }),
      );
    });

    it("sets lifecycle to draft when unitType is changed without explicit lifecycle", async () => {
      const { service, mockRepo } = buildService();

      await service.update(UNIT_ID, { unitType: "evidence" }, USER_ID);

      expect(mockRepo.update).toHaveBeenCalledWith(
        UNIT_ID,
        expect.objectContaining({ lifecycle: "draft", unitType: "evidence" }),
      );
    });
  });

  // ── delete ─────────────────────────────────────────────────────

  describe("delete", () => {
    it("calls repo.delete with the given id", async () => {
      const { service, mockRepo } = buildService();

      await service.delete(UNIT_ID, USER_ID);

      expect(mockRepo.delete).toHaveBeenCalledWith(UNIT_ID);
    });

    it("emits unit.deleted event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("unit.deleted", handler);

      await service.delete(UNIT_ID, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.deleted",
          payload: expect.objectContaining({ unitId: UNIT_ID, userId: USER_ID }),
        }),
      );
    });
  });

  // ── list ───────────────────────────────────────────────────────

  describe("list", () => {
    it("calls repo.findMany with projectId filter", async () => {
      const { service, mockRepo } = buildService();

      await service.list({ projectId: PROJECT_ID });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: PROJECT_ID }),
        }),
      );
    });

    it("applies lifecycle filter when provided", async () => {
      const { service, mockRepo } = buildService();

      await service.list({ projectId: PROJECT_ID, lifecycle: "draft" });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lifecycle: "draft" }),
        }),
      );
    });

    it("applies unitType filter when provided", async () => {
      const { service, mockRepo } = buildService();

      await service.list({ projectId: PROJECT_ID, unitType: "question" });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitType: "question" }),
        }),
      );
    });

    it("applies contextId filter via perspectives when provided", async () => {
      const { service, mockRepo } = buildService();
      const ctxId = "c0000000-0000-0000-0000-000000000001";

      await service.list({ projectId: PROJECT_ID, contextId: ctxId });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitContexts: { some: { contextId: ctxId } },
          }),
        }),
      );
    });

    it("defaults to createdAt desc sort", async () => {
      const { service, mockRepo } = buildService();

      await service.list({ projectId: PROJECT_ID });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } }),
      );
    });

    it("supports custom sort field and order", async () => {
      const { service, mockRepo } = buildService();

      await service.list({ projectId: PROJECT_ID, sortBy: "importance", sortOrder: "asc" });

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { importance: "asc" } }),
      );
    });
  });

  // ── transitionLifecycle ────────────────────────────────────────

  describe("transitionLifecycle", () => {
    it("successfully transitions draft → pending", async () => {
      const { service, mockRepo } = buildService();
      // findById returns a unit with lifecycle=draft
      mockRepo.findById.mockResolvedValueOnce({ ...baseUnit, lifecycle: "draft" });

      await service.transitionLifecycle(UNIT_ID, "pending", USER_ID);

      expect(mockRepo.update).toHaveBeenCalledWith(
        UNIT_ID,
        expect.objectContaining({ lifecycle: "pending" }),
      );
    });

    it("throws on invalid lifecycle transition (confirmed → pending)", async () => {
      const { service, mockRepo } = buildService();
      // confirmed can only go back to draft
      mockRepo.findById.mockResolvedValueOnce({ ...baseUnit, lifecycle: "confirmed" });

      await expect(
        service.transitionLifecycle(UNIT_ID, "pending", USER_ID),
      ).rejects.toThrow("Invalid lifecycle transition");
    });

    it("returns null when unit does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.transitionLifecycle(UNIT_ID, "pending", USER_ID);

      expect(result).toBeNull();
    });
  });

  // ── archive ────────────────────────────────────────────────────

  describe("archive", () => {
    it("sets lifecycle to archived", async () => {
      const { service, mockRepo } = buildService();

      await service.archive(UNIT_ID, USER_ID);

      expect(mockRepo.update).toHaveBeenCalledWith(
        UNIT_ID,
        expect.objectContaining({ lifecycle: "archived" }),
      );
    });

    it("emits unit.archived event", async () => {
      const { service } = buildService();
      const handler = vi.fn();
      eventBus.on("unit.archived", handler);

      await service.archive(UNIT_ID, USER_ID);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "unit.archived" }),
      );
    });
  });
});
