"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  GraphNode,
  GraphEdge,
  GraphCluster,
  GraphData,
} from "~/components/domain/graph/graph-types";

/* ─── Louvain-lite community detection ─── */

function detectCommunities(
  nodes: GraphNode[],
  links: GraphEdge[],
): Map<string, number> {
  const communityMap = new Map<string, number>();
  const adjacency = new Map<string, Map<string, number>>();

  for (const node of nodes) {
    communityMap.set(node.id, 0);
    adjacency.set(node.id, new Map());
  }

  for (const link of links) {
    const s = link.sourceId;
    const t = link.targetId;
    const w = link.strength;
    adjacency.get(s)?.set(t, (adjacency.get(s)?.get(t) ?? 0) + w);
    adjacency.get(t)?.set(s, (adjacency.get(t)?.get(s) ?? 0) + w);
  }

  // Assign each node its own community
  let cid = 0;
  for (const node of nodes) {
    communityMap.set(node.id, cid++);
  }

  // Total edge weight
  const m2 = links.reduce((acc, l) => acc + l.strength, 0) * 2 || 1;

  // Weighted degree per node
  const kDeg = new Map<string, number>();
  for (const node of nodes) {
    let deg = 0;
    for (const w of adjacency.get(node.id)?.values() ?? []) {
      deg += w;
    }
    kDeg.set(node.id, deg);
  }

  // Community sum of degrees + internal edges
  const communityDeg = new Map<number, number>();
  const communityInt = new Map<number, number>();
  for (const node of nodes) {
    const c = communityMap.get(node.id)!;
    communityDeg.set(c, (communityDeg.get(c) ?? 0) + (kDeg.get(node.id) ?? 0));
    communityInt.set(c, 0);
  }

  // Iterate a few passes of modularity optimization
  const maxPasses = 10;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    for (const node of nodes) {
      const nodeId = node.id;
      const currentComm = communityMap.get(nodeId)!;
      const ki = kDeg.get(nodeId) ?? 0;
      const neighbors = adjacency.get(nodeId) ?? new Map();

      // Sum of edges to each neighbor community
      const commEdges = new Map<number, number>();
      for (const [nid, w] of neighbors) {
        const nc = communityMap.get(nid)!;
        commEdges.set(nc, (commEdges.get(nc) ?? 0) + w);
      }

      // Remove node from its community
      communityDeg.set(currentComm, (communityDeg.get(currentComm) ?? 0) - ki);

      let bestComm = currentComm;
      let bestGain = 0;

      for (const [targetComm, edgeSum] of commEdges) {
        const sigmaTot = communityDeg.get(targetComm) ?? 0;
        const gain = edgeSum / m2 - (sigmaTot * ki) / (m2 * m2);
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = targetComm;
        }
      }

      // Also check staying in current community
      const currentEdgeSum = commEdges.get(currentComm) ?? 0;
      const currentSigma = communityDeg.get(currentComm) ?? 0;
      const stayGain = currentEdgeSum / m2 - (currentSigma * ki) / (m2 * m2);

      if (bestGain > stayGain + 1e-10) {
        communityMap.set(nodeId, bestComm);
        communityDeg.set(bestComm, (communityDeg.get(bestComm) ?? 0) + ki);
        changed = true;
      } else {
        communityDeg.set(currentComm, (communityDeg.get(currentComm) ?? 0) + ki);
      }
    }

    if (!changed) break;
  }

  // Re-number communities to contiguous 0,1,2,...
  const seen = new Map<number, number>();
  let nextId = 0;
  for (const [nodeId, c] of communityMap) {
    if (!seen.has(c)) {
      seen.set(c, nextId++);
    }
    communityMap.set(nodeId, seen.get(c)!);
  }

  return communityMap;
}

/* ─── ThoughtRank computation ─── */

