import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLifecycleService,
  InvalidTransitionError,
  LIFECYCLE_TRANSITIONS,
} from "@/server/services/lifecycleService";
import { eventBus } from "@/server/events/eventBus";
import type { PrismaClient } from "@prisma/client";

// ─── Constants ─────────────────────────────────────────────────────

const USER_ID = "user-abc";
const UNIT_ID = "b0000000-0000-0000-0000-000000000001";

// ─── Mock Data ──────────────────────────────────────────────────────

function makeUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: UNIT_ID,
    content: "Test unit",
    lifecycleState: "draft" as const,
    lifecycle: "draft" as const,
    ...overrides,
  };
}

// ─── Mock DB ────────────────────────────────────────────────────────

const mockUnit = {
  findFirst: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};

const mockDb = {
  unit: mockUnit,
} as unknown as PrismaClient;

// ─── Spy on eventBus ────────────────────────────────────────────────

vi.spyOn(eventBus, "emit").mockResolvedValue(undefined);

// ─── Tests ──────────────────────────────────────────────────────────

describe("lifecycleService", () => {
  let service: ReturnType<typeof createLifecycleService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createLifecycleService(mockDb);
  });

  describe("LIFECYCLE_TRANSITIONS", () => {
    it("defines transitions for all 4 states", () => {
      expect(Object.keys(LIFECYCLE_TRANSITIONS)).toHaveLength(4);
      expect(LIFECYCLE_TRANSITIONS).toHaveProperty("draft");
      expect(LIFECYCLE_TRANSITIONS).toHaveProperty("confirmed");
      expect(LIFECYCLE_TRANSITIONS).toHaveProperty("deferred");
      expect(LIFECYCLE_TRANSITIONS).toHaveProperty("archived");
    });

    it("draft can transition to confirmed or deferred", () => {
      expect(LIFECYCLE_TRANSITIONS.draft).toContain("confirmed");
      expect(LIFECYCLE_TRANSITIONS.draft).toContain("deferred");
    });

    it("confirmed can transition to deferred or archived", () => {
      expect(LIFECYCLE_TRANSITIONS.confirmed).toContain("deferred");
      expect(LIFECYCLE_TRANSITIONS.confirmed).toContain("archived");
    });

    it("deferred can transition back to draft or archived", () => {
      expect(LIFECYCLE_TRANSITIONS.deferred).toContain("draft");
      expect(LIFECYCLE_TRANSITIONS.deferred).toContain("archived");
    });

    it("archived can transition back to draft", () => {
      expect(LIFECYCLE_TRANSITIONS.archived).toContain("draft");
    });
  });

  describe("transition", () => {
    it("transitions draft → confirmed", async () => {
      const unit = makeUnit({ lifecycleState: "draft" });
      mockUnit.findFirst.mockResolvedValue(unit);
      mockUnit.update.mockResolvedValue({ ...unit, lifecycleState: "confirmed" });

      const result = await service.transition(UNIT_ID, "confirmed", USER_ID);

      expect(result).not.toBeNull();
      expect(result!.unit.lifecycleState).toBe("confirmed");
      expect(result!.previousState).toBe("draft");
      expect(mockUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: UNIT_ID },
          data: expect.objectContaining({ lifecycleState: "confirmed" }),
        }),
      );
    });

    it("transitions confirmed → archived", async () => {
      const unit = makeUnit({ lifecycleState: "confirmed" });
      mockUnit.findFirst.mockResolvedValue(unit);
      mockUnit.update.mockResolvedValue({ ...unit, lifecycleState: "archived" });

      const result = await service.transition(UNIT_ID, "archived", USER_ID);

      expect(result).not.toBeNull();
      expect(result!.unit.lifecycleState).toBe("archived");
      expect(result!.previousState).toBe("confirmed");
    });

    it("transitions archived → draft (reactivation)", async () => {
      const unit = makeUnit({ lifecycleState: "archived" });
      mockUnit.findFirst.mockResolvedValue(unit);
      mockUnit.update.mockResolvedValue({ ...unit, lifecycleState: "draft" });

      const result = await service.transition(UNIT_ID, "draft", USER_ID);

      expect(result).not.toBeNull();
      expect(result!.unit.lifecycleState).toBe("draft");
      expect(result!.previousState).toBe("archived");
    });

    it("throws InvalidTransitionError for draft → archived", async () => {
      const unit = makeUnit({ lifecycleState: "draft" });
      mockUnit.findFirst.mockResolvedValue(unit);

      await expect(
        service.transition(UNIT_ID, "archived", USER_ID),
      ).rejects.toThrow(InvalidTransitionError);
    });

    it("throws InvalidTransitionError for archived → confirmed", async () => {
      const unit = makeUnit({ lifecycleState: "archived" });
      mockUnit.findFirst.mockResolvedValue(unit);

      await expect(
        service.transition(UNIT_ID, "confirmed", USER_ID),
      ).rejects.toThrow(InvalidTransitionError);
    });

    it("returns null when unit not found", async () => {
      mockUnit.findFirst.mockResolvedValue(null);

      const result = await service.transition(UNIT_ID, "confirmed", USER_ID);

      expect(result).toBeNull();
    });

    it("emits unit.lifecycleChanged event", async () => {
      const unit = makeUnit({ lifecycleState: "draft" });
      mockUnit.findFirst.mockResolvedValue(unit);
      mockUnit.update.mockResolvedValue({ ...unit, lifecycleState: "confirmed" });

      await service.transition(UNIT_ID, "confirmed", USER_ID);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unit.lifecycleChanged",
          payload: expect.objectContaining({
            unitId: UNIT_ID,
            userId: USER_ID,
          }),
        }),
      );
    });

    it("no-ops when target equals current state", async () => {
      const unit = makeUnit({ lifecycleState: "draft" });
      mockUnit.findFirst.mockResolvedValue(unit);

      const result = await service.transition(UNIT_ID, "draft", USER_ID);

      expect(result!.previousState).toBe("draft");
      expect(mockUnit.update).not.toHaveBeenCalled();
    });
  });

  describe("canTransition", () => {
    it("returns true for valid transitions", () => {
      expect(service.canTransition("draft", "confirmed")).toBe(true);
      expect(service.canTransition("confirmed", "archived")).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      expect(service.canTransition("draft", "archived")).toBe(false);
      expect(service.canTransition("archived", "confirmed")).toBe(false);
    });
  });

  describe("getAvailableTransitions", () => {
    it("returns available target states for draft", () => {
      const targets = service.getAvailableTransitions("draft");
      expect(targets).toEqual(expect.arrayContaining(["confirmed", "deferred"]));
    });

    it("returns empty array for unknown state", () => {
      const targets = service.getAvailableTransitions("nonexistent" as never);
      expect(targets).toEqual([]);
    });
  });
});
