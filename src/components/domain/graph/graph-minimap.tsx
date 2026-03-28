"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import type { GraphNode, GraphEdge } from "./graph-types";
import { UNIT_TYPE_ACCENT_COLORS, DEFAULT_NODE_COLOR } from "./graph-types";

/* ─── Constants ─── */

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 100;
const MINIMAP_PADDING = 8;

/* ─── Props ─── */

interface GraphMinimapProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  /** Full graph bounding box */
  graphBounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Current viewport in graph coordinates */
  viewport: { x: number; y: number; width: number; height: number };
  /** Callback when user clicks/drags on minimap to pan */
  onNavigate: (graphX: number, graphY: number) => void;
  className?: string;
}

/* ─── Component ─── */

export const GraphMinimap = React.memo(function GraphMinimap({
  nodes,
  links,
  graphBounds,
  viewport,
  onNavigate,
  className,
}: GraphMinimapProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const isDragging = React.useRef(false);

  // Compute scale to fit graph bounds into minimap
  const graphWidth = graphBounds.maxX - graphBounds.minX || 1;
  const graphHeight = graphBounds.maxY - graphBounds.minY || 1;
  const innerW = MINIMAP_WIDTH - MINIMAP_PADDING * 2;
  const innerH = MINIMAP_HEIGHT - MINIMAP_PADDING * 2;
  const scale = Math.min(innerW / graphWidth, innerH / graphHeight);

  // Transform graph coords -> minimap coords
  const toMiniX = (gx: number) => MINIMAP_PADDING + (gx - graphBounds.minX) * scale;
  const toMiniY = (gy: number) => MINIMAP_PADDING + (gy - graphBounds.minY) * scale;

  // Viewport rectangle in minimap coords
  const vpX = toMiniX(viewport.x);
  const vpY = toMiniY(viewport.y);
  const vpW = viewport.width * scale;
  const vpH = viewport.height * scale;

  // Convert minimap click to graph coordinates
  const minimapToGraph = React.useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const gx = (mx - MINIMAP_PADDING) / scale + graphBounds.minX;
      const gy = (my - MINIMAP_PADDING) / scale + graphBounds.minY;
      onNavigate(gx, gy);
    },
    [scale, graphBounds.minX, graphBounds.minY, onNavigate],
  );

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      minimapToGraph(e.clientX, e.clientY);
    },
    [minimapToGraph],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        minimapToGraph(e.clientX, e.clientY);
      }
    },
    [minimapToGraph],
  );

  const handleMouseUp = React.useCallback(() => {
    isDragging.current = false;
  }, []);

  React.useEffect(() => {
    const handler = () => { isDragging.current = false; };
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, []);

  return (
    <div
      className={cn(
        "absolute bottom-3 left-3 rounded-lg overflow-hidden shadow-resting",
        className,
      )}
      style={{
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        opacity: 0.85,
      }}
      aria-label="Graph minimap"
      role="img"
    >
      <svg
        ref={svgRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        style={{ cursor: "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Edges — thin lines */}
        {links.map((link) => {
          const source = typeof link.source === "object" ? link.source : null;
          const target = typeof link.target === "object" ? link.target : null;
          if (!source || !target || source.x == null || source.y == null || target.x == null || target.y == null) return null;
          return (
            <line
              key={link.id}
              x1={toMiniX(source.x)}
              y1={toMiniY(source.y)}
              x2={toMiniX(target.x)}
              y2={toMiniY(target.y)}
              stroke="var(--text-tertiary)"
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          );
        })}

        {/* Nodes — tiny dots */}
        {nodes.map((node) => {
          if (node.x == null || node.y == null) return null;
          const color = UNIT_TYPE_ACCENT_COLORS[node.primaryType] ?? DEFAULT_NODE_COLOR;
          return (
            <circle
              key={node.id}
              cx={toMiniX(node.x)}
              cy={toMiniY(node.y)}
              r={1.5}
              fill={color}
              opacity={0.7}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={vpX}
          y={vpY}
          width={Math.max(vpW, 4)}
          height={Math.max(vpH, 3)}
          fill="var(--accent-primary)"
          fillOpacity={0.08}
          stroke="var(--accent-primary)"
          strokeWidth={1}
          strokeOpacity={0.6}
          rx={1}
        />
      </svg>
    </div>
  );
});

GraphMinimap.displayName = "GraphMinimap";