function computeThoughtRank(
  node: Omit<GraphNode, "thoughtRank">,
  totalNodes: number,
): number {
  if (totalNodes === 0) return 0;

  const relWeight = Math.min(node.relationCount / 10, 1) * 0.35;
  const importanceWeight = node.importance * 0.25;
  const branchWeight = node.branchPotential * 0.2;
  const contextDiv = Math.min(node.contextIds.length / 5, 1) * 0.1;
  const evergreenBonus = node.isEvergreen ? 0.1 : 0;

  return Math.min(
    1,
    relWeight + importanceWeight + branchWeight + contextDiv + evergreenBonus,
  );
}

/* ─── Cluster colors (pastel for backgrounds) ─── */

const CLUSTER_COLORS = [
  "rgba(59,130,246,0.08)",
  "rgba(34,197,94,0.08)",
  "rgba(249,115,22,0.08)",
  "rgba(168,85,247,0.08)",
  "rgba(20,184,166,0.08)",
  "rgba(236,72,153,0.08)",
  "rgba(234,179,8,0.08)",
  "rgba(239,68,68,0.08)",
  "rgba(99,102,241,0.08)",
  "rgba(14,165,233,0.08)",
];

/* ─── Determine layer from systemRelationType cache ─── */

function getLayerForType(
  type: string,
  systemTypes: { name: string; layer: number }[],
): string {
  const found = systemTypes.find((st) => st.name === type);
  return found ? `L${found.layer}` : "L1";
}

/* ─── Hook ─── */

