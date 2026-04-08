import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildGreedyPath,
  computeSemanticImportance,
  type RelationEdge,
} from "@/server/services/navigatorService";

// ─── Mock DB ────────────────────────────────────────────────────────

const UNIT_A = "a0000000-0000-0000-0000-000000000001";
const UNIT_B = "b0000000-0000-0000-0000-000000000002";
const UNIT_C = "c0000000-0000-0000-0000-000000000003";
const UNIT_D = "d0000000-0000-0000-0000-000000000004";
const CONTEXT_ID = "c0000000-0000-0000-0000-000000000010";

const mockUnitContext = {
  findMany: vi.fn(),
};

const mockUnit = {
  findMany: vi.fn(),
};

const mockRelation = {
  findMany: vi.fn(),
};

const mockNavigator = {
  create: vi.fn(),
};

const mockDb = {
  unitContext: mockUnitContext,
  unit: mockUnit,
  relation: mockRelation,
  navigator: mockNavigator,
} as unknown as import("@prisma/client").PrismaClient;

// ─── Mock relation service ──────────────────────────────────────────

vi.mock("@/server/services/relationService", () => ({
  createRelationService: () => ({
    neighborsByDepth: vi.fn().mockResolvedValue({ relations: [], layers: [] }),
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { createNavigatorService } from "@/server/services/navigatorService";

// ─── Tests ──────────────────────────────────────────────────────────

describe("navigatorService", () => {
  let service: ReturnType<typeof createNavigatorService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createNavigatorService(mockDb);
  });

  describe("buildGreedyPath", () => {
    it("returns single-node path when no relations", () => {
      const path = buildGreedyPath(UNIT_A, [], null);
      expect(path).toEqual([UNIT_A]);
    });

    it("traverses along weighted edges", () => {
      const relations: RelationEdge[] = [
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_B, targetUnitId: UNIT_C, type: "supports", strength: 0.8, direction: "one_way" },
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_D, type: "references", strength: 0.3, direction: "bidirectional" },
      ];

      const path = buildGreedyPath(UNIT_A, relations, null);

      expect(path[0]).toBe(UNIT_A);
      // Should prefer higher-weight edge (supports A→B over references A→D)
      expect(path[1]).toBe(UNIT_B);
      expect(path[2]).toBe(UNIT_C);
      // D is reachable only through A (already visited), so greedy walk ends at C
      expect(path).toHaveLength(3);
    });

    it("filters by allowed types", () => {
      const relations: RelationEdge[] = [
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_C, type: "contradicts", strength: 0.9, direction: "one_way" },
      ];

      const path = buildGreedyPath(UNIT_A, relations, ["contradicts"]);

      expect(path).toEqual([UNIT_A, UNIT_C]);
    });

    it("respects maxSteps limit", () => {
      const relations: RelationEdge[] = [
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_B, targetUnitId: UNIT_C, type: "supports", strength: 0.8, direction: "one_way" },
        { sourceUnitId: UNIT_C, targetUnitId: UNIT_D, type: "supports", strength: 0.7, direction: "one_way" },
      ];

      const path = buildGreedyPath(UNIT_A, relations, null, 2);

      // Start + 2 steps = 3 nodes max
      expect(path.length).toBeLessThanOrEqual(3);
    });

    it("does not revisit nodes", () => {
      // Cycle: A→B→C→A
      const relations: RelationEdge[] = [
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_B, targetUnitId: UNIT_C, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_C, targetUnitId: UNIT_A, type: "supports", strength: 0.9, direction: "one_way" },
      ];

      const path = buildGreedyPath(UNIT_A, relations, null);

      const unique = new Set(path);
      expect(unique.size).toBe(path.length);
    });
  });

  describe("computeSemanticImportance", () => {
    it("computes weighted sum correctly", () => {
      const score = computeSemanticImportance({
        betweennessCentrality: 1.0,
        relationCount: 1.0,
        certaintyWeight: 1.0,
        recencyWeight: 1.0,
        userDesignatedWeight: 1.0,
      });
      expect(score).toBeCloseTo(1.0);
    });

    it("returns 0 for all-zero factors", () => {
      const score = computeSemanticImportance({
        betweennessCentrality: 0,
        relationCount: 0,
        certaintyWeight: 0,
        recencyWeight: 0,
        userDesignatedWeight: 0,
      });
      expect(score).toBe(0);
    });

    it("weights betweenness centrality highest", () => {
      const high = computeSemanticImportance({
        betweennessCentrality: 1.0,
        relationCount: 0,
        certaintyWeight: 0,
        recencyWeight: 0,
        userDesignatedWeight: 0,
      });
      const low = computeSemanticImportance({
        betweennessCentrality: 0,
        relationCount: 1.0,
        certaintyWeight: 0,
        recencyWeight: 0,
        userDesignatedWeight: 0,
      });
      expect(high).toBeGreaterThan(low);
    });
  });

  describe("generatePath", () => {
    const mockUnits = [
      { id: UNIT_A, content: "First thought", unitType: "claim", importance: 0.8, createdAt: new Date("2026-01-01") },
      { id: UNIT_B, content: "Second thought", unitType: "evidence", importance: 0.5, createdAt: new Date("2026-01-02") },
      { id: UNIT_C, content: "Third thought", unitType: "question", importance: 0.3, createdAt: new Date("2026-01-03") },
    ];

    beforeEach(() => {
      mockUnitContext.findMany.mockResolvedValue(
        mockUnits.map((u) => ({ unitId: u.id })),
      );
      mockUnit.findMany.mockResolvedValue(mockUnits);
      mockRelation.findMany.mockResolvedValue([]);
    });

    it("generates discovery path in chronological order", async () => {
      const result = await service.generatePath("discovery", CONTEXT_ID);

      expect(result.path).toEqual([UNIT_A, UNIT_B, UNIT_C]);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0]).toEqual({ unitId: UNIT_A, position: 0 });
    });

    it("generates question_anchored path with questions first", async () => {
      const result = await service.generatePath("question_anchored", CONTEXT_ID);

      expect(result.path[0]).toBe(UNIT_C); // question type first
    });

    it("generates gap_focused path with low-relation units first", async () => {
      // UNIT_A has 2 relations, B has 1, C has 0
      mockRelation.findMany.mockResolvedValue([
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_C, type: "references", strength: 0.5, direction: "one_way" },
      ]);

      const result = await service.generatePath("gap_focused", CONTEXT_ID);

      // C has fewest relations (1 as target), should be first
      // Actually let me reconsider: C has 1 relation (as target of A→C), B has 1 (as target of A→B), A has 2
      // So C and B are tied, A is last
      expect(result.path[result.path.length - 1]).toBe(UNIT_A); // most connected last
    });

    it("returns empty path when no units in context", async () => {
      mockUnitContext.findMany.mockResolvedValue([]);
      mockUnit.findMany.mockResolvedValue([]);

      const result = await service.generatePath("argument", CONTEXT_ID);

      expect(result.path).toEqual([]);
      expect(result.steps).toEqual([]);
    });
  });

  describe("computeImportanceScores", () => {
    it("returns scores for all units in context", async () => {
      const mockUnits = [
        { id: UNIT_A, content: "Claim", unitType: "claim", importance: 0.8, createdAt: new Date("2026-01-01") },
        { id: UNIT_B, content: "Evidence", unitType: "evidence", importance: 0.5, createdAt: new Date("2026-01-02") },
      ];
      mockUnitContext.findMany.mockResolvedValue(
        mockUnits.map((u) => ({ unitId: u.id })),
      );
      mockUnit.findMany.mockResolvedValue(mockUnits);
      mockRelation.findMany.mockResolvedValue([
        { sourceUnitId: UNIT_A, targetUnitId: UNIT_B, type: "supports", strength: 0.9, direction: "one_way" },
      ]);

      const scores = await service.computeImportanceScores(CONTEXT_ID);

      expect(scores.size).toBe(2);
      expect(scores.has(UNIT_A)).toBe(true);
      expect(scores.has(UNIT_B)).toBe(true);
      // Both should be between 0 and 1
      expect(scores.get(UNIT_A)!).toBeGreaterThanOrEqual(0);
      expect(scores.get(UNIT_A)!).toBeLessThanOrEqual(1);
    });

    it("returns empty map for empty context", async () => {
      mockUnitContext.findMany.mockResolvedValue([]);
      mockUnit.findMany.mockResolvedValue([]);

      const scores = await service.computeImportanceScores(CONTEXT_ID);

      expect(scores.size).toBe(0);
    });
  });

  describe("createWithPath", () => {
    it("creates navigator with generated path and steps", async () => {
      const mockUnits = [
        { id: UNIT_A, content: "First", unitType: "claim", importance: 0.8, createdAt: new Date("2026-01-01") },
        { id: UNIT_B, content: "Second", unitType: "evidence", importance: 0.5, createdAt: new Date("2026-01-02") },
      ];
      mockUnitContext.findMany.mockResolvedValue(
        mockUnits.map((u) => ({ unitId: u.id })),
      );
      mockUnit.findMany.mockResolvedValue(mockUnits);
      mockRelation.findMany.mockResolvedValue([]);
      mockNavigator.create.mockResolvedValue({
        id: "nav-1",
        name: "Test Path",
        pathType: "discovery",
        path: [UNIT_A, UNIT_B],
      });

      await service.createWithPath({
        name: "Test Path",
        pathType: "discovery",
        contextId: CONTEXT_ID,
        aiGenerated: true,
      });

      expect(mockNavigator.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Path",
          pathType: "discovery",
          contextId: CONTEXT_ID,
          aiGenerated: true,
          path: [UNIT_A, UNIT_B],
          steps: [
            { unitId: UNIT_A, position: 0 },
            { unitId: UNIT_B, position: 1 },
          ],
        }),
      });
    });
  });
});
