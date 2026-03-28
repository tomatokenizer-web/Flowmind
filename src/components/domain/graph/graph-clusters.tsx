"use client";

import * as React from "react";
import type { GraphNode, GraphCluster } from "./graph-types";

/* ─── Convex Hull ─── */

function cross(O: [number, number], A: [number, number], B: [number, number]): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const n = sorted.length;

  const lower: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, sorted[i]!) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]!);
  }

  const upper: [number, number][] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, sorted[i]!) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]!);
  }

  // Remove last point of each half because it repeats
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/** Expand hull outward by padding */
function expandHull(hull: [number, number][], padding: number): [number, number][] {
  if (hull.length < 3) return hull;

  // Compute centroid
  let cx = 0;
  let cy = 0;
  for (const [hx, hy] of hull) {
    cx += hx;
    cy += hy;
  }
  cx /= hull.length;
  cy /= hull.length;

  // Push each point outward from centroid
  return hull.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return [
      px + (dx / dist) * padding,
      py + (dy / dist) * padding,
    ] as [number, number];
  });
}

/* ─── Props ─── */

interface GraphClustersProps {
  clusters: GraphCluster[];
  nodes: GraphNode[];
  onClusterClick?: (clusterId: number) => void;
}

/* ─── Component ─── */

export const GraphClusters = React.memo(function GraphClusters({
  clusters,
  nodes,
  onClusterClick,
}: GraphClustersProps) {
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  return (
    <g className="graph-clusters" style={{ pointerEvents: "none" }}>
      {clusters.map((cluster) => {
        // Get positions of all nodes in this cluster
        const points: [number, number][] = [];
        for (const nid of cluster.nodeIds) {
          const node = nodeMap.get(nid);
          if (node && node.x != null && node.y != null) {
            points.push([node.x, node.y]);
          }
        }

        if (points.length < 3) return null;

        const hull = convexHull(points);
        const expanded = expandHull(hull, 30);

        if (expanded.length < 3) return null;

        // Build smooth path using cubic bezier for rounded corners
        const pathD = buildSmoothPath(expanded);

        // Centroid for label
        let labelX = 0;
        let labelY = 0;
        for (const [px, py] of expanded) {
          labelX += px;
          labelY += py;
        }
        labelX /= expanded.length;
        labelY /= expanded.length;
        // Place label at the top of the cluster
        const minY = Math.min(...expanded.map((p) => p[1]));
        labelY = minY - 8;

        return (
          <g
            key={cluster.id}
            onClick={(e) => {
              e.stopPropagation();
              onClusterClick?.(cluster.id);
            }}
            style={{ pointerEvents: onClusterClick ? "all" : "none", cursor: onClusterClick ? "pointer" : "default" }}
          >
            {/* Hull fill */}
            <path
              d={pathD}
              fill={cluster.color}
              stroke={cluster.color.replace("0.08", "0.2")}
              strokeWidth={1}
              style={{ transition: "d 300ms ease" }}
            />

            {/* Cluster label */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize={10}
              fontWeight={500}
              fill="var(--text-tertiary)"
              opacity={0.6}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {cluster.label}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/* ─── Smooth rounded path from convex hull points ─── */

function buildSmoothPath(points: [number, number][]): string {
  if (points.length < 3) return "";

  const n = points.length;
  let d = `M ${(points[0]![0] + points[1]![0]) / 2} ${(points[0]![1] + points[1]![1]) / 2}`;

  for (let i = 0; i < n; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % n]!;
    const midX = (current[0] + next[0]) / 2;
    const midY = (current[1] + next[1]) / 2;
    d += ` Q ${current[0]} ${current[1]}, ${midX} ${midY}`;
  }

  d += " Z";
  return d;
}

GraphClusters.displayName = "GraphClusters";
