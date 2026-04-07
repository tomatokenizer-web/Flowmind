import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInquiryService } from "@/server/services/inquiryService";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const PURSUIT_ID = "c0000000-0000-0000-0000-000000000001";
const INQUIRY_ID = "d0000000-0000-0000-0000-000000000001";

// ─── Mock DB ────────────────────────────────────────────────────────

const mockPursuit = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockInquiry = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockPivotEvent = {
  create: vi.fn(),
  findMany: vi.fn(),
};

const mockDb = {
  pursuit: mockPursuit,
  inquiry: mockInquiry,
  pivotEvent: mockPivotEvent,
} as unknown as PrismaClient;

// ─── Tests ──────────────────────────────────────────────────────────

describe("inquiryService", () => {
  let service: ReturnType<typeof createInquiryService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createInquiryService(mockDb);
  });

  describe("Pursuit CRUD", () => {
    it("creates a pursuit with defaults", async () => {
      const created = { id: PURSUIT_ID, name: "Test Pursuit", projectId: PROJECT_ID, status: "active_pursuit" };
      mockPursuit.create.mockResolvedValue(created);

      const result = await service.createPursuit({ name: "Test Pursuit", projectId: PROJECT_ID });

      expect(result).toEqual(created);
      expect(mockPursuit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Pursuit",
          projectId: PROJECT_ID,
          status: "active_pursuit",
        }),
      });
    });

    it("lists pursuits for a project", async () => {
      mockPursuit.findMany.mockResolvedValue([]);

      const result = await service.listPursuits(PROJECT_ID);

      expect(result).toEqual([]);
      expect(mockPursuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID },
        }),
      );
    });

    it("updates pursuit status", async () => {
      const updated = { id: PURSUIT_ID, status: "paused_pursuit" };
      mockPursuit.update.mockResolvedValue(updated);

      const result = await service.updatePursuit(PURSUIT_ID, { status: "paused_pursuit" });

      expect(result.status).toBe("paused_pursuit");
    });

    it("deletes a pursuit", async () => {
      mockPursuit.delete.mockResolvedValue({ id: PURSUIT_ID });

      await service.deletePursuit(PURSUIT_ID);

      expect(mockPursuit.delete).toHaveBeenCalledWith({ where: { id: PURSUIT_ID } });
    });
  });

  describe("Inquiry CRUD", () => {
    it("creates an inquiry with defaults", async () => {
      mockPursuit.findUnique.mockResolvedValue({ id: PURSUIT_ID });
      const created = { id: INQUIRY_ID, title: "Test Inquiry", pursuitId: PURSUIT_ID, formation: "organic", status: "exploring" };
      mockInquiry.create.mockResolvedValue(created);

      const result = await service.createInquiry({ title: "Test Inquiry", pursuitId: PURSUIT_ID });

      expect(result.title).toBe("Test Inquiry");
      expect(result.formation).toBe("organic");
      expect(result.status).toBe("exploring");
    });

    it("throws when pursuit not found on create", async () => {
      mockPursuit.findUnique.mockResolvedValue(null);

      await expect(
        service.createInquiry({ title: "Test", pursuitId: PURSUIT_ID }),
      ).rejects.toThrow("Pursuit not found");
    });

    it("creates inquiry with starting questions", async () => {
      mockPursuit.findUnique.mockResolvedValue({ id: PURSUIT_ID });
      mockInquiry.create.mockResolvedValue({ id: INQUIRY_ID });

      await service.createInquiry({
        title: "Research",
        pursuitId: PURSUIT_ID,
        formation: "top_down",
        startingQuestions: ["What is X?", "How does Y work?"],
      });

      expect(mockInquiry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          formation: "top_down",
          startingQuestions: ["What is X?", "How does Y work?"],
        }),
      });
    });

    it("updates inquiry compass", async () => {
      mockInquiry.update.mockResolvedValue({ id: INQUIRY_ID, compass: { direction: "north" } });

      const result = await service.updateInquiry(INQUIRY_ID, { compass: { direction: "north" } });

      expect(result.compass).toEqual({ direction: "north" });
    });

    it("lists inquiries for a pursuit", async () => {
      mockInquiry.findMany.mockResolvedValue([]);

      const result = await service.listInquiries(PURSUIT_ID);

      expect(result).toEqual([]);
      expect(mockInquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pursuitId: PURSUIT_ID },
        }),
      );
    });
  });

  describe("Pivot Events", () => {
    it("creates a pivot event", async () => {
      mockInquiry.findUnique.mockResolvedValue({ id: INQUIRY_ID });
      const created = { id: "pivot-1", inquiryId: INQUIRY_ID, reason: "Scope changed", fromGoal: "A", toGoal: "B" };
      mockPivotEvent.create.mockResolvedValue(created);

      const result = await service.createPivotEvent({
        inquiryId: INQUIRY_ID,
        reason: "Scope changed",
        fromGoal: "A",
        toGoal: "B",
      });

      expect(result.reason).toBe("Scope changed");
      expect(result.fromGoal).toBe("A");
      expect(result.toGoal).toBe("B");
    });

    it("throws when inquiry not found on pivot create", async () => {
      mockInquiry.findUnique.mockResolvedValue(null);

      await expect(
        service.createPivotEvent({ inquiryId: INQUIRY_ID, reason: "Test" }),
      ).rejects.toThrow("Inquiry not found");
    });

    it("lists pivot events for an inquiry", async () => {
      mockPivotEvent.findMany.mockResolvedValue([]);

      const result = await service.listPivotEvents(INQUIRY_ID);

      expect(result).toEqual([]);
    });
  });
});
