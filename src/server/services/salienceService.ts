import type { PrismaClient, Certainty, SalienceTier } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export type SalienceResult = {
  score: number;
  factors: Array<{ factor: string; value: number; weight: number }>;
  stale: boolean;
};

export type CognitiveLoad = {
  activeUnits: number;
  totalUnits: number;
  loadEstimate: "low" | "moderate" | "high" | "overwhelming";
  suggestion?: string;
};

export type TierCounts = {
  foreground: number;
  background: number;
  deep: number;
  unranked: number;
};

// DEC-2026-002 §2: percentile cutoffs for attention tier bucketing.
// Foreground = top 15%, deep = bottom 45%, background = middle 40%.
const FOREGROUND_PERCENTILE = 0.85;
const DEEP_PERCENTILE = 0.45;

// ─── Helpers ─────────────────────────────────────────────────────────

// DEC-2026-002 §2: S = 0.4·recency + 0.2·freq + 0.2·centrality + 0.2·aiScore
const WEIGHTS = {
  recency: 0.4,
  relationCount: 0.2,
  betweenness: 0.2,
  certainty: 0.2,
} as const;

const CERTAINTY_MAP: Record<Certainty, number> = {
  certain: 1.0,
  probable: 0.75,
  hypothesis: 0.5,
  uncertain: 0.25,
};

function certaintyToWeight(c: Certainty | null | undefined): number {
  return c ? (CERTAINTY_MAP[c] ?? 0.5) : 0.5;
}

