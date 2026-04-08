/**
 * Rhetorical Shape Service
 *
 * Graph-metric-based decision tree classifier that detects 7 rhetorical shapes
 * (+ mesh fallback) from the structure of units and relations within a context.
 * All detection is pure graph analysis — no AI/LLM calls.
 */
import type { PrismaClient } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RhetoricalShapeName =
  | "convergent"
  | "divergent"
  | "parallel"
  | "cyclic"
  | "dialectical"
  | "bridge"
  | "reframing"
  | "mesh"
  | "mixed";

export interface ShapeDetection {
  shape: RhetoricalShapeName;
  confidence: number; // 0–1
  metrics: Record<string, number>;
  details: string;
}

export interface RhetoricalShapeResult {
  dominant: ShapeDetection;
  secondary: ShapeDetection[];
  unitCount: number;
  relationCount: number;
}

// ─── Internal graph types ────────────────────────────────────────────────────

interface Edge {
  sourceUnitId: string;
  targetUnitId: string;
  subtype: string | null;
}

interface AdjacencyData {
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
  inNeighbors: Map<string, Set<string>>;
  outNeighbors: Map<string, Set<string>>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAdjacency(unitIds: string[], edges: Edge[]): AdjacencyData {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const inNeighbors = new Map<string, Set<string>>();
  const outNeighbors = new Map<string, Set<string>>();

  for (const id of unitIds) {
    inDegree.set(id, 0);
    outDegree.set(id, 0);
    inNeighbors.set(id, new Set());
    outNeighbors.set(id, new Set());
  }

  for (const e of edges) {
    outDegree.set(e.sourceUnitId, (outDegree.get(e.sourceUnitId) ?? 0) + 1);
    inDegree.set(e.targetUnitId, (inDegree.get(e.targetUnitId) ?? 0) + 1);
    inNeighbors.get(e.targetUnitId)?.add(e.sourceUnitId);
    outNeighbors.get(e.sourceUnitId)?.add(e.targetUnitId);
  }

  return { inDegree, outDegree, inNeighbors, outNeighbors };
}

/** DFS-based cycle detection; returns number of back-edges (cycles). */
function countCycles(unitIds: string[], outNeighbors: Map<string, Set<string>>): number {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  let cycleCount = 0;

  function dfs(node: string): void {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of outNeighbors.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        cycleCount++;
      }
    }
    inStack.delete(node);
  }

  for (const id of unitIds) {
    if (!visited.has(id)) dfs(id);
  }

  return cycleCount;
}

/**
 * Approximate betweenness centrality using BFS-based Brandes algorithm
 * (unweighted). Returns a map of unitId -> centrality score (unnormalized).
 */
