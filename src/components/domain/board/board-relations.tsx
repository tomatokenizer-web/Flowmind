"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import {
  LAYER_EDGE_COLORS,
  DEFAULT_EDGE_COLOR,
} from "~/components/domain/graph/graph-types";

/* ─── Types ─── */

export interface BoardRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  layer: string;
  strength: number;
  direction: "one_way" | "bidirectional";
}

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoardRelationsProps {
  relations: BoardRelation[];
  cardRects: Map<string, CardRect>;
  onRelationClick?: (relationId: string) => void;
  showLabels: boolean;
}

/* ─── Edge routing helpers ─── */

/** Find the nearest point on a rectangle edge to an external target point. */
function nearestEdgePoint(
  rect: CardRect,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const dx = targetX - cx;
  const dy = targetY - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const hw = rect.width / 2;
  const hh = rect.height / 2;

  // Calculate intersections with all four edges and pick the closest to center-to-target line
  const scaleX = Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

/* ─── Arrow marker ID helper ─── */

function getMarkerId(layer: string, strength: number): string {
  return `board-arrow-${layer}-${Math.round(strength * 10)}`;
}

/* ─── Component ─── */

export const BoardRelations = React.memo(function BoardRelations({
  relations,
  cardRects,
  onRelationClick,
  showLabels,
}: BoardRelationsProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Collect unique marker definitions needed
  const markers = React.useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; color: string }[] = [];

    for (const rel of relations) {
      const color = LAYER_EDGE_COLORS[rel.layer] ?? DEFAULT_EDGE_COLOR;
      const mid = getMarkerId(rel.layer, rel.strength);
      if (!seen.has(mid)) {
        seen.add(mid);
        result.push({ id: mid, color });
      }
    }
    return result;
  }, [relations]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <defs>
        {markers.map((m) => (
          <marker
            key={m.id}
            id={m.id}
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill={m.color} />
          </marker>
        ))}
      </defs>

      <g>
        {relations.map((rel) => {
          const sourceRect = cardRects.get(rel.sourceId);
          const targetRect = cardRects.get(rel.targetId);
          if (!sourceRect || !targetRect) return null;

          const targetCx = targetRect.x + targetRect.width / 2;
          const targetCy = targetRect.y + targetRect.height / 2;
          const sourceCx = sourceRect.x + sourceRect.width / 2;
          const sourceCy = sourceRect.y + sourceRect.height / 2;

          const p1 = nearestEdgePoint(sourceRect, targetCx, targetCy);
          const p2 = nearestEdgePoint(targetRect, sourceCx, sourceCy);

          const color = LAYER_EDGE_COLORS[rel.layer] ?? DEFAULT_EDGE_COLOR;
          const strokeWidth = 1 + rel.strength * 2;
          const isHovered = hoveredId === rel.id;
          const markerId = getMarkerId(rel.layer, rel.strength);

          // Midpoint for label
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;

          return (
            <g key={rel.id}>
              {/* Invisible wider hit area for hover/click */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth={Math.max(12, strokeWidth + 8)}
                className="pointer-events-stroke cursor-pointer"
                onMouseEnter={() => setHoveredId(rel.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onRelationClick?.(rel.id);
                }}
              />

              {/* Visible line */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
                strokeOpacity={isHovered ? 0.9 : 0.45}
                markerEnd={
                  rel.direction === "one_way"
                    ? `url(#${markerId})`
                    : undefined
                }
                markerStart={
                  rel.direction === "bidirectional"
                    ? `url(#${markerId})`
                    : undefined
                }
                className="transition-all duration-150"
                style={{ pointerEvents: "none" }}
              />

              {/* Relation type label (on hover or always if showLabels) */}
              {(isHovered || showLabels) && (
                <g transform={`translate(${mx}, ${my})`}>
                  <rect
                    x={-2}
                    y={-10}
                    width={rel.type.length * 6 + 12}
                    height={16}
                    rx={4}
                    fill="var(--bg-primary)"
                    stroke={color}
                    strokeWidth={0.5}
                    opacity={0.95}
                  />
                  <text
                    x={4}
                    y={2}
                    fill={color}
                    fontSize={10}
                    fontWeight={500}
                    fontFamily="inherit"
                    className="select-none"
                  >
                    {rel.type.replace(/_/g, " ")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
});

BoardRelations.displayName = "BoardRelations";
