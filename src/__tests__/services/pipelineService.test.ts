import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PassName, PassResult } from "@/server/services/pipelineService";

// ─── Mock AI Provider ───────────────────────────────────────────────

const mockGenerateStructured = vi.fn();

vi.mock("@/server/ai/provider", () => ({
  getAIProvider: () => ({
    generateStructured: mockGenerateStructured,
  }),
}));

// ─── Mock DB ────────────────────────────────────────────────────────

const UNIT_ID = "b0000000-0000-0000-0000-000000000001";
const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const CONTEXT_ID = "c0000000-0000-0000-0000-000000000001";
const USER_ID = "user-abc";

const mockUnit = {
  create: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
};

const mockProposal = {
  create: vi.fn(),
};

const mockUnitContext = {
  create: vi.fn(),
};

const mockDb = {
  unit: mockUnit,
  proposal: mockProposal,
  unitContext: mockUnitContext,
} as unknown as import("@prisma/client").PrismaClient;

// ─── Import after mocks ─────────────────────────────────────────────

import { createPipelineService } from "@/server/services/pipelineService";

// ─── Tests ──────────────────────────────────────────────────────────

describe("pipelineService", () => {
  let service: ReturnType<typeof createPipelineService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createPipelineService(mockDb);

    // Default: unit.create returns a unit
    mockUnit.create.mockResolvedValue({
      id: UNIT_ID,
      content: "Test content",
      unitType: "claim",
      lifecycle: "draft",
    });
    mockUnit.update.mockResolvedValue({ id: UNIT_ID });
    mockUnit.findMany.mockResolvedValue([]);
    mockUnit.findUnique.mockResolvedValue(null);
  });

  describe("processInput — quick mode", () => {
    it("runs classification and enrichment, skips decomposition/salience/integrity", async () => {
      // Classification pass
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "claim", confidence: 0.9, reasoning: "Asserts a position" })
        // Enrichment pass
        .mockResolvedValueOnce({
          epistemicAct: "assert",
          epistemicOrigin: "first_person_inference",
          applicabilityScope: "domain_universal",
          temporalValidity: "durable",
          revisability: "evidence_revisable",
          voice: "original",
          confidence: 0.8,
          reasoning: "Based on content analysis",
        });

      const result = await service.processInput(
        { content: "Democracy protects minorities", projectId: PROJECT_ID, mode: "quick" },
        USER_ID,
      );

      expect(result.unitId).toBe(UNIT_ID);
      expect(result.success).toBe(true);
      expect(result.passes).toHaveLength(7);

      // Decomposition should be skipped
      const decomp = result.passes.find((p) => p.pass === "decomposition");
      expect(decomp?.status).toBe("skipped");

      // Classification should complete
      const classif = result.passes.find((p) => p.pass === "classification");
      expect(classif?.status).toBe("completed");

      // Enrichment should complete
      const enrich = result.passes.find((p) => p.pass === "enrichment");
      expect(enrich?.status).toBe("completed");

      // Salience/integrity skipped in quick mode
      const salience = result.passes.find((p) => p.pass === "salience");
      expect(salience?.status).toBe("skipped");
      const integrity = result.passes.find((p) => p.pass === "integrity");
      expect(integrity?.status).toBe("skipped");
    });

    it("creates unit with classified type", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "question", confidence: 0.85, reasoning: "Asks something" })
        .mockResolvedValueOnce({
          epistemicAct: "ask", epistemicOrigin: null, applicabilityScope: null,
          temporalValidity: null, revisability: null, voice: "original",
          confidence: 0.7, reasoning: "Query form",
        });

      await service.processInput(
        { content: "What is democracy?", projectId: PROJECT_ID, mode: "quick" },
        USER_ID,
      );

      expect(mockUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitType: "question",
            lifecycle: "draft",
            lifecycleState: "draft",
          }),
        }),
      );
    });
  });

  describe("processInput — full mode", () => {
    it("runs all 7 passes", async () => {
      mockGenerateStructured
        // Pass 2: Classification
        .mockResolvedValueOnce({ unitType: "claim", confidence: 0.9, reasoning: "Assert" })
        // Pass 3: Enrichment
        .mockResolvedValueOnce({
          epistemicAct: "assert", epistemicOrigin: "first_person_inference",
          applicabilityScope: "universal", temporalValidity: "atemporal",
          revisability: "evidence_revisable", voice: "original",
          confidence: 0.85, reasoning: "Analysis",
        })
        // Pass 4: Relations (no existing units)
        // (findMany returns [] so this is skipped internally but still "completed")
        // Pass 6: Salience
        .mockResolvedValueOnce({
          salience: 0.75,
          factors: [{ factor: "uniqueness", weight: 0.8, reasoning: "Novel claim" }],
        })
        // Pass 7: Integrity
        .mockResolvedValueOnce({
          passed: true,
          issues: [],
        });

      const result = await service.processInput(
        { content: "Short claim.", projectId: PROJECT_ID, mode: "full" },
        USER_ID,
      );

      expect(result.success).toBe(true);
      expect(result.passes).toHaveLength(7);

      const passNames = result.passes.map((p) => p.pass);
      expect(passNames).toEqual([
        "decomposition",
        "classification",
        "enrichment",
        "relations",
        "context_placement",
        "salience",
        "integrity",
      ]);
    });

    it("saves salience score to unit", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "idea", confidence: 0.8, reasoning: "Creative" })
        .mockResolvedValueOnce({
          epistemicAct: "hypothesize", epistemicOrigin: null,
          applicabilityScope: null, temporalValidity: null,
          revisability: null, voice: "original",
          confidence: 0.6, reasoning: "Speculative",
        })
        .mockResolvedValueOnce({ salience: 0.9, factors: [] })
        .mockResolvedValueOnce({ passed: true, issues: [] });

      await service.processInput(
        { content: "An idea.", projectId: PROJECT_ID, mode: "full" },
        USER_ID,
      );

      // Should update importance with salience score
      expect(mockUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ importance: 0.9 }),
        }),
      );
    });

    it("flags unit for review when integrity fails", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "claim", confidence: 0.5, reasoning: "Weak" })
        .mockResolvedValueOnce({
          epistemicAct: null, epistemicOrigin: null,
          applicabilityScope: null, temporalValidity: null,
          revisability: null, voice: "original",
          confidence: 0.3, reasoning: "Unclear",
        })
        .mockResolvedValueOnce({ salience: 0.4, factors: [] })
        .mockResolvedValueOnce({
          passed: false,
          issues: [{ type: "missing_attribute", severity: "warning", description: "Missing epistemic context", relatedUnitIds: [] }],
        });

      await service.processInput(
        { content: "Vague claim.", projectId: PROJECT_ID, mode: "full" },
        USER_ID,
      );

      expect(mockUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ aiReviewPending: true }),
        }),
      );
    });
  });

  describe("processInput — context placement", () => {
    it("assigns to context when contextId provided", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "observation", confidence: 0.7, reasoning: "Observes" })
        .mockResolvedValueOnce({
          epistemicAct: "assert", epistemicOrigin: null,
          applicabilityScope: null, temporalValidity: null,
          revisability: null, voice: "original",
          confidence: 0.5, reasoning: "Basic",
        });

      await service.processInput(
        { content: "Sky is blue.", projectId: PROJECT_ID, contextId: CONTEXT_ID, mode: "quick" },
        USER_ID,
      );

      expect(mockUnitContext.create).toHaveBeenCalledWith({
        data: { unitId: UNIT_ID, contextId: CONTEXT_ID },
      });
    });

    it("skips context placement when no contextId", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "claim", confidence: 0.8, reasoning: "Claim" })
        .mockResolvedValueOnce({
          epistemicAct: "assert", epistemicOrigin: null,
          applicabilityScope: null, temporalValidity: null,
          revisability: null, voice: "original",
          confidence: 0.5, reasoning: "Simple",
        });

      const result = await service.processInput(
        { content: "A claim.", projectId: PROJECT_ID, mode: "quick" },
        USER_ID,
      );

      const ctxPass = result.passes.find((p) => p.pass === "context_placement");
      expect(ctxPass?.status).toBe("skipped");
      expect(mockUnitContext.create).not.toHaveBeenCalled();
    });
  });

  describe("processInput — error resilience", () => {
    it("continues pipeline even if enrichment fails", async () => {
      mockGenerateStructured
        .mockResolvedValueOnce({ unitType: "claim", confidence: 0.8, reasoning: "Good" })
        .mockRejectedValueOnce(new Error("AI unavailable")) // enrichment fails
        .mockResolvedValueOnce({ salience: 0.5, factors: [] })
        .mockResolvedValueOnce({ passed: true, issues: [] });

      const result = await service.processInput(
        { content: "A claim.", projectId: PROJECT_ID, mode: "full" },
        USER_ID,
      );

      // Pipeline should still complete (partial success)
      expect(result.passes).toHaveLength(7);
      const enrich = result.passes.find((p) => p.pass === "enrichment");
      expect(enrich?.status).toBe("failed");
      expect(enrich?.error).toBe("AI unavailable");

      // Other passes should still run
      const salience = result.passes.find((p) => p.pass === "salience");
      expect(salience?.status).toBe("completed");
    });
  });
});