function computeBetweenness(
  unitIds: string[],
  outNeighbors: Map<string, Set<string>>,
): Map<string, number> {
  const betweenness = new Map<string, number>(unitIds.map((id) => [id, 0]));

  for (const s of unitIds) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>(unitIds.map((id) => [id, []]));
    const sigma = new Map<string, number>(unitIds.map((id) => [id, 0]));
    sigma.set(s, 1);
    const dist = new Map<string, number>(unitIds.map((id) => [id, -1]));
    dist.set(s, 0);
    const queue: string[] = [s];

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of outNeighbors.get(v) ?? []) {
        if (dist.get(w) === -1) {
          queue.push(w);
          dist.set(w, (dist.get(v) ?? 0) + 1);
        }
        if (dist.get(w) === (dist.get(v) ?? 0) + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0));
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>(unitIds.map((id) => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) ?? []) {
        const coeff = ((sigma.get(v) ?? 0) / (sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0));
        delta.set(v, (delta.get(v) ?? 0) + coeff);
      }
      if (w !== s) {
        betweenness.set(w, (betweenness.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  return betweenness;
}

/**
 * Find articulation points (nodes whose removal disconnects the undirected graph).
 * Uses iterative DFS with Tarjan's algorithm.
 */
function findArticulationPoints(
  unitIds: string[],
  outNeighbors: Map<string, Set<string>>,
  inNeighbors: Map<string, Set<string>>,
): Set<string> {
  const artPoints = new Set<string>();
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let timer = 0;

  function dfs(u: string): void {
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    let childCount = 0;

    const neighbors = new Set([
      ...(outNeighbors.get(u) ?? []),
      ...(inNeighbors.get(u) ?? []),
    ]);

    for (const v of neighbors) {
      if (!disc.has(v)) {
        childCount++;
        parent.set(v, u);
        dfs(v);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));
        // u is an articulation point if:
        // 1. It is root and has 2+ children, or
        // 2. It is not root and low[v] >= disc[u]
        if (parent.get(u) === null && childCount > 1) artPoints.add(u);
        if (parent.get(u) !== null && (low.get(v) ?? 0) >= (disc.get(u) ?? 0)) artPoints.add(u);
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const id of unitIds) {
    if (!disc.has(id)) {
      parent.set(id, null);
      dfs(id);
    }
  }

  return artPoints;
}

// ─── Shape Detectors ─────────────────────────────────────────────────────────

const CONVERGENT_THRESHOLD = 3;
const DIVERGENT_THRESHOLD = 3;
const PARALLEL_MIN_GROUP = 3;

function detectConvergent(unitIds: string[], adj: AdjacencyData): ShapeDetection {
  const highInDegreeUnits = unitIds.filter((id) => (adj.inDegree.get(id) ?? 0) >= CONVERGENT_THRESHOLD);
  if (highInDegreeUnits.length === 0) {
    return { shape: "convergent", confidence: 0, metrics: { convergentNodes: 0 }, details: "No convergent targets found." };
  }
  const maxIn = Math.max(...unitIds.map((id) => adj.inDegree.get(id) ?? 0));
  const confidence = Math.min(1, highInDegreeUnits.length / Math.max(unitIds.length * 0.2, 1));
  return {
    shape: "convergent",
    confidence,
    metrics: { convergentNodes: highInDegreeUnits.length, maxInDegree: maxIn },
    details: `${highInDegreeUnits.length} unit(s) have in-degree ≥ ${CONVERGENT_THRESHOLD} (max ${maxIn}).`,
  };
}

function detectDivergent(unitIds: string[], adj: AdjacencyData): ShapeDetection {
  const highOutDegreeUnits = unitIds.filter((id) => (adj.outDegree.get(id) ?? 0) >= DIVERGENT_THRESHOLD);
  if (highOutDegreeUnits.length === 0) {
    return { shape: "divergent", confidence: 0, metrics: { divergentNodes: 0 }, details: "No divergent sources found." };
  }
  const maxOut = Math.max(...unitIds.map((id) => adj.outDegree.get(id) ?? 0));
  const confidence = Math.min(1, maxOut / Math.max(unitIds.length * 0.5, 1));
  return {
    shape: "divergent",
    confidence,
    metrics: { divergentNodes: highOutDegreeUnits.length, maxOutDegree: maxOut },
    details: `${highOutDegreeUnits.length} unit(s) have out-degree ≥ ${DIVERGENT_THRESHOLD} (max ${maxOut}).`,
  };
}

function detectParallel(unitIds: string[], adj: AdjacencyData, edges: Edge[]): ShapeDetection {
  // Group units by shared in-neighbor sets (units sharing the same single parent)
  const edgeSet = new Set(edges.map((e) => `${e.sourceUnitId}::${e.targetUnitId}`));
  let largestParallelGroup = 0;

  // For each possible in-neighbor, find all its children that share no inter-edges
  const childrenByParent = new Map<string, string[]>();
  for (const id of unitIds) {
    for (const neighbor of adj.inNeighbors.get(id) ?? []) {
      if (!childrenByParent.has(neighbor)) childrenByParent.set(neighbor, []);
      childrenByParent.get(neighbor)!.push(id);
    }
  }

  for (const children of childrenByParent.values()) {
    if (children.length < PARALLEL_MIN_GROUP) continue;
    // Check no direct relations between children
    let hasInterEdge = false;
    for (let i = 0; i < children.length && !hasInterEdge; i++) {
      for (let j = i + 1; j < children.length && !hasInterEdge; j++) {
        if (
          edgeSet.has(`${children[i]}::${children[j]}`) ||
          edgeSet.has(`${children[j]}::${children[i]}`)
        ) {
          hasInterEdge = true;
        }
      }
    }
    if (!hasInterEdge) {
      largestParallelGroup = Math.max(largestParallelGroup, children.length);
    }
  }

  if (largestParallelGroup < PARALLEL_MIN_GROUP) {
    return { shape: "parallel", confidence: 0, metrics: { largestParallelGroup: 0 }, details: "No parallel groups found." };
  }

  const confidence = Math.min(1, largestParallelGroup / Math.max(unitIds.length * 0.4, PARALLEL_MIN_GROUP));
  return {
    shape: "parallel",
    confidence,
    metrics: { largestParallelGroup },
    details: `Largest parallel group has ${largestParallelGroup} sibling units with no inter-edges.`,
  };
}

function detectCyclic(unitIds: string[], adj: AdjacencyData): ShapeDetection {
  const cycleCount = countCycles(unitIds, adj.outNeighbors);
  if (cycleCount === 0) {
    return { shape: "cyclic", confidence: 0, metrics: { cycleCount: 0 }, details: "No directed cycles detected." };
  }
  const confidence = Math.min(1, cycleCount / Math.max(unitIds.length * 0.3, 1));
  return {
    shape: "cyclic",
    confidence,
    metrics: { cycleCount },
    details: `${cycleCount} directed cycle(s) detected.`,
  };
}

const DIALECTICAL_SUBTYPES = new Set(["contradicts", "rebuts", "qualifies"]);
const SYNTHESIS_SUBTYPES = new Set(["supports"]);

function detectDialectical(unitIds: string[], edges: Edge[]): ShapeDetection {
  const unitSet = new Set(unitIds);
  const conflictPairs: Array<[string, string]> = [];

  for (const e of edges) {
    if (e.subtype && DIALECTICAL_SUBTYPES.has(e.subtype)) {
      conflictPairs.push([e.sourceUnitId, e.targetUnitId]);
    }
  }

  if (conflictPairs.length === 0) {
    return { shape: "dialectical", confidence: 0, metrics: { conflictPairs: 0, unresolvedPairs: 0 }, details: "No conflict relations found." };
  }

  // Build a map of synthesis: unit -> units it supports
  const synthesisMap = new Map<string, Set<string>>();
  for (const e of edges) {
    if (e.subtype && SYNTHESIS_SUBTYPES.has(e.subtype) && unitSet.has(e.sourceUnitId)) {
      if (!synthesisMap.has(e.sourceUnitId)) synthesisMap.set(e.sourceUnitId, new Set());
      synthesisMap.get(e.sourceUnitId)!.add(e.targetUnitId);
    }
  }

  // A pair is "resolved" if there exists a unit that supports both members of the pair
  let unresolvedCount = 0;
  for (const [a, b] of conflictPairs) {
    let resolved = false;
    for (const [, supported] of synthesisMap) {
      if (supported.has(a) && supported.has(b)) {
        resolved = true;
        break;
      }
    }
    if (!resolved) unresolvedCount++;
  }

  const confidence = Math.min(1, unresolvedCount / Math.max(unitIds.length * 0.3, 1));
  return {
    shape: "dialectical",
    confidence,
    metrics: { conflictPairs: conflictPairs.length, unresolvedPairs: unresolvedCount },
    details: `${unresolvedCount} unresolved conflict pair(s) out of ${conflictPairs.length} total.`,
  };
}

function detectBridge(
  unitIds: string[],
  adj: AdjacencyData,
): ShapeDetection {
  if (unitIds.length < 3) {
    return { shape: "bridge", confidence: 0, metrics: { bridgeNodes: 0 }, details: "Too few units for bridge detection." };
  }

  const betweenness = computeBetweenness(unitIds, adj.outNeighbors);
  const artPoints = findArticulationPoints(unitIds, adj.outNeighbors, adj.inNeighbors);

  const maxBetweenness = Math.max(...betweenness.values(), 1);
  const bridgeNodes = unitIds.filter((id) => artPoints.has(id));

  if (bridgeNodes.length === 0) {
    return { shape: "bridge", confidence: 0, metrics: { bridgeNodes: 0, maxBetweenness }, details: "No articulation points found." };
  }

  // Confidence: ratio of articulation points weighted by their betweenness
  const avgBridgeBetweenness =
    bridgeNodes.reduce((sum, id) => sum + (betweenness.get(id) ?? 0), 0) / bridgeNodes.length;
  const confidence = Math.min(1, (bridgeNodes.length / unitIds.length) * 3 * (avgBridgeBetweenness / maxBetweenness));

  return {
    shape: "bridge",
    confidence,
    metrics: { bridgeNodes: bridgeNodes.length, maxBetweenness: Math.round(maxBetweenness) },
    details: `${bridgeNodes.length} articulation point(s) whose removal would disconnect the graph.`,
  };
}

const REFRAMING_SUBTYPES = new Set(["revises", "supersedes"]);

function detectReframing(unitIds: string[], edges: Edge[]): ShapeDetection {
  const reframingEdges = edges.filter((e) => e.subtype && REFRAMING_SUBTYPES.has(e.subtype));
  if (reframingEdges.length === 0) {
    return { shape: "reframing", confidence: 0, metrics: { reframingPairs: 0 }, details: "No revises/supersedes relations found." };
  }
  const confidence = Math.min(1, reframingEdges.length / Math.max(unitIds.length * 0.3, 1));
  return {
    shape: "reframing",
    confidence,
    metrics: { reframingPairs: reframingEdges.length },
    details: `${reframingEdges.length} revises/supersedes relation(s) indicate conceptual reframing.`,
  };
}

function buildMesh(otherDetections: ShapeDetection[]): ShapeDetection {
  const maxOther = Math.max(...otherDetections.map((d) => d.confidence), 0);
  const confidence = Math.max(0, 1 - maxOther);
  return {
    shape: "mesh",
    confidence,
    metrics: { maxOtherConfidence: maxOther },
    details: "Default shape: densely connected with no dominant rhetorical pattern.",
  };
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createRhetoricalShapeService(db: PrismaClient) {
  /**
   * Detect the dominant rhetorical shape of a context's unit graph.
   *
   * Fetches all units and relations for the given context, builds an adjacency
   * representation, runs each shape detector, and returns the dominant shape
   * plus any secondary shapes with confidence > 0.1.
   */
  async function detectShape(projectId: string, contextId: string): Promise<RhetoricalShapeResult> {
    // 1. Fetch unit IDs in context
    const unitContexts = await db.unitContext.findMany({
      where: { contextId },
      select: { unitId: true },
    });
    const unitIds = unitContexts.map((uc) => uc.unitId);

    if (unitIds.length === 0) {
      const mesh: ShapeDetection = {
        shape: "mesh",
        confidence: 1,
        metrics: {},
        details: "No units in context.",
      };
      return { dominant: mesh, secondary: [], unitCount: 0, relationCount: 0 };
    }

    // 2. Fetch relations between those units (scoped to this project's units)
    const rawRelations = await db.relation.findMany({
      where: {
        sourceUnitId: { in: unitIds },
        targetUnitId: { in: unitIds },
      },
      select: { sourceUnitId: true, targetUnitId: true, subtype: true },
    });

    const edges: Edge[] = rawRelations.map((r) => ({
      sourceUnitId: r.sourceUnitId,
      targetUnitId: r.targetUnitId,
      subtype: r.subtype ?? null,
    }));

    // 3. Build adjacency structures
    const adj = buildAdjacency(unitIds, edges);

    // 4. Run all detectors
    const detections: ShapeDetection[] = [
      detectConvergent(unitIds, adj),
      detectDivergent(unitIds, adj),
      detectParallel(unitIds, adj, edges),
      detectCyclic(unitIds, adj),
      detectDialectical(unitIds, edges),
      detectBridge(unitIds, adj),
      detectReframing(unitIds, edges),
    ];

    // 5. Build mesh (fallback)
    const mesh = buildMesh(detections);
    detections.push(mesh);

    // 6. Sort by confidence descending
    detections.sort((a, b) => b.confidence - a.confidence);

    const [dominant, ...rest] = detections;
    const secondary = rest.filter((d) => d.confidence > 0.1);

    return {
      dominant: dominant!,
      secondary,
      unitCount: unitIds.length,
      relationCount: edges.length,
    };
  }

  return { detectShape };
}

export type RhetoricalShapeService = ReturnType<typeof createRhetoricalShapeService>;
