import type { SimNode, BoundingBox } from "./graph-types";

/**
 * Calculate the bounding box of all positioned nodes.
 * Returns null if no nodes have positions yet.
 */
export function calcBoundingBox(nodes: SimNode[]): BoundingBox | null {
  const positioned = nodes.filter((n) => n.x != null && n.y != null);
  if (positioned.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of positioned) {
    if (n.x! < minX) minX = n.x!;
    if (n.y! < minY) minY = n.y!;
    if (n.x! > maxX) maxX = n.x!;
    if (n.y! > maxY) maxY = n.y!;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Find the nearest node in a given cardinal direction from the current node.
 * Uses a cone-based approach: the primary axis displacement must be at least
 * 30% of the secondary axis displacement to qualify as "in direction".
 */
export function findNearestInDirection(
  nodes: SimNode[],
  current: SimNode,
  direction: "up" | "down" | "left" | "right",
): SimNode | null {
  if (current.x == null || current.y == null) return null;

  let best: SimNode | null = null;
  let bestScore = Infinity;

  for (const node of nodes) {
    if (node.id === current.id) continue;
    if (node.x == null || node.y == null) continue;

    const dx = node.x - current.x;
    const dy = node.y - current.y;

    let inDirection = false;
    switch (direction) {
      case "up":
        inDirection = dy < 0 && Math.abs(dy) >= Math.abs(dx) * 0.3;
        break;
      case "down":
        inDirection = dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.3;
        break;
      case "left":
        inDirection = dx < 0 && Math.abs(dx) >= Math.abs(dy) * 0.3;
        break;
      case "right":
        inDirection = dx > 0 && Math.abs(dx) >= Math.abs(dy) * 0.3;
        break;
    }

    if (!inDirection) continue;

    const dist = dx * dx + dy * dy;
    if (dist < bestScore) {
      bestScore = dist;
      best = node;
    }
  }

  return best;
}
