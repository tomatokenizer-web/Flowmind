"use client";

import * as React from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { useGraphData } from "~/hooks/use-graph-data";
import { useGraphSimulation } from "~/hooks/use-graph-simulation";
import { GraphNodeComponent } from "./graph-node";
import { GraphEdgeComponent, GraphEdgeMarkers } from "./graph-edge";
import { GraphTooltip } from "./graph-tooltip";
import type { GraphNode, TooltipTarget } from "./graph-types";

/* ─── Props ─── */

interface GraphLocalViewProps {
  /** Center unit ID to expand around */
  centerUnitId: string;
  /** Number of hops to include (default: 2) */
  depth?: number;
  /** Callback to navigate back to global view */
  onBack: () => void;
  /** Callback when a unit card is clicked */
  onNavigateToUnit: (unitId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function GraphLocalView({
  centerUnitId,
  depth = 2,
  onBack,
  onNavigateToUnit,
  className,
}: GraphLocalViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [tooltipTarget, setTooltipTarget] = React.useState<TooltipTarget>(null);
  const [containerRect, setContainerRect] = React.useState<DOMRect | null>(null);
  const [currentDepth, setCurrentDepth] = React.useState(depth);

  // Observe container size
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        setContainerRect(el.getBoundingClientRect());
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch local data
  const { nodes, links, isLoading } = useGraphData({
    centerUnitId,
    depth: currentDepth,
  });

  // Simulation
  const { tick } = useGraphSimulation(nodes, links, {
    width: dimensions.width,
    height: dimensions.height,
    chargeStrength: -200,
    linkDistance: 120,
    collisionMultiplier: 2,
    alphaTarget: 0.01,
  });

  // Compute parallel edge indices
  const edgeParallelMap = React.useMemo(() => {
    const pairCounts = new Map<string, number>();
    const pairIndices = new Map<string, number>();

    for (const link of links) {
      const pairKey = [link.sourceId, link.targetId].sort().join("--");
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    const pairCurrentIndex = new Map<string, number>();
    const result = new Map<string, { index: number; total: number }>();

    for (const link of links) {
      const pairKey = [link.sourceId, link.targetId].sort().join("--");
      const total = pairCounts.get(pairKey) ?? 1;
      const idx = pairCurrentIndex.get(pairKey) ?? 0;
      pairCurrentIndex.set(pairKey, idx + 1);
      result.set(link.id, { index: idx, total });
    }

    return result;
  }, [links]);

  // Node drag handling
  const handleDragStart = React.useCallback(() => {
    // Drag not needed for local view cards in this implementation
  }, []);

  // Update container rect on scroll/resize
  React.useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={cn("relative w-full h-full flex items-center justify-center", className)}
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  animation: `flowmind-dot-bounce 1.4s infinite ${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading local graph...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-2"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <button
          onClick={onBack}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
            "text-xs font-medium",
            "hover:bg-bg-hover transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          )}
          style={{ color: "var(--text-secondary)" }}
          aria-label="Back to global view"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Global View
        </button>

        <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {nodes.length} units within {currentDepth} hop{currentDepth !== 1 ? "s" : ""}
        </span>

        {/* Depth controls */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] mr-1" style={{ color: "var(--text-tertiary)" }}>
            Depth
          </span>
          <button
            onClick={() => setCurrentDepth((d) => Math.max(1, d - 1))}
            disabled={currentDepth <= 1}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded",
              "hover:bg-bg-hover transition-colors duration-fast",
              "disabled:opacity-30 disabled:pointer-events-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
            style={{ color: "var(--text-secondary)" }}
            aria-label="Decrease depth"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span
            className="text-xs font-medium tabular-nums w-4 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            {currentDepth}
          </span>
          <button
            onClick={() => setCurrentDepth((d) => Math.min(5, d + 1))}
            disabled={currentDepth >= 5}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded",
              "hover:bg-bg-hover transition-colors duration-fast",
              "disabled:opacity-30 disabled:pointer-events-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
            style={{ color: "var(--text-secondary)" }}
            aria-label="Increase depth"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        style={{ paddingTop: 44 }}
        data-tick={tick}
      >
        <GraphEdgeMarkers />

        {/* Edges */}
        <g className="graph-edges">
          {links.map((link) => {
            const parallel = edgeParallelMap.get(link.id) ?? { index: 0, total: 1 };
            return (
              <GraphEdgeComponent
                key={link.id}
                edge={link}
                parallelIndex={parallel.index}
                parallelTotal={parallel.total}
                onShowTooltip={setTooltipTarget}
                onHideTooltip={() => setTooltipTarget(null)}
              />
            );
          })}
        </g>

        {/* Nodes — local card view */}
        <g className="graph-nodes">
          {nodes.map((node) => (
            <GraphNodeComponent
              key={node.id}
              node={node}
              viewMode="local"
              isActive={node.id === centerUnitId}
              onSetActive={onNavigateToUnit}
              onDoubleClick={onNavigateToUnit}
              onDragStart={handleDragStart}
              onShowTooltip={setTooltipTarget}
              onHideTooltip={() => setTooltipTarget(null)}
            />
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      <GraphTooltip target={tooltipTarget} containerRect={containerRect} />
    </div>
  );
}

GraphLocalView.displayName = "GraphLocalView";
