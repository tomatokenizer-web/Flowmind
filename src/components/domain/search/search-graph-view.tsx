"use client";

import * as React from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { cn } from "~/lib/utils";
import {
  UNIT_TYPE_ACCENT_COLORS,
  UNIT_TYPE_BG_COLORS,
  LAYER_EDGE_COLORS,
  DEFAULT_NODE_COLOR,
  DEFAULT_EDGE_COLOR,
} from "~/components/domain/graph/graph-types";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

interface SearchGraphNode extends SimulationNodeDatum {
  id: string;
  content: string;
  primaryType: string;
  isMatch: boolean;
}

interface SearchGraphEdge extends SimulationLinkDatum<SearchGraphNode> {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  layer: string;
}

interface SearchGraphViewProps {
  /** Matched units from search */
  matchedUnits: UnitCardUnit[];
  /** Neighbor units (connected to matches but not themselves matching) */
  neighborUnits?: UnitCardUnit[];
  /** Edges between all visible units */
  edges?: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
    layer: string;
  }>;
  /** Click handler for a node */
  onNodeClick?: (id: string) => void;
  className?: string;
}

/* ─── Simulation ─── */

function useForceSimulation(
  nodes: SearchGraphNode[],
  edges: SearchGraphEdge[],
  width: number,
  height: number,
) {
  const [positions, setPositions] = React.useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  React.useEffect(() => {
    if (nodes.length === 0 || width === 0 || height === 0) return;

    const simNodes = nodes.map((n) => ({ ...n }));
    const simEdges = edges.map((e) => ({
      ...e,
      source: e.sourceId,
      target: e.targetId,
    }));

    const simulation = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simEdges)
          .id((d) => (d as SearchGraphNode).id)
          .distance(80),
      )
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(24));

    simulation.on("tick", () => {
      const map = new Map<string, { x: number; y: number }>();
      for (const node of simNodes) {
        map.set(node.id, {
          x: Math.max(20, Math.min(width - 20, node.x ?? 0)),
          y: Math.max(20, Math.min(height - 20, node.y ?? 0)),
        });
      }
      setPositions(new Map(map));
    });

    // Run simulation to completion quickly
    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height]);

  return positions;
}

/* ─── Component ─── */

export function SearchGraphView({
  matchedUnits,
  neighborUnits = [],
  edges = [],
  onNodeClick,
  className,
}: SearchGraphViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  /* ─── Resize observer ─── */
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ─── Build graph data ─── */
  const matchedIds = React.useMemo(
    () => new Set(matchedUnits.map((u) => u.id)),
    [matchedUnits],
  );

  const graphNodes: SearchGraphNode[] = React.useMemo(() => {
    const all = [...matchedUnits, ...neighborUnits];
    const seen = new Set<string>();
    return all
      .filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      })
      .map((u) => ({
        id: u.id,
        content: u.content,
        primaryType: u.primaryType,
        isMatch: matchedIds.has(u.id),
      }));
  }, [matchedUnits, neighborUnits, matchedIds]);

  const graphEdges: SearchGraphEdge[] = React.useMemo(() => {
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    return edges
      .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
      .map((e) => ({
        ...e,
        source: e.sourceId,
        target: e.targetId,
      }));
  }, [edges, graphNodes]);

  const positions = useForceSimulation(
    graphNodes,
    graphEdges,
    dimensions.width,
    dimensions.height,
  );

  /* ─── Empty state ─── */
  if (matchedUnits.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-text-tertiary",
          className,
        )}
      >
        No results to visualize
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-[300px]", className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {/* Edges */}
        {graphEdges.map((edge) => {
          const sourcePos = positions.get(edge.sourceId);
          const targetPos = positions.get(edge.targetId);
          if (!sourcePos || !targetPos) return null;

          const isHighlighted =
            matchedIds.has(edge.sourceId) && matchedIds.has(edge.targetId);

          return (
            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke={
                LAYER_EDGE_COLORS[edge.layer] ?? DEFAULT_EDGE_COLOR
              }
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={isHighlighted ? 0.6 : 0.2}
              strokeDasharray={isHighlighted ? undefined : "4 2"}
            />
          );
        })}

        {/* Nodes */}
        {graphNodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const accent =
            UNIT_TYPE_ACCENT_COLORS[node.primaryType] ?? DEFAULT_NODE_COLOR;
          const bg =
            UNIT_TYPE_BG_COLORS[node.primaryType] ?? "#f5f5f5";
          const radius = node.isMatch ? 10 : 6;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onNodeClick?.(node.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${node.primaryType}: ${node.content.slice(0, 40)}`}
            >
              {/* Glow ring for matched nodes */}
              {node.isMatch && (
                <circle
                  r={radius + 4}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                />
              )}
              <circle
                r={radius}
                fill={bg}
                stroke={accent}
                strokeWidth={node.isMatch ? 2 : 1}
                opacity={node.isMatch ? 1 : 0.4}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltips rendered as HTML overlays for matched nodes */}
      {graphNodes
        .filter((n) => n.isMatch)
        .map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          return (
            <SimpleTooltip
              key={node.id}
              content={node.content.slice(0, 60)}
              side="top"
            >
              <div
                className="absolute"
                style={{
                  left: pos.x - 12,
                  top: pos.y - 12,
                  width: 24,
                  height: 24,
                }}
              />
            </SimpleTooltip>
          );
        })}
    </div>
  );
}

SearchGraphView.displayName = "SearchGraphView";