export function useGraphData(options?: {
  /** Override context to load data for (defaults to active context) */
  contextId?: string;
  /** For local view: center unit ID, with depth N */
  centerUnitId?: string;
  depth?: number;
}): GraphData {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const contextId = options?.contextId ?? activeContextId;

  // Fetch units
  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: activeProjectId!,
      contextId: contextId ?? undefined,
      limit: 100,
    },
    { enabled: !!activeProjectId },
  );

  // Fetch system relation types (for layer mapping)
  const systemTypesQuery = api.relation.getSystemTypes.useQuery();

  // Build a flat array of unit IDs for relation fetching
  const unitItems = unitsQuery.data?.items ?? [];

  // We fetch relations per-unit then merge (tRPC limitation: no bulk relation fetch)
  // For efficiency, we fetch relations for the first loaded unit and expand later.
  // In practice, the graph needs a dedicated "graph data" endpoint; for now we
  // derive from list data and per-unit relations.

  // Use the first unit to bootstrap the relation query pattern, but we need
  // all relations. We'll use a "gather" approach: query relations for each unit.
  const unitIds = React.useMemo(
    () => unitItems.map((u) => u.id),
    [unitItems],
  );

  // Batch relation queries for each unit (React Query handles deduplication)
  const relationQueries = api.useQueries((t) =>
    unitIds.slice(0, 100).map((uid) =>
      t.relation.list({ unitId: uid }, { enabled: !!uid }),
    ),
  );

  const allRelationsLoading = relationQueries.some((q) => q.isLoading);
  const systemTypes = systemTypesQuery.data ?? [];

  // Build graph data
  const graphData = React.useMemo<GraphData>(() => {
    if (!unitItems.length) {
      return { nodes: [], links: [], clusters: [], isLoading: true };
    }

    // Deduplicate relations across all unit queries
    const relationMap = new Map<string, NonNullable<(typeof relationQueries)[number]["data"]>[number]>();
    for (const q of relationQueries) {
      for (const rel of q.data ?? []) {
        relationMap.set(rel.id, rel);
      }
    }
    const allRelations = [...relationMap.values()];

    // Count relations per unit
    const relCounts = new Map<string, number>();
    for (const rel of allRelations) {
      relCounts.set(rel.sourceUnitId, (relCounts.get(rel.sourceUnitId) ?? 0) + 1);
      relCounts.set(rel.targetUnitId, (relCounts.get(rel.targetUnitId) ?? 0) + 1);
    }

    // Build nodes
    const nodeMap = new Map<string, GraphNode>();
    for (const unit of unitItems) {
      const contextIds = (unit.unitContexts ?? []).map((uc: { contextId: string }) => uc.contextId);
      const partial = {
        id: unit.id,
        content: unit.content,
        primaryType: unit.primaryType,
        secondaryType: (unit as Record<string, unknown>).secondaryType as string | null | undefined,
        lifecycle: unit.lifecycle,
        isEvergreen: unit.isEvergreen,
        isArchived: unit.isArchived,
        importance: (unit as Record<string, unknown>).importance as number ?? 0,
        branchPotential: (unit as Record<string, unknown>).branchPotential as number ?? 0,
        relationCount: relCounts.get(unit.id) ?? 0,
        contextIds,
      };
      const thoughtRank = computeThoughtRank(
        partial,
        unitItems.length,
      );
      nodeMap.set(unit.id, { ...partial, thoughtRank });
    }

    const nodes = [...nodeMap.values()];

    // Build edges
    const links: GraphEdge[] = allRelations
      .filter((rel) => nodeMap.has(rel.sourceUnitId) && nodeMap.has(rel.targetUnitId))
      .map((rel) => ({
        id: rel.id,
        source: rel.sourceUnitId,
        target: rel.targetUnitId,
        sourceId: rel.sourceUnitId,
        targetId: rel.targetUnitId,
        type: rel.type,
        layer: getLayerForType(rel.type, systemTypes),
        strength: rel.strength ?? 0.5,
        direction: rel.direction as "one_way" | "bidirectional",
        purpose: Array.isArray(rel.purpose) ? (rel.purpose as string[]) : [],
        maturity: (rel as Record<string, unknown>).maturity as string ?? "exploratory",
      }));

    // If local view with centerUnitId, filter to N hops
    let filteredNodes = nodes;
    let filteredLinks = links;

    if (options?.centerUnitId) {
      const depth = options.depth ?? 2;
      const reachable = new Set<string>([options.centerUnitId]);
      for (let d = 0; d < depth; d++) {
        const toAdd: string[] = [];
        for (const link of links) {
          if (reachable.has(link.sourceId) && !reachable.has(link.targetId)) {
            toAdd.push(link.targetId);
          }
          if (reachable.has(link.targetId) && !reachable.has(link.sourceId)) {
            toAdd.push(link.sourceId);
          }
        }
        for (const id of toAdd) reachable.add(id);
      }
      filteredNodes = nodes.filter((n) => reachable.has(n.id));
      filteredLinks = links.filter(
        (l) => reachable.has(l.sourceId) && reachable.has(l.targetId),
      );
    }

    // Community detection
    const communityMap = detectCommunities(filteredNodes, filteredLinks);
    for (const node of filteredNodes) {
      node.clusterId = communityMap.get(node.id) ?? 0;
    }

    // Build cluster objects
    const clusterNodeMap = new Map<number, string[]>();
    for (const node of filteredNodes) {
      const c = node.clusterId ?? 0;
      if (!clusterNodeMap.has(c)) clusterNodeMap.set(c, []);
      clusterNodeMap.get(c)!.push(node.id);
    }

    const clusters: GraphCluster[] = [...clusterNodeMap.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([clusterId, nodeIds]) => {
        // Label = most common context or primary type
        const typeCounts = new Map<string, number>();
        for (const nid of nodeIds) {
          const node = nodeMap.get(nid);
          if (node) {
            const t = node.primaryType;
            typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
          }
        }
        let label = "Cluster";
        let maxCount = 0;
        for (const [t, count] of typeCounts) {
          if (count > maxCount) {
            maxCount = count;
            label = t.charAt(0).toUpperCase() + t.slice(1) + " cluster";
          }
        }

        return {
          id: clusterId,
          nodeIds,
          label,
          color: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]!,
          hull: null, // Computed at render time when positions are known
        };
      });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      clusters,
      isLoading: false,
    };
  }, [unitItems, relationQueries, systemTypes, options?.centerUnitId, options?.depth]);

  return {
    ...graphData,
    isLoading:
      unitsQuery.isLoading || allRelationsLoading || systemTypesQuery.isLoading,
  };
}
