import type { PrismaClient } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface UnitNode {
  id: string;
}

export interface RelationEdge {
  sourceUnitId: string;
  targetUnitId: string;
  strength: number;
}

// ─── ThoughtRank (PageRank-based importance) ─────────────────────────

/**
 * Computes ThoughtRank scores for units using a PageRank-inspired algorithm.
 *
 * The algorithm:
 * 1. Initialize each node with rank = 1/N
 * 2. Iterate 20 times with damping factor 0.85
 * 3. Distribute rank through outgoing relations weighted by strength
 * 4. Normalize scores to 0-1 range
 *
 * @param units - Array of unit nodes with IDs
 * @param relations - Array of relation edges with source, target, and strength
 * @returns Map of unitId to importance score (0-1)
 */
export function computeThoughtRank(
  units: UnitNode[],
  relations: RelationEdge[],
): Map<string, number> {
  const n = units.length;
  if (n === 0) return new Map();

  const dampingFactor = 0.85;
  const iterations = 20;
  const teleportProbability = (1 - dampingFactor) / n;

  // Initialize ranks
  const ranks = new Map<string, number>();
  const unitIds = new Set<string>();
  for (const unit of units) {
    ranks.set(unit.id, 1 / n);
    unitIds.add(unit.id);
  }

  // Build adjacency lists
  // outgoing[nodeId] = array of { targetId, weight }
  const outgoing = new Map<string, Array<{ targetId: string; weight: number }>>();
  // incoming[nodeId] = array of { sourceId, weight }
  const incoming = new Map<string, Array<{ sourceId: string; weight: number }>>();

  for (const unit of units) {
    outgoing.set(unit.id, []);
    incoming.set(unit.id, []);
  }

  for (const rel of relations) {
    // Only consider relations where both nodes exist
    if (!unitIds.has(rel.sourceUnitId) || !unitIds.has(rel.targetUnitId)) {
      continue;
    }

    outgoing.get(rel.sourceUnitId)?.push({
      targetId: rel.targetUnitId,
      weight: rel.strength,
    });
    incoming.get(rel.targetUnitId)?.push({
      sourceId: rel.sourceUnitId,
      weight: rel.strength,
    });
  }

  // Compute outgoing weight sums for normalization
  const outgoingWeightSum = new Map<string, number>();
  for (const [nodeId, edges] of outgoing) {
    const sum = edges.reduce((acc, e) => acc + e.weight, 0);
    outgoingWeightSum.set(nodeId, sum);
  }

  // Iterate PageRank
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();

    for (const unit of units) {
      let incomingRank = 0;

      const incomingEdges = incoming.get(unit.id) ?? [];
      for (const edge of incomingEdges) {
        const sourceRank = ranks.get(edge.sourceId) ?? 0;
        const sourceOutSum = outgoingWeightSum.get(edge.sourceId) ?? 1;

        // Weighted contribution: source's rank * (edge weight / total outgoing weight)
        incomingRank += sourceRank * (edge.weight / sourceOutSum);
      }

      // New rank = teleport + damped incoming contribution
      const newRank = teleportProbability + dampingFactor * incomingRank;
      newRanks.set(unit.id, newRank);
    }

    // Update ranks
    for (const [nodeId, rank] of newRanks) {
      ranks.set(nodeId, rank);
    }
  }

  // Normalize to 0-1 range
  let minRank = Infinity;
  let maxRank = -Infinity;
  for (const rank of ranks.values()) {
    minRank = Math.min(minRank, rank);
    maxRank = Math.max(maxRank, rank);
  }

  const range = maxRank - minRank;
  if (range > 0) {
    for (const [nodeId, rank] of ranks) {
      ranks.set(nodeId, (rank - minRank) / range);
    }
  } else {
    // All nodes have equal rank
    for (const nodeId of ranks.keys()) {
      ranks.set(nodeId, 0.5);
    }
  }

  return ranks;
}

// ─── Service Factory ─────────────────────────────────────────────────

export function createThoughtRankService(db: PrismaClient) {
  /**
   * Recomputes ThoughtRank for all units in a context and updates the database.
   */
  async function updateThoughtRankForContext(contextId: string): Promise<void> {
    // Get all units in the context
    const unitContexts = await db.unitContext.findMany({
      where: { contextId },
      select: {
        unit: {
          select: {
            id: true,
          },
        },
      },
    });

    const units = unitContexts.map((uc) => ({ id: uc.unit.id }));
    if (units.length === 0) return;

    const unitIds = units.map((u) => u.id);

    // Get all relations between these units
    const relations = await db.relation.findMany({
      where: {
        sourceUnitId: { in: unitIds },
        targetUnitId: { in: unitIds },
      },
      select: {
        sourceUnitId: true,
        targetUnitId: true,
        strength: true,
      },
    });

    // Compute ThoughtRank scores
    const ranks = computeThoughtRank(units, relations);

    // Batch update importance scores
    const updatePromises = Array.from(ranks.entries()).map(([unitId, importance]) =>
      db.unit.update({
        where: { id: unitId },
        data: { importance },
      }),
    );

    await Promise.all(updatePromises);
  }

  /**
   * Recomputes ThoughtRank for all units in a project.
   */
  async function updateThoughtRankForProject(projectId: string): Promise<void> {
    // Get all units in the project
    const units = await db.unit.findMany({
      where: { projectId },
      select: { id: true },
    });

    if (units.length === 0) return;

    const unitIds = units.map((u) => u.id);

    // Get all relations between these units
    const relations = await db.relation.findMany({
      where: {
        sourceUnitId: { in: unitIds },
        targetUnitId: { in: unitIds },
      },
      select: {
        sourceUnitId: true,
        targetUnitId: true,
        strength: true,
      },
    });

    // Compute ThoughtRank scores
    const ranks = computeThoughtRank(units, relations);

    // Batch update importance scores using updateMany for efficiency
    // Since updateMany doesn't support different values per record,
    // we use individual updates but could optimize with raw SQL if needed
    const updatePromises = Array.from(ranks.entries()).map(([unitId, importance]) =>
      db.unit.update({
        where: { id: unitId },
        data: { importance },
      }),
    );

    await Promise.all(updatePromises);
  }

  return {
    computeThoughtRank,
    updateThoughtRankForContext,
    updateThoughtRankForProject,
  };
}
