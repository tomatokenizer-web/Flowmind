import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProposalService, PROPOSAL_KINDS } from "@/server/services/proposalService";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const USER_ID = "user-abc";
const UNIT_ID = "b0000000-0000-0000-0000-000000000001";
const PROPOSAL_ID = "e0000000-0000-0000-0000-000000000001";

// ─── Mock DB ────────────────────────────────────────────────────────

const mockUnit = {
  findUnique: vi.fn(),
};

const mockProposal = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
};

const mockDb = {
  unit: mockUnit,
  proposal: mockProposal,
} as unknown as PrismaClient;

// ─── Tests ──────────────────────────────────────────────────────────

describe("proposalService", () => {
  let service: ReturnType<typeof createProposalService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createProposalService(mockDb);
  });

  describe("PROPOSAL_KINDS", () => {
    it("defines exactly 8 kinds", () => {
      expect(PROPOSAL_KINDS).toHaveLength(8);
    });

    it("includes all M.2 kinds", () => {
      expect(PROPOSAL_KINDS).toContain("reframe");
      expect(PROPOSAL_KINDS).toContain("counter");
      expect(PROPOSAL_KINDS).toContain("maturation");
      expect(PROPOSAL_KINDS).toContain("rule_action");
      expect(PROPOSAL_KINDS).toContain("import_merge");
      expect(PROPOSAL_KINDS).toContain("compounding");
      expect(PROPOSAL_KINDS).toContain("type_suggest");
      expect(PROPOSAL_KINDS).toContain("relation_suggest");
    });
  });

  describe("create", () => {
    it("creates a proposal with pending status", async () => {
      mockUnit.findUnique.mockResolvedValue({ id: UNIT_ID });
      const created = {
        id: PROPOSAL_ID,
        kind: "reframe",
        targetUnitId: UNIT_ID,
        userId: USER_ID,
        status: "pending",
        payload: { suggestion: "Try framing as a question" },
      };
      mockProposal.create.mockResolvedValue(created);

      const result = await service.create(
        { kind: "reframe", targetUnitId: UNIT_ID, payload: { suggestion: "Try framing as a question" } },
        USER_ID,
      );

      expect(result.status).toBe("pending");
      expect(result.kind).toBe("reframe");
      expect(mockProposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kind: "reframe",
          targetUnitId: UNIT_ID,
          userId: USER_ID,
          status: "pending",
        }),
      });
    });

    it("throws when target unit not found", async () => {
      mockUnit.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ kind: "counter", targetUnitId: UNIT_ID, payload: {} }, USER_ID),
      ).rejects.toThrow("Target unit not found");
    });

    it("creates without targetUnitId", async () => {
      mockProposal.create.mockResolvedValue({ id: PROPOSAL_ID, kind: "compounding", targetUnitId: null });

      const result = await service.create(
        { kind: "compounding", payload: { unitIds: ["a", "b"] } },
        USER_ID,
      );

      expect(result.targetUnitId).toBeNull();
      expect(mockUnit.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("resolve", () => {
    it("accepts a pending proposal", async () => {
      mockProposal.findUnique.mockResolvedValue({
        id: PROPOSAL_ID, status: "pending", userId: USER_ID,
      });
      mockProposal.update.mockResolvedValue({
        id: PROPOSAL_ID, status: "accepted", resolvedAt: new Date(),
      });

      const result = await service.resolve(PROPOSAL_ID, { status: "accepted" }, USER_ID);

      expect(result.status).toBe("accepted");
    });

    it("rejects a pending proposal", async () => {
      mockProposal.findUnique.mockResolvedValue({
        id: PROPOSAL_ID, status: "pending", userId: USER_ID,
      });
      mockProposal.update.mockResolvedValue({
        id: PROPOSAL_ID, status: "rejected", resolvedAt: new Date(),
      });

      const result = await service.resolve(PROPOSAL_ID, { status: "rejected" }, USER_ID);

      expect(result.status).toBe("rejected");
    });

    it("throws when proposal not found", async () => {
      mockProposal.findUnique.mockResolvedValue(null);

      await expect(
        service.resolve(PROPOSAL_ID, { status: "accepted" }, USER_ID),
      ).rejects.toThrow("Proposal not found");
    });

    it("throws when not owner", async () => {
      mockProposal.findUnique.mockResolvedValue({
        id: PROPOSAL_ID, status: "pending", userId: "other-user",
      });

      await expect(
        service.resolve(PROPOSAL_ID, { status: "accepted" }, USER_ID),
      ).rejects.toThrow("Not your proposal");
    });

    it("throws when already resolved", async () => {
      mockProposal.findUnique.mockResolvedValue({
        id: PROPOSAL_ID, status: "accepted", userId: USER_ID,
      });

      await expect(
        service.resolve(PROPOSAL_ID, { status: "rejected" }, USER_ID),
      ).rejects.toThrow("Proposal already accepted");
    });
  });

  describe("list", () => {
    it("lists proposals with pagination", async () => {
      mockProposal.findMany.mockResolvedValue([]);

      const result = await service.list({ userId: USER_ID, status: "pending" });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by kind", async () => {
      mockProposal.findMany.mockResolvedValue([]);

      await service.list({ kind: "type_suggest" });

      expect(mockProposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ kind: "type_suggest" }),
        }),
      );
    });
  });

  describe("expireStale", () => {
    it("expires old pending proposals", async () => {
      mockProposal.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.expireStale(7);

      expect(result.expiredCount).toBe(3);
      expect(mockProposal.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "pending" }),
          data: expect.objectContaining({ status: "expired" }),
        }),
      );
    });
  });

  describe("countPending", () => {
    it("counts pending proposals for user", async () => {
      mockProposal.count.mockResolvedValue(5);

      const result = await service.countPending(USER_ID);

      expect(result).toBe(5);
    });
  });
});
