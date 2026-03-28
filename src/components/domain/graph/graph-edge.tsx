"use client";

import * as React from "react";
import type { GraphNode, GraphEdge as GraphEdgeType, TooltipTarget } from "./graph-types";
import { LAYER_EDGE_COLORS, DEFAULT_EDGE_COLOR } from "./graph-types";

/* ─── Props ─── */

interface GraphEdgeProps {
  edge: GraphEdgeType;
  /** Active navigation purpose — edges matching get full opacity */
  activePurpose?: string | null;
  /** Index among parallel edges between same pair (for arc offset) */
  parallelIndex: number;
  /** Total parallel edges between same pair */
  parallelTotal: number;
  onShowTooltip: (target: TooltipTarget) => void;
  onHideTooltip: () => void;
  onClick?: (edgeId: string) => void;
}

/* ─── Helpers ─── */

function getNodePosition(node: GraphNode | string): { x: number; y: number } {
  if (typeof node === "string") return { x: 0, y: 0 };
  return { x: node.x ?? 0, y: node.y ?? 0 };
}

/* ─── Component ─── */

export const GraphEdgeComponent = React.memo(function GraphEdgeComponent({
  edge,
  activePurpose,
  parallelIndex,
  parallelTotal,
  onShowTooltip,
  onHideTooltip,
  onClick,
}: GraphEdgeProps) {
  const sourcePos = getNodePosition(edge.source as GraphNode);
  const targetPos = getNodePosition(edge.target as GraphNode);

  const layerColor = LAYER_EDGE_COLORS[edge.layer] ?? DEFAULT_EDGE_COLOR;

  // Width by strength: 0.0 -> 1px, 1.0 -> 3px
  const strokeWidth = 1 + edge.strength * 2;

  // Opacity by purpose match
  const hasPurposeMatch = activePurpose
    ? edge.purpose.includes(activePurpose)
    : true;
  const baseOpacity = hasPurposeMatch ? 0.6 + edge.strength * 0.3 : 0.12;

  // Compute path — straight or curved for parallel edges
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  let pathD: string;

  if (parallelTotal > 1) {
    // Arc offset for parallel edges
    const arcOffset = (parallelIndex - (parallelTotal - 1) / 2) * 20;
    const mx = (sourcePos.x + targetPos.x) / 2 + (-dy / dist) * arcOffset;
    const my = (sourcePos.y + targetPos.y) / 2 + (dx / dist) * arcOffset;
    pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${mx} ${my} ${targetPos.x} ${targetPos.y}`;
  } else {
    pathD = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
  }

  // Arrow marker ID
  const isBidirectional = edge.direction === "bidirectional";
  const markerId = isBidirectional
    ? `arrow-bi-${edge.layer}`
    : `arrow-${edge.layer}`;

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent) => {
      onShowTooltip({ kind: "edge", edge, x: e.clientX, y: e.clientY });
    },
    [edge, onShowTooltip],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      onShowTooltip({ kind: "edge", edge, x: e.clientX, y: e.clientY });
    },
    [edge, onShowTooltip],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(edge.id);
    },
    [edge.id, onClick],
  );

  return (
    <g className="graph-edge" style={{ willChange: "transform" }}>
      {/* Invisible wide hit area for hover/click */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 8, 12)}
        style={{ cursor: "pointer" }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={onHideTooltip}
        onClick={handleClick}
        aria-label={`Relation: ${edge.type}`}
        role="button"
        tabIndex={-1}
      />

      {/* Visible edge path */}
      <path
        d={pathD}
        fill="none"
        stroke={layerColor}
        strokeWidth={strokeWidth}
        strokeOpacity={baseOpacity}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        markerStart={isBidirectional ? `url(#${markerId}-start)` : undefined}
        style={{ pointerEvents: "none", transition: "stroke-opacity 150ms ease" }}
      />
    </g>
  );
});

/* ─── Arrow Marker Definitions ─── */

export function GraphEdgeMarkers() {
  const layers = Object.entries(LAYER_EDGE_COLORS);

  return (
    <defs>
      {layers.map(([layer, color]) => (
        <React.Fragment key={layer}>
          {/* One-way arrow */}
          <marker
            id={`arrow-${layer}`}
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M 0 2 L 10 5 L 0 8 Z" fill={color} opacity={0.7} />
          </marker>

          {/* Bidirectional arrow — end */}
          <marker
            id={`arrow-bi-${layer}`}
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M 2 2 L 10 5 L 2 8 Z" fill={color} opacity={0.7} />
          </marker>

          {/* Bidirectional arrow — start */}
          <marker
            id={`arrow-bi-${layer}-start`}
            viewBox="0 0 10 10"
            refX={0}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M 10 2 L 0 5 L 10 8 Z" fill={color} opacity={0.7} />
          </marker>
        </React.Fragment>
      ))}

      {/* Default fallback markers */}
      <marker
        id="arrow-default"
        viewBox="0 0 10 10"
        refX={10}
        refY={5}
        markerWidth={6}
        markerHeight={6}
        orient="auto-start-reverse"
        markerUnits="strokeWidth"
      >
        <path d="M 0 2 L 10 5 L 0 8 Z" fill={DEFAULT_EDGE_COLOR} opacity={0.7} />
      </marker>
    </defs>
  );
}

GraphEdgeComponent.displayName = "GraphEdge";
