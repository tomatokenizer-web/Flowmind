import type { PrismaClient } from "@prisma/client";
import {
  createSearchService,
  type SearchLayer,
  type SearchResult,
  type StructuralFilters,
  type TemporalFilters,
} from "@/server/services/searchService";

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Query intent affects per-layer weight multipliers in RRF.
 * Per DEC-002 §1: Reciprocal Rank Fusion (k=60, intent multiplier).
 */
export type QueryIntent =
  | "factual"        // definitions, lookups — text + semantic dominant
  | "exploratory"    // discovery — semantic + structural dominant
  | "structural"     // graph / type queries — structural + text dominant
  | "temporal"       // recency / timeline — temporal dominant
  | "balanced";      // default — equal weights

export interface RagFusionOptions {
  projectId: string;
  contextId?: string;
  intent?: QueryIntent;
  layers?: SearchLayer[];       // subset override; default all 4
  k?: number;                   // RRF constant; default 60
  limit?: number;               // final result cap
  perLayerLimit?: number;       // per-layer cap before fusion
  structuralFilters?: StructuralFilters;
  temporalFilters?: TemporalFilters;
}

export interface FusedResult extends Omit<SearchResult, "matchLayer" | "score"> {
  fusedScore: number;
  layerRanks: Partial<Record<SearchLayer, number>>;   // rank in each layer (1-indexed)
  layerScores: Partial<Record<SearchLayer, number>>;  // raw per-layer score
  matchedLayers: SearchLayer[];
}

// ─── Intent → layer weights ──────────────────────────────────────────

const INTENT_WEIGHTS: Record<QueryIntent, Record<SearchLayer, number>> = {
  factual:     { text: 1.5, semantic: 1.3, structural: 0.8, temporal: 0.4 },
  exploratory: { text: 0.7, semantic: 1.5, structural: 1.2, temporal: 0.6 },
  structural:  { text: 1.0, semantic: 0.8, structural: 1.6, temporal: 0.6 },
  temporal:    { text: 0.8, semantic: 0.6, structural: 0.8, temporal: 1.8 },
  balanced:    { text: 1.0, semantic: 1.0, structural: 1.0, temporal: 1.0 },
};

const ALL_LAYERS: SearchLayer[] = ["text", "structural", "semantic", "temporal"];

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Reciprocal Rank Fusion over the 4 search layers.
 *
 * Per DEC-2026-002 §1 and M.3 (rag/fusion):
 *   fused_score(doc) = Σ_layer weight_layer * (1 / (k + rank_layer(doc)))
 *
 * where k = 60 (default), rank is 1-indexed per layer, and docs missing
 * from a layer contribute 0 for that layer.
 *
 * Intent classifier adjusts per-layer weights so different query types
 * emphasise the most relevant layers.
 */
export function createRagFusionService(db: PrismaClient) {
  const searchService = createSearchService(db);

  async function query(
    queryText: string,
    options: RagFusionOptions,
  ): Promise<FusedResult[]> {
    const {
      projectId,
      contextId,
      intent = "balanced",
      layers = ALL_LAYERS,
      k = 60,
      limit = 50,
      perLayerLimit = 100,
      structuralFilters,
      temporalFilters,
    } = options;

    const weights = INTENT_WEIGHTS[intent];

    // Run each layer independently so ranks are scoped per layer.
    const perLayerResults = await Promise.all(
      layers.map(async (layer) => {
        const results = await searchService.search(
          queryText,
          {
            projectId,
            contextId,
            layers: [layer],
            limit: perLayerLimit,
          },
          structuralFilters,
          temporalFilters,
        );
        // searchService re-sorts by score; we take that order as the rank.
        return { layer, results };
      }),
    );

    // RRF accumulation keyed by unitId.
    const fused = new Map<string, FusedResult>();

    for (const { layer, results } of perLayerResults) {
      const weight = weights[layer] ?? 1;
      results.forEach((result, idx) => {
        const rank = idx + 1; // 1-indexed
        const contribution = weight * (1 / (k + rank));

        const existing = fused.get(result.unitId);
        if (existing) {
          existing.fusedScore += contribution;
          existing.layerRanks[layer] = rank;
          existing.layerScores[layer] = result.score;
          existing.matchedLayers.push(layer);
          // Merge highlights across layers.
          const merged = new Set([...existing.highlights, ...result.highlights]);
          existing.highlights = Array.from(merged).slice(0, 5);
        } else {
          fused.set(result.unitId, {
            unitId: result.unitId,
            content: result.content,
            unitType: result.unitType,
            lifecycle: result.lifecycle,
            createdAt: result.createdAt,
            relationCount: result.relationCount,
            highlights: [...result.highlights],
            fusedScore: contribution,
            layerRanks: { [layer]: rank },
            layerScores: { [layer]: result.score },
            matchedLayers: [layer],
          });
        }
      });
    }

    return Array.from(fused.values())
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, limit);
  }

  /**
   * Heuristic intent classifier — pure function, no AI call.
   * Used when the caller does not supply an explicit intent.
   */
  function classifyIntent(queryText: string): QueryIntent {
    const q = queryText.trim().toLowerCase();
    if (!q) return "balanced";

    // Temporal markers
    if (
      /\b(yesterday|today|last (week|month|year)|recent|latest|ago|since)\b/.test(
        q,
      )
    ) {
      return "temporal";
    }
    // Structural / graph markers
    if (
      /\b(connected|related|relationship|graph|linked|between|cluster|isolated|orphan)\b/.test(
        q,
      )
    ) {
      return "structural";
    }
    // Exploratory markers
    if (
      /\b(like|similar|about|related to|explore|discover|what.*around)\b/.test(
        q,
      ) ||
      q.endsWith("?")
    ) {
      return "exploratory";
    }
    // Factual markers: definitions, yes/no, wh-questions without exploration
    if (/^(what is|who|when|where|define|definition of)\b/.test(q)) {
      return "factual";
    }
    return "balanced";
  }

  return { query, classifyIntent };
}

export type RagFusionService = ReturnType<typeof createRagFusionService>;
