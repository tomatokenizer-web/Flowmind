/**
 * Cycle Detection Service
 * DFS-based cycle detection on the relation graph.
 * Returns the set of relation IDs that are "loopback" back-edges.
 */

interface RelationEdge {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
}

/**
 * Detect cycles in a directed graph using DFS.
 * Returns relation IDs that should be marked as loopbacks (back-edges).
 */
export function detectLoopbacks(relations: RelationEdge[]): Set<string> {
  // Build adjacency list: nodeId -> [(targetId, relationId)]
  const adj = new Map<string, Array<{ target: string; relId: string }>>();
  for (const rel of relations) {
    if (!adj.has(rel.sourceUnitId)) adj.set(rel.sourceUnitId, []);
    adj.get(rel.sourceUnitId)!.push({ target: rel.targetUnitId, relId: rel.id });
  }

  const visited = new Set<string>();
  const inStack = new Set<string>(); // nodes in current DFS path
  const loopbacks = new Set<string>();

  function dfs(nodeId: string) {
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const { target, relId } of adj.get(nodeId) ?? []) {
      if (!visited.has(target)) {
        dfs(target);
      } else if (inStack.has(target)) {
        // Back-edge found — this relation is a loopback
        loopbacks.add(relId);
      }
    }

    inStack.delete(nodeId);
  }

  // Run DFS from all nodes (handles disconnected components)
  const allNodes = new Set<string>();
  for (const rel of relations) {
    allNodes.add(rel.sourceUnitId);
    allNodes.add(rel.targetUnitId);
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return loopbacks;
}

/**
 * Run cycle detection on relations for a context and update loopback flags in DB.
 */
import type { PrismaClient } from "@prisma/client";

export async function updateLoopbacksForContext(
  db: PrismaClient,
  contextId: string,
): Promise<void> {
  // Get all relations for this context (via perspectives)
  const relations = await db.relation.findMany({
    where: { perspective: { contextId } },
    select: { id: true, sourceUnitId: true, targetUnitId: true },
  });

  if (relations.length === 0) return;

  const loopbackIds = detectLoopbacks(relations);

  // Reset all to false, then set detected ones to true
  await db.$transaction([
    db.relation.updateMany({
      where: { id: { in: relations.map((r) => r.id) } },
      data: { isLoopback: false },
    }),
    ...(loopbackIds.size > 0
      ? [
          db.relation.updateMany({
            where: { id: { in: Array.from(loopbackIds) } },
            data: { isLoopback: true },
          }),
        ]
      : []),
  ]);
}
