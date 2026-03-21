import { describe, it, expect, vi, beforeEach } from "vitest";
import { createContextService } from "@/server/services/contextService";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const CONTEXT_ID = "c0000000-0000-0000-0000-000000000001";
const CHILD_CONTEXT_ID = "c0000000-0000-0000-0000-000000000002";
const UNIT_ID = "b0000000-0000-0000-0000-000000000001";

// ─── Mock Data ──────────────────────────────────────────────────────

function makeContext(id: string, parentId: string | null = null, name = "Test Context") {
  return {
    id,
    name,
    description: null,
    projectId: PROJECT_ID,
    parentId,
    sortOrder: 0,
    createdAt: new Date("2026-03-18T00:00:00Z"),
    updatedAt: new Date("2026-03-18T00:00:00Z"),
    children: [],
    parent: null,
    _count: { unitContexts: 0, perspectives: 0 },
  };
}

// ─── Mock Repository Builder ────────────────────────────────────────

function createMockRepo() {
  return {
    create: vi.fn().mockImplementation((data: { name: string }) =>
      Promise.resolve(makeContext(CONTEXT_ID, null, data.name)),
    ),
    findById: vi.fn().mockResolvedValue(makeContext(CONTEXT_ID)),
    findMany: vi.fn().mockResolvedValue([makeContext(CONTEXT_ID)]),
    update: vi.fn().mockImplementation((_id: string, data: { name?: string }) =>
      Promise.resolve(makeContext(CONTEXT_ID, null, data.name ?? "Test Context")),
    ),
    delete: vi.fn().mockResolvedValue(makeContext(CONTEXT_ID)),
    findByNameInScope: vi.fn().mockResolvedValue(null),
    addUnit: vi.fn().mockResolvedValue({ unitId: UNIT_ID, contextId: CONTEXT_ID }),
    removeUnit: vi.fn().mockResolvedValue({ unitId: UNIT_ID, contextId: CONTEXT_ID }),
    getUnitsForContext: vi.fn().mockResolvedValue([]),
    reorderSiblings: vi.fn().mockResolvedValue(undefined),
    moveToParent: vi.fn().mockResolvedValue(makeContext(CONTEXT_ID)),
  };
}

vi.mock("@/server/repositories/contextRepository", () => ({
  createContextRepository: vi.fn(),
}));

import { createContextRepository } from "@/server/repositories/contextRepository";

