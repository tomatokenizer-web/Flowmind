import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRagFusionService } from "@/server/services/ragFusionService";
import type { PrismaClient, UnitType, Lifecycle } from "@prisma/client";

// ─── Helpers ───────────────────────────────────────────────────────

const PROJECT_ID = "p0000000-0000-0000-0000-000000000001";

function makeResult(
  unitId: string,
  score: number,
  overrides: Partial<{
    content: string;
    unitType: UnitType;
    lifecycle: Lifecycle;
  }> = {},
) {
  return {
    unitId,
    content: overrides.content ?? `content-${unitId}`,
    unitType: (overrides.unitType ?? "claim") as UnitType,
    lifecycle: (overrides.lifecycle ?? "confirmed") as Lifecycle,
    score,
    matchLayer: "text" as const,
    highlights: [],
    createdAt: new Date(),
    relationCount: 0,
  };
}

/**
 * Mock searchService.search that returns different per-layer results so we
 * can assert RRF fusion behaviour deterministically.
 */
function mockSearchByLayer(
  resultsByLayer: Record<string, ReturnType<typeof makeResult>[]>,
) {
  return vi.fn(async (_query, options) => {
    const layer = options.layers[0];
    return resultsByLayer[layer] ?? [];
  });
}

vi.mock("@/server/services/searchService", () => ({
  createSearchService: vi.fn(() => ({
    search: vi.fn(),
  })),
}));

// ─── Tests ─────────────────────────────────────────────────────────
describe("ragFusionService", () => {
  let db: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {} as PrismaClient;
  });

  it("classifies temporal queries", () => {
    const svc = createRagFusionService(db);
    expect(svc.classifyIntent("what did I add yesterday")).toBe("temporal");
    expect(svc.classifyIntent("latest notes")).toBe("temporal");
    expect(svc.classifyIntent("notes from last week")).toBe("temporal");
  });

  it("classifies structural queries", () => {
    const svc = createRagFusionService(db);
    expect(svc.classifyIntent("units connected to hypothesis")).toBe(
      "structural",
    );
    expect(svc.classifyIntent("orphan units")).toBe("structural");
  });

  it("classifies factual queries", () => {
    const svc = createRagFusionService(db);
    expect(svc.classifyIntent("what is entropy")).toBe("factual");
    expect(svc.classifyIntent("define photon")).toBe("factual");
  });

  it("classifies exploratory queries", () => {
    const svc = createRagFusionService(db);
    expect(svc.classifyIntent("anything like dark matter")).toBe("exploratory");
    expect(svc.classifyIntent("what do I know about gravity?")).toBe(
      "exploratory",
    );
  });

  it("falls back to balanced for empty or unclassifiable queries", () => {
    const svc = createRagFusionService(db);
    expect(svc.classifyIntent("")).toBe("balanced");
    expect(svc.classifyIntent("gravity quantum")).toBe("balanced");
  });

  it("fuses ranks across layers using RRF formula", async () => {
    const { createSearchService } = await import(
      "@/server/services/searchService"
    );
    const mockSearch = mockSearchByLayer({
      text: [makeResult("u1", 0.9), makeResult("u2", 0.8)],
      semantic: [makeResult("u2", 0.85), makeResult("u1", 0.6)],
      structural: [makeResult("u3", 0.7)],
      temporal: [],
    });
    vi.mocked(createSearchService).mockReturnValue({
      search: mockSearch,
    } as unknown as ReturnType<typeof createSearchService>);

    const svc = createRagFusionService(db);
    const results = await svc.query("gravity", {
      projectId: PROJECT_ID,
      intent: "balanced",
      k: 60,
    });

    // u1: text rank 1 (1/61) + semantic rank 2 (1/62) ≈ 0.0325
    // u2: text rank 2 (1/62) + semantic rank 1 (1/61) ≈ 0.0325
    // u3: structural rank 1 (1/61) ≈ 0.0164
    expect(results).toHaveLength(3);
    // u1 and u2 should be above u3
    const u3 = results.find((r) => r.unitId === "u3");
    const u1 = results.find((r) => r.unitId === "u1");
    const u2 = results.find((r) => r.unitId === "u2");
    expect(u1).toBeDefined();
    expect(u2).toBeDefined();
    expect(u3).toBeDefined();
    expect(u1!.fusedScore).toBeGreaterThan(u3!.fusedScore);
    expect(u2!.fusedScore).toBeGreaterThan(u3!.fusedScore);

    // u1 should have matched two layers
    expect(u1!.matchedLayers).toContain("text");
    expect(u1!.matchedLayers).toContain("semantic");
    expect(u1!.layerRanks.text).toBe(1);
    expect(u1!.layerRanks.semantic).toBe(2);
  });

  it("weights layers per intent — temporal query boosts temporal layer", async () => {
    const { createSearchService } = await import(
      "@/server/services/searchService"
    );
    const mockSearch = mockSearchByLayer({
      text: [makeResult("textOnly", 0.9)],
      semantic: [],
      structural: [],
      temporal: [makeResult("temporalOnly", 0.5)],
    });
    vi.mocked(createSearchService).mockReturnValue({
      search: mockSearch,
    } as unknown as ReturnType<typeof createSearchService>);

    const svc = createRagFusionService(db);
    const results = await svc.query("last week", {
      projectId: PROJECT_ID,
      intent: "temporal",
      k: 60,
    });

    // With temporal intent, temporal weight (1.8) > text weight (0.8)
    // Both at rank 1 → temporal wins.
    expect(results[0]!.unitId).toBe("temporalOnly");
    expect(results[1]!.unitId).toBe("textOnly");
  });

  it("restricts layers when layers option is provided", async () => {
    const { createSearchService } = await import(
      "@/server/services/searchService"
    );
    const mockSearch = mockSearchByLayer({
      text: [makeResult("u1", 0.9)],
      semantic: [makeResult("u2", 0.9)],
      structural: [makeResult("u3", 0.9)],
      temporal: [makeResult("u4", 0.9)],
    });
    vi.mocked(createSearchService).mockReturnValue({
      search: mockSearch,
    } as unknown as ReturnType<typeof createSearchService>);

    const svc = createRagFusionService(db);
    const results = await svc.query("anything", {
      projectId: PROJECT_ID,
      intent: "balanced",
      layers: ["text", "semantic"],
    });

    expect(results.map((r) => r.unitId).sort()).toEqual(["u1", "u2"]);
  });

  it("respects custom k constant", async () => {
    const { createSearchService } = await import(
      "@/server/services/searchService"
    );
    const mockSearch = mockSearchByLayer({
      text: [makeResult("u1", 0.9)],
      semantic: [],
      structural: [],
      temporal: [],
    });
    vi.mocked(createSearchService).mockReturnValue({
      search: mockSearch,
    } as unknown as ReturnType<typeof createSearchService>);

    const svc = createRagFusionService(db);
    const results = await svc.query("x", {
      projectId: PROJECT_ID,
      intent: "balanced",
      k: 10,
    });

    // balanced weight = 1, text rank 1, k=10 → 1 * (1 / (10+1)) = 0.0909...
    expect(results[0]!.fusedScore).toBeCloseTo(1 / 11, 5);
  });
});
