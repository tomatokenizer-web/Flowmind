/**
 * Pass 7: Salience & Scent Update (<1s)
 *
 * Pure graph computation — no LLM needed.
 * Activation spreading from focal units with exponential decay.
 * Convergence bonus when multiple paths reach the same unit.
 * Cross-graph relation boosts from Pass 6 applied here.
 */

import type {
  ExtractedUnit,
  DetectedRelation,
  CrossRelation,
  SalienceUpdate,
  SalienceResult,
} from "../types";
import { SALIENCE_CONFIG } from "../config";

// ─── Graph Representation ───────────────────────────────────────────────

interface GraphNode {
  index: number;
  neighbors: Array<{ index: number; weight: number }>;
}

/**
 * Build an adjacency list from within-input relations.
 * Edges are bidirectional for spreading, weighted by relation confidence.
 */
function buildGraph(
  unitCount: number,
  relations: DetectedRelation[],
): Map<number, GraphNode> {
  const graph = new Map<number, GraphNode>();

  // Initialize all nodes
  for (let i = 0; i < unitCount; i++) {
    graph.set(i, { index: i, neighbors: [] });
  }

  // Add edges from relations (bidirectional for activation spreading)
  for (const rel of relations) {
    if (rel.action === "discard") continue;

    const source = graph.get(rel.sourceIndex);
    const target = graph.get(rel.targetIndex);

    if (source && target) {
      const weight = rel.confidence;
      source.neighbors.push({ index: rel.targetIndex, weight });
      target.neighbors.push({ index: rel.sourceIndex, weight });
    }
  }

  return graph;
}

// ─── Activation Spreading ───────────────────────────────────────────────

/**
 * BFS-based activation spreading from focal nodes.
 * Each hop applies exponential decay (decay^hop).
 * When multiple paths reach the same node, a convergence bonus is applied.
 */
function spreadActivation(
  graph: Map<number, GraphNode>,
  focalIndices: number[],
  config: typeof SALIENCE_CONFIG,
): Map<number, { salience: number; pathCount: number }> {
  const salience = new Map<number, { salience: number; pathCount: number }>();

  // Initialize all nodes with zero salience
  for (const [index] of graph) {
    salience.set(index, { salience: 0, pathCount: 0 });
  }

  // Set focal nodes to max salience
  for (const focal of focalIndices) {
    const entry = salience.get(focal);
    if (entry) {
      entry.salience = config.focalSalience;
      entry.pathCount = 1;
    }
  }

  // BFS from each focal node
  for (const focalIndex of focalIndices) {
    const visited = new Set<number>();
    // Queue: [nodeIndex, currentHop, currentActivation]
    const queue: Array<[number, number, number]> = [[focalIndex, 0, config.focalSalience]];
    visited.add(focalIndex);

    while (queue.length > 0) {
      const [currentIndex, hop, activation] = queue.shift()!;

      if (hop >= config.maxHops) continue;

      const node = graph.get(currentIndex);
      if (!node) continue;

      for (const neighbor of node.neighbors) {
        const nextActivation = activation * config.decayPerHop * neighbor.weight;

        if (nextActivation < config.spreadingThreshold) continue;

        const entry = salience.get(neighbor.index);
        if (!entry) continue;

        // Accumulate salience (multiple paths add up)
        entry.pathCount++;

        if (visited.has(neighbor.index)) {
          // Already visited from this focal: add convergence bonus
          entry.salience += nextActivation * config.convergenceMultiplier;
        } else {
          entry.salience += nextActivation;
          visited.add(neighbor.index);
          queue.push([neighbor.index, hop + 1, nextActivation]);
        }
      }
    }
  }

  return salience;
}

// ─── Pass 7 Implementation ──────────────────────────────────────────────

/**
 * Execute Pass 7: Compute salience scores for all extracted units.
 *
 * Algorithm:
 * 1. Build graph from within-input relations
 * 2. Identify focal units (newly extracted = all start at salience 1.0)
 * 3. Spread activation through the graph with decay
 * 4. Apply convergence bonuses for multiple-path nodes
 * 5. Apply cross-graph salience boosts from Pass 6
 * 6. Normalize final scores to [0, 1]
 */
export function executePass7(
  units: ExtractedUnit[],
  withinRelations: DetectedRelation[],
  crossRelations: CrossRelation[],
): SalienceResult {
  const startTime = performance.now();

  if (units.length === 0) {
    return { updates: [], processingTimeMs: 0 };
  }

  // Build the relation graph
  const graph = buildGraph(units.length, withinRelations);

  // All newly extracted units are focal
  const focalIndices = units.map((_, i) => i);

  // Spread activation
  const salienceMap = spreadActivation(graph, focalIndices, SALIENCE_CONFIG);

  // Collect cross-graph boosts per unit
  const crossBoosts = new Map<number, number>();
  for (const cr of crossRelations) {
    const current = crossBoosts.get(cr.sourceIndex) ?? 0;
    crossBoosts.set(cr.sourceIndex, current + cr.salienceBoost);
  }

  // Build salience updates
  const updates: SalienceUpdate[] = [];
  let maxSalience = 0;

  for (let i = 0; i < units.length; i++) {
    const entry = salienceMap.get(i) ?? { salience: 0, pathCount: 0 };
    const crossGraphBoost = crossBoosts.get(i) ?? 0;
    const convergenceBonus =
      entry.pathCount > 1
        ? (entry.pathCount - 1) * SALIENCE_CONFIG.convergenceMultiplier
        : 0;

    const rawSalience = entry.salience + crossGraphBoost + convergenceBonus;
    if (rawSalience > maxSalience) maxSalience = rawSalience;

    updates.push({
      unitIndex: i,
      salience: entry.salience,
      convergenceBonus,
      crossGraphBoost,
      finalSalience: rawSalience,
    });
  }

  // Normalize to [0, 1]
  if (maxSalience > 0) {
    for (const update of updates) {
      update.finalSalience = Math.min(1.0, update.finalSalience / maxSalience);
    }
  }

  return {
    updates,
    processingTimeMs: performance.now() - startTime,
  };
}