function recencyWeight(modifiedAt: Date, halfLifeDays = 30): number {
  const daysSince =
    (Date.now() - modifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSince / halfLifeDays);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function loadEstimate(
  active: number,
): CognitiveLoad["loadEstimate"] {
  if (active < 50) return "low";
  if (active < 150) return "moderate";
  if (active < 300) return "high";
  return "overwhelming";
}

// ─── Service ─────────────────────────────────────────────────────────

export function createSalienceService(db: PrismaClient) {
  async function computeSalience(unitId: string): Promise<SalienceResult> {
    const unit = await db.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: {
        id: true,
        projectId: true,
        certainty: true,
        modifiedAt: true,
        pinned: true,
        flagged: true,
      },
    });

    const [inDegree, outDegree, totalRelations, maxRelations] =
      await Promise.all([
        db.relation.count({ where: { targetUnitId: unitId } }),
        db.relation.count({ where: { sourceUnitId: unitId } }),
        db.relation.count({
          where: {
            OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }],
          },
        }),
        db.relation
          .groupBy({
            by: ["sourceUnitId"],
            where: {
              sourceUnit: { projectId: unit.projectId },
            },
            _count: true,
            orderBy: { _count: { sourceUnitId: "desc" } },
            take: 1,
          })
          .then((rows) => (rows[0]?._count ?? 1)),
      ]);

    const totalDegree = inDegree + outDegree;
    const betweennessApprox = clamp01(
      (inDegree * outDegree) / Math.max(totalDegree, 1),
    );
    const relationNorm = clamp01(totalRelations / Math.max(maxRelations, 1));
    const certaintyW = certaintyToWeight(unit.certainty);
    const recencyW = recencyWeight(unit.modifiedAt);

    // DEC-2026-002 §2: S = 0.4·recency + 0.2·freq + 0.2·centrality + 0.2·aiScore
    const score = clamp01(
      recencyW * WEIGHTS.recency +
        relationNorm * WEIGHTS.relationCount +
        betweennessApprox * WEIGHTS.betweenness +
        certaintyW * WEIGHTS.certainty,
    );

    const daysSince =
      (Date.now() - unit.modifiedAt.getTime()) / (1000 * 60 * 60 * 24);

    return {
      score,
      factors: [
        { factor: "recency_weight", value: recencyW, weight: WEIGHTS.recency },
        { factor: "relation_count", value: relationNorm, weight: WEIGHTS.relationCount },
        { factor: "betweenness_centrality", value: betweennessApprox, weight: WEIGHTS.betweenness },
        { factor: "certainty_weight", value: certaintyW, weight: WEIGHTS.certainty },
      ],
      stale: daysSince > 30,
    };
  }

  async function batchRecomputeSalience(
    projectId: string,
  ): Promise<{ updated: number }> {
    const units = await db.unit.findMany({
      where: { projectId },
      select: {
        id: true,
        certainty: true,
        modifiedAt: true,
        pinned: true,
        flagged: true,
      },
    });

    if (units.length === 0) return { updated: 0 };

    // Load relation counts per unit in one query
    const [sourceCounts, targetCounts] = await Promise.all([
      db.relation.groupBy({
        by: ["sourceUnitId"],
        where: { sourceUnit: { projectId } },
        _count: true,
      }),
      db.relation.groupBy({
        by: ["targetUnitId"],
        where: { targetUnit: { projectId } },
        _count: true,
      }),
    ]);

    const outMap = new Map(sourceCounts.map((r) => [r.sourceUnitId, r._count]));
    const inMap = new Map(targetCounts.map((r) => [r.targetUnitId, r._count]));

    let maxRel = 1;
    for (const u of units) {
      const total = (outMap.get(u.id) ?? 0) + (inMap.get(u.id) ?? 0);
      if (total > maxRel) maxRel = total;
    }

    // First pass: compute scores without writing, so we can derive
    // percentile cutoffs from the full distribution.
    const scored = units.map((u) => {
      const inD = inMap.get(u.id) ?? 0;
      const outD = outMap.get(u.id) ?? 0;
      const totalD = inD + outD;

      const betweennessApprox = clamp01((inD * outD) / Math.max(totalD, 1));
      const relationNorm = clamp01(totalD / maxRel);
      const certaintyW = certaintyToWeight(u.certainty);
      const recencyW = recencyWeight(u.modifiedAt);

      const score = clamp01(
        recencyW * WEIGHTS.recency +
          relationNorm * WEIGHTS.relationCount +
          betweennessApprox * WEIGHTS.betweenness +
          certaintyW * WEIGHTS.certainty,
      );

      return { id: u.id, score };
    });

    // DEC-2026-002 §7 — derive tier cutoffs from the project-wide
    // distribution so tier membership is always meaningful.
    const sortedScores = scored.map((s) => s.score).sort((a, b) => a - b);
    const pickCutoff = (p: number) => {
      const idx = Math.min(
        sortedScores.length - 1,
        Math.max(0, Math.floor(p * sortedScores.length)),
      );
      return sortedScores[idx]!;
    };
    const deepCutoff = pickCutoff(DEEP_PERCENTILE);
    const foregroundCutoff = pickCutoff(FOREGROUND_PERCENTILE);

    function tierFor(score: number): SalienceTier {
      if (score >= foregroundCutoff && sortedScores.length > 1) return "foreground";
      if (score < deepCutoff) return "deep";
      return "background";
    }

    const now = new Date();
    const updates = scored.map((s) =>
      db.unit.update({
        where: { id: s.id },
        data: {
          // Legacy — kept for back-compat with the old `importance` field.
          importance: s.score,
          // DEC-2026-002 §7 — new attention-routing fields.
          salienceScore: s.score,
          salienceTier: tierFor(s.score),
          salienceUpdatedAt: now,
        },
      }),
    );

    await db.$transaction(updates);

    return { updated: units.length };
  }

  /**
   * Read-only tier histogram for UI display. Does not recompute —
   * returns whatever the last batch run wrote. Units with a NULL
   * salienceTier are counted as `unranked`.
   */
  async function getTierCounts(projectId: string): Promise<TierCounts> {
    const rows = await db.unit.findMany({
      where: { projectId },
      select: { salienceTier: true },
    });

    const counts: TierCounts = { foreground: 0, background: 0, deep: 0, unranked: 0 };
    for (const r of rows) {
      if (r.salienceTier === "foreground") counts.foreground++;
      else if (r.salienceTier === "background") counts.background++;
      else if (r.salienceTier === "deep") counts.deep++;
      else counts.unranked++;
    }
    return counts;
  }

  async function decaySalience(
    projectId: string,
    decayFactor?: number,
  ): Promise<{ decayed: number }> {
    const factor = decayFactor ?? Math.exp(-1 / 30);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const eligible = await db.unit.findMany({
      where: {
        projectId,
        pinned: false,
        modifiedAt: { lt: oneDayAgo },
        importance: { gt: 0 },
      },
      select: { id: true, importance: true },
    });

    if (eligible.length === 0) return { decayed: 0 };

    const updates = eligible.map((u) =>
      db.unit.update({
        where: { id: u.id },
        data: { importance: clamp01(u.importance * factor) },
      }),
    );

    await db.$transaction(updates);

    return { decayed: eligible.length };
  }

  async function getCognitiveLoad(
    projectId: string,
  ): Promise<CognitiveLoad> {
    const [activeUnits, totalUnits] = await Promise.all([
      db.unit.count({ where: { projectId, importance: { gt: 0.3 } } }),
      db.unit.count({ where: { projectId } }),
    ]);

    const estimate = loadEstimate(activeUnits);
    const inactiveCount = totalUnits - activeUnits;

    let suggestion: string | undefined;
    if (estimate === "high" || estimate === "overwhelming") {
      suggestion = `Consider archiving ${inactiveCount} low-salience units`;
    }

    return {
      activeUnits,
      totalUnits,
      loadEstimate: estimate,
      suggestion,
    };
  }

  return {
    computeSalience,
    batchRecomputeSalience,
    decaySalience,
    getCognitiveLoad,
    getTierCounts,
  };
}

export type SalienceService = ReturnType<typeof createSalienceService>;