function buildService() {
  const mockRepo = createMockRepo();
  (createContextRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockRepo);

  const mockDb = {
    unitContext: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
    unitPerspective: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    context: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mockDb),
    ),
  } as unknown as PrismaClient;

  const service = createContextService(mockDb);
  return { service, mockRepo, mockDb };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("contextService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createContext ──────────────────────────────────────────────

  describe("createContext", () => {
    it("creates a context with the given name and projectId", async () => {
      const { service, mockRepo } = buildService();

      const result = await service.createContext({
        name: "Research",
        projectId: PROJECT_ID,
      });

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Research",
          project: { connect: { id: PROJECT_ID } },
        }),
      );
    });

    it("throws CONFLICT when a context with the same name exists in the same scope", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findByNameInScope.mockResolvedValueOnce(makeContext("other-id", null, "Research"));

      await expect(
        service.createContext({ name: "Research", projectId: PROJECT_ID }),
      ).rejects.toThrow(TRPCError);
    });

    it("creates a child context under a parent", async () => {
      const { service, mockRepo } = buildService();

      await service.createContext({
        name: "Sub-context",
        projectId: PROJECT_ID,
        parentId: CONTEXT_ID,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: { connect: { id: CONTEXT_ID } },
        }),
      );
    });

    it("does not include parent connect when parentId is not provided", async () => {
      const { service, mockRepo } = buildService();

      await service.createContext({ name: "Root", projectId: PROJECT_ID });

      const call = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(call).not.toHaveProperty("parent");
    });
  });

  // ── getContextById ─────────────────────────────────────────────

  describe("getContextById", () => {
    it("returns the context when found", async () => {
      const { service } = buildService();

      const result = await service.getContextById(CONTEXT_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(CONTEXT_ID);
    });

    it("throws NOT_FOUND when context does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getContextById(CONTEXT_ID)).rejects.toThrow(TRPCError);
    });
  });

  // ── updateContext ──────────────────────────────────────────────

  describe("updateContext", () => {
    it("updates the context name", async () => {
      const { service, mockRepo } = buildService();

      await service.updateContext(CONTEXT_ID, { name: "Renamed" });

      expect(mockRepo.update).toHaveBeenCalledWith(
        CONTEXT_ID,
        expect.objectContaining({ name: "Renamed" }),
      );
    });

    it("throws NOT_FOUND when context does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.updateContext(CONTEXT_ID, { name: "New name" }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws CONFLICT when renamed to a name that already exists in scope", async () => {
      const { service, mockRepo } = buildService();
      // findById returns the existing context
      mockRepo.findById.mockResolvedValueOnce(makeContext(CONTEXT_ID, null, "Old Name"));
      // findByNameInScope returns a different context with the new name
      mockRepo.findByNameInScope.mockResolvedValueOnce(makeContext("other-id", null, "Taken Name"));

      await expect(
        service.updateContext(CONTEXT_ID, { name: "Taken Name" }),
      ).rejects.toThrow(TRPCError);
    });

    it("skips name uniqueness check when name is unchanged", async () => {
      const { service, mockRepo } = buildService();
      const ctx = makeContext(CONTEXT_ID, null, "Same Name");
      mockRepo.findById.mockResolvedValueOnce(ctx);

      await service.updateContext(CONTEXT_ID, { name: "Same Name" });

      expect(mockRepo.findByNameInScope).not.toHaveBeenCalled();
    });
  });

  // ── deleteContext ──────────────────────────────────────────────

  describe("deleteContext", () => {
    it("deletes the context", async () => {
      const { service, mockRepo } = buildService();

      await service.deleteContext(CONTEXT_ID);

      expect(mockRepo.delete).toHaveBeenCalledWith(CONTEXT_ID);
    });

    it("throws NOT_FOUND when context does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.deleteContext(CONTEXT_ID)).rejects.toThrow(TRPCError);
    });
  });

  // ── addUnit ────────────────────────────────────────────────────

  describe("addUnit", () => {
    it("delegates to repo.addUnit", async () => {
      const { service, mockRepo } = buildService();

      await service.addUnit(UNIT_ID, CONTEXT_ID);

      expect(mockRepo.addUnit).toHaveBeenCalledWith(UNIT_ID, CONTEXT_ID);
    });

    it("returns the upserted unitContext record", async () => {
      const { service } = buildService();

      const result = await service.addUnit(UNIT_ID, CONTEXT_ID);

      expect(result).toEqual({ unitId: UNIT_ID, contextId: CONTEXT_ID });
    });
  });

  // ── removeUnit ─────────────────────────────────────────────────

  describe("removeUnit", () => {
    it("delegates to repo.removeUnit", async () => {
      const { service, mockRepo } = buildService();

      await service.removeUnit(UNIT_ID, CONTEXT_ID);

      expect(mockRepo.removeUnit).toHaveBeenCalledWith(UNIT_ID, CONTEXT_ID);
    });
  });

  // ── listContexts ───────────────────────────────────────────────

  describe("listContexts", () => {
    it("returns contexts for a project", async () => {
      const { service, mockRepo } = buildService();

      const results = await service.listContexts(PROJECT_ID);

      expect(mockRepo.findMany).toHaveBeenCalledWith(PROJECT_ID, undefined);
      expect(results).toHaveLength(1);
    });

    it("filters by parentId when provided", async () => {
      const { service, mockRepo } = buildService();

      await service.listContexts(PROJECT_ID, CONTEXT_ID);

      expect(mockRepo.findMany).toHaveBeenCalledWith(PROJECT_ID, CONTEXT_ID);
    });

    it("filters for root-level contexts when parentId=null", async () => {
      const { service, mockRepo } = buildService();

      await service.listContexts(PROJECT_ID, null);

      expect(mockRepo.findMany).toHaveBeenCalledWith(PROJECT_ID, null);
    });
  });

  // ── reorderContexts ────────────────────────────────────────────

  describe("reorderContexts", () => {
    it("calls repo.reorderSiblings with the ordered IDs", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findMany.mockResolvedValueOnce([
        makeContext(CONTEXT_ID),
        makeContext(CHILD_CONTEXT_ID),
      ]);

      await service.reorderContexts([CHILD_CONTEXT_ID, CONTEXT_ID], PROJECT_ID, null);

      expect(mockRepo.reorderSiblings).toHaveBeenCalledWith([CHILD_CONTEXT_ID, CONTEXT_ID]);
    });

    it("throws BAD_REQUEST when an ID is not in the sibling scope", async () => {
      const { service, mockRepo } = buildService();
      // Only one sibling in scope
      mockRepo.findMany.mockResolvedValueOnce([makeContext(CONTEXT_ID)]);
      const unknownId = "c0000000-0000-0000-0000-000000000099";

      await expect(
        service.reorderContexts([CONTEXT_ID, unknownId], PROJECT_ID, null),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── moveContext ────────────────────────────────────────────────

  describe("moveContext", () => {
    it("delegates to repo.moveToParent after validation", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValue(makeContext(CONTEXT_ID, null, "Root"));

      await service.moveContext(CONTEXT_ID, null, PROJECT_ID);

      expect(mockRepo.moveToParent).toHaveBeenCalledWith(CONTEXT_ID, null);
    });

    it("throws NOT_FOUND when context to move does not exist", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.moveContext(CONTEXT_ID, null, PROJECT_ID),
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when moving a context into itself", async () => {
      const { service, mockRepo } = buildService();
      mockRepo.findById.mockResolvedValue(makeContext(CONTEXT_ID, null));

      await expect(
        service.moveContext(CONTEXT_ID, CONTEXT_ID, PROJECT_ID),
      ).rejects.toThrow(TRPCError);
    });
  });
});
