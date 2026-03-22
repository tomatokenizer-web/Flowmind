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
import { suggestUnitType } from "@/server/services/typeHeuristicService";
import {
  BASE_UNIT_TYPES,
  UNIT_TYPE_COLORS,
  UNIT_TYPE_ICONS,
  UNIT_TYPE_DESCRIPTIONS,
  UNIT_TYPE_NATURALLY_FOLLOWS,
  getBaseUnitType,
  BASE_UNIT_TYPE_IDS,
} from "@/lib/unit-types";
import {
  DOMAIN_TEMPLATES,
  getDomainTypes,
  getDomainTypeWithBase,
  listDomainIds,
} from "@/lib/unit-type-config";
import { eventBus } from "@/server/events/eventBus";

// ─── Test Helpers ───────────────────────────────────────────────────

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

function createMockPrisma() {
  return {
    unit: {
      create: vi.fn().mockResolvedValue(mockUnit),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ ...mockUnit, perspectives: [], versions: [] }),
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

// ─── Unit Type Definitions ──────────────────────────────────────────

describe("unit type system", () => {
  describe("BASE_UNIT_TYPES", () => {
    it("defines exactly 9 base types", () => {
      expect(BASE_UNIT_TYPES).toHaveLength(9);
    });

    it("includes all required type ids", () => {
      const ids = BASE_UNIT_TYPES.map((t) => t.id);
      expect(ids).toEqual([
        "claim", "question", "evidence", "counterargument",
        "observation", "idea", "definition", "assumption", "action",
      ]);
    });

    it("each type has all required properties", () => {
      for (const type of BASE_UNIT_TYPES) {
        expect(type.id).toBeTruthy();
        expect(type.label).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(type.icon).toBeTruthy();
        expect(type.colors.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(type.colors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(Array.isArray(type.naturallyFollows)).toBe(true);
        expect(type.naturallyFollows.length).toBeGreaterThan(0);
      }
    });
  });

  describe("UNIT_TYPE_COLORS", () => {
    it("matches exact colors from project-context.md", () => {
      expect(UNIT_TYPE_COLORS.claim).toEqual({ bg: "#E8F0FE", accent: "#1A56DB" });
      expect(UNIT_TYPE_COLORS.question).toEqual({ bg: "#FEF3C7", accent: "#92400E" });
      expect(UNIT_TYPE_COLORS.evidence).toEqual({ bg: "#ECFDF5", accent: "#065F46" });
      expect(UNIT_TYPE_COLORS.counterargument).toEqual({ bg: "#FEF2F2", accent: "#991B1B" });
      expect(UNIT_TYPE_COLORS.observation).toEqual({ bg: "#F5F3FF", accent: "#4C1D95" });
      expect(UNIT_TYPE_COLORS.idea).toEqual({ bg: "#FFF7ED", accent: "#9A3412" });
      expect(UNIT_TYPE_COLORS.definition).toEqual({ bg: "#E0F2F1", accent: "#00695C" });
      expect(UNIT_TYPE_COLORS.assumption).toEqual({ bg: "#ECEFF1", accent: "#546E7A" });
      expect(UNIT_TYPE_COLORS.action).toEqual({ bg: "#E8EAF6", accent: "#283593" });
    });
  });

  describe("UNIT_TYPE_ICONS", () => {
    it("uses Lucide icon names for all types", () => {
      expect(Object.keys(UNIT_TYPE_ICONS)).toHaveLength(9);
      for (const icon of Object.values(UNIT_TYPE_ICONS)) {
        // Lucide icons use PascalCase
        expect(icon).toMatch(/^[A-Z][a-zA-Z]+$/);
      }
    });
  });

  describe("getBaseUnitType", () => {
    it("returns type definition for valid id", () => {
      const result = getBaseUnitType("claim");
      expect(result).toBeDefined();
      expect(result!.id).toBe("claim");
      expect(result!.label).toBe("Claim");
    });

    it("returns undefined for invalid id", () => {
      const result = getBaseUnitType("nonexistent" as "claim");
      expect(result).toBeUndefined();
    });
  });

  describe("BASE_UNIT_TYPE_IDS", () => {
    it("contains all 9 type ids", () => {
      expect(BASE_UNIT_TYPE_IDS).toHaveLength(9);
      expect(BASE_UNIT_TYPE_IDS).toContain("claim");
      expect(BASE_UNIT_TYPE_IDS).toContain("action");
    });
  });
});

// ─── Domain Type Config ─────────────────────────────────────────────

describe("domain type config", () => {
  describe("DOMAIN_TEMPLATES", () => {
    it("includes built-in domain templates", () => {
      expect(DOMAIN_TEMPLATES.length).toBeGreaterThanOrEqual(4);
      const ids = DOMAIN_TEMPLATES.map((d) => d.id);
      expect(ids).toContain("academic");
      expect(ids).toContain("product");
      expect(ids).toContain("legal");
      expect(ids).toContain("philosophy");
    });

    it("each domain type maps to a valid base type", () => {
      for (const domain of DOMAIN_TEMPLATES) {
        for (const type of domain.types) {
          expect(BASE_UNIT_TYPE_IDS).toContain(type.baseType);
        }
      }
    });
  });

  describe("getDomainTypes", () => {
    it("returns types for a valid domain", () => {
      const types = getDomainTypes("academic");
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]!.domain).toBe("academic");
    });

    it("returns empty array for unknown domain", () => {
      const types = getDomainTypes("nonexistent");
      expect(types).toEqual([]);
    });
  });

  describe("getDomainTypeWithBase", () => {
    it("returns domain type with inherited base type", () => {
      const result = getDomainTypeWithBase("academic", "hypothesis");
      expect(result).toBeDefined();
      expect(result!.baseType).toBe("claim");
      expect(result!.base.colors).toEqual(UNIT_TYPE_COLORS.claim);
    });

    it("returns undefined for unknown type", () => {
      expect(getDomainTypeWithBase("academic", "nonexistent")).toBeUndefined();
    });

    it("returns undefined for unknown domain", () => {
      expect(getDomainTypeWithBase("nonexistent", "hypothesis")).toBeUndefined();
    });
  });

  describe("listDomainIds", () => {
    it("returns all domain ids", () => {
      const ids = listDomainIds();
      expect(ids).toContain("academic");
      expect(ids).toContain("product");
    });
  });
});

// ─── Heuristic Type Assignment ──────────────────────────────────────

describe("typeHeuristicService", () => {
  describe("suggestUnitType", () => {
    // Question detection
    it("detects question by trailing ?", () => {
      const result = suggestUnitType("Is this a valid approach?");
      expect(result.unitType).toBe("question");
      expect(result.confidence).toBe("high");
    });

    it("detects question by leading question word", () => {
      const result = suggestUnitType("How does this work");
      expect(result.unitType).toBe("question");
      expect(result.confidence).toBe("medium");
    });

    // Counterargument detection
    it("detects counterargument by 'But'", () => {
      const result = suggestUnitType("But this contradicts the earlier finding");
      expect(result.unitType).toBe("counterargument");
      expect(result.confidence).toBe("high");
    });

    it("detects counterargument by 'However'", () => {
      const result = suggestUnitType("However, there are limitations");
      expect(result.unitType).toBe("counterargument");
      expect(result.confidence).toBe("high");
    });

    // Evidence detection
    it("detects evidence by 'For example'", () => {
      const result = suggestUnitType("For example, the 2024 study showed...");
      expect(result.unitType).toBe("evidence");
      expect(result.confidence).toBe("high");
    });

    it("detects evidence by 'For instance'", () => {
      const result = suggestUnitType("For instance, this pattern is common in distributed systems");
      expect(result.unitType).toBe("evidence");
      expect(result.confidence).toBe("high");
    });

    it("detects evidence by citation pattern", () => {
      const result = suggestUnitType("Smith (2024) demonstrated this effect");
      expect(result.unitType).toBe("evidence");
      expect(result.confidence).toBe("medium");
    });

    // Idea detection
    it("detects idea by 'Perhaps'", () => {
      const result = suggestUnitType("Perhaps we approached it differently");
      expect(result.unitType).toBe("idea");
      expect(result.confidence).toBe("high");
    });

    it("detects idea by 'Maybe'", () => {
      const result = suggestUnitType("Maybe we could use a different algorithm");
      expect(result.unitType).toBe("idea");
      expect(result.confidence).toBe("high");
    });

    // Definition detection
    it("detects definition by 'is defined as'", () => {
      const result = suggestUnitType("A monad is defined as a monoid in the category of endofunctors");
      expect(result.unitType).toBe("definition");
      expect(result.confidence).toBe("high");
    });

    // Assumption detection
    it("detects assumption by 'Assuming'", () => {
      const result = suggestUnitType("Assuming the data is normally distributed");
      expect(result.unitType).toBe("assumption");
      expect(result.confidence).toBe("high");
    });

    // Action detection
    it("detects action by 'TODO'", () => {
      const result = suggestUnitType("TODO: implement the error handling");
      expect(result.unitType).toBe("action");
      expect(result.confidence).toBe("high");
    });

    it("detects action by 'We need to'", () => {
      const result = suggestUnitType("We need to refactor the authentication module");
      expect(result.unitType).toBe("action");
      expect(result.confidence).toBe("high");
    });

    // Claim detection
    it("detects claim by 'I think'", () => {
      const result = suggestUnitType("I think this approach is better");
      expect(result.unitType).toBe("claim");
      expect(result.confidence).toBe("high");
    });

    it("detects claim by 'I believe'", () => {
      const result = suggestUnitType("I believe the architecture needs revision");
      expect(result.unitType).toBe("claim");
      expect(result.confidence).toBe("high");
    });

    // Fallback to observation
    it("falls back to observation for unmatched content", () => {
      const result = suggestUnitType("The sky appears blue during daytime");
      expect(result.unitType).toBe("observation");
      expect(result.confidence).toBe("low");
      expect(result.matchedRule).toBe("fallback_observation");
    });

    it("falls back to observation for generic statements", () => {
      const result = suggestUnitType("There are many approaches to this problem");
      expect(result.unitType).toBe("observation");
      expect(result.confidence).toBe("low");
    });

    // Case insensitivity
    it("is case-insensitive", () => {
      expect(suggestUnitType("HOWEVER, this is wrong").unitType).toBe("counterargument");
      expect(suggestUnitType("i think this is right").unitType).toBe("claim");
      expect(suggestUnitType("FOR EXAMPLE, see this").unitType).toBe("evidence");
    });

    // Whitespace handling
    it("handles leading/trailing whitespace", () => {
      const result = suggestUnitType("  Is this correct?  ");
      expect(result.unitType).toBe("question");
    });
  });
});

// ─── Unit Type tRPC Router ──────────────────────────────────────────

describe("unitType router", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  describe("unitType.listBaseTypes", () => {
    it("returns all 9 base types", async () => {
      const result = await caller.unitType.listBaseTypes();
      expect(result).toHaveLength(9);
      expect(result[0]!.id).toBe("claim");
      expect(result[0]!.colors).toBeDefined();
      expect(result[0]!.icon).toBeDefined();
      expect(result[0]!.naturallyFollows).toBeDefined();
    });
  });

  describe("unitType.listDomainTypes", () => {
    it("returns domain types for a valid domain", async () => {
      const result = await caller.unitType.listDomainTypes({ domainId: "academic" });
      expect(result.domainId).toBe("academic");
      expect(result.types.length).toBeGreaterThan(0);
    });

    it("returns empty types for unknown domain", async () => {
      const result = await caller.unitType.listDomainTypes({ domainId: "unknown" });
      expect(result.types).toEqual([]);
    });
  });

  describe("unitType.listDomains", () => {
    it("returns all domain templates", async () => {
      const result = await caller.unitType.listDomains();
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]!.id).toBeDefined();
      expect(result[0]!.label).toBeDefined();
      expect(result[0]!.typeCount).toBeGreaterThan(0);
    });
  });

  describe("unitType.suggestType", () => {
    it("suggests question for content ending with ?", async () => {
      const result = await caller.unitType.suggestType({ content: "Is this correct?" });
      expect(result.unitType).toBe("question");
      expect(result.confidence).toBe("high");
    });

    it("suggests observation for generic content", async () => {
      const result = await caller.unitType.suggestType({ content: "The sun is bright" });
      expect(result.unitType).toBe("observation");
    });

    it("validates content is required", async () => {
      await expect(
        caller.unitType.suggestType({ content: "" }),
      ).rejects.toThrow();
    });
  });
});

// ─── Heuristic Integration with Unit Creation ───────────────────────

describe("unit creation with heuristic type assignment", () => {
  let mockDb: PrismaClient;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    mockDb = createMockPrisma();
    caller = createTestCaller(mockDb);
  });

  it("auto-assigns question type when content ends with ?", async () => {
    await caller.unit.create({
      content: "Is this the right approach?",
      projectId: TEST_PROJECT_ID,
    });

    expect(mockDb.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitType: "question",
        lifecycle: "confirmed",
      }),
    });
  });

  it("auto-assigns counterargument type for contrast markers", async () => {
    await caller.unit.create({
      content: "However, this has significant drawbacks",
      projectId: TEST_PROJECT_ID,
    });

    expect(mockDb.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitType: "counterargument",
        lifecycle: "confirmed",
      }),
    });
  });

  it("uses explicit type when provided (no heuristic)", async () => {
    await caller.unit.create({
      content: "Is this a question?",
      projectId: TEST_PROJECT_ID,
      unitType: "claim",
    });

    expect(mockDb.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitType: "claim",
        lifecycle: "confirmed", // explicitly typed → confirmed
      }),
    });
  });

  it("auto-assigned types set lifecycle to confirmed for user-authored (AC #2)", async () => {
    await caller.unit.create({
      content: "The sky is blue today",
      projectId: TEST_PROJECT_ID,
    });

    expect(mockDb.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitType: "observation", // fallback
        lifecycle: "confirmed",
      }),
    });
  });

  it("type assignment is global, not perspective-based (AC #6)", async () => {
    // When creating a unit, the type is set on the unit itself, not on a perspective
    await caller.unit.create({
      content: "I think this is important",
      projectId: TEST_PROJECT_ID,
    });

    const createCall = (mockDb.unit.create as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(createCall.data.unitType).toBe("claim");
    // No perspective-specific type override
    expect(createCall.data.perspectives).toBeUndefined();
  });
});
