"use client";

import * as React from "react";
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3";
import { select } from "d3";
import { cn } from "~/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useGraphData } from "~/hooks/use-graph-data";
import { useGraphSimulation } from "~/hooks/use-graph-simulation";
import { GraphNodeComponent } from "./graph-node";
import { GraphEdgeComponent, GraphEdgeMarkers } from "./graph-edge";
import { GraphClusters } from "./graph-clusters";
import { GraphControls } from "./graph-controls";
import { GraphMinimap } from "./graph-minimap";
import { GraphTooltip } from "./graph-tooltip";
import { GraphLocalView } from "./graph-local-view";
import type {
  GraphNode,
  GraphEdge,
  GraphFilterState,
  GraphLayoutMode,
  GraphViewMode,
  TooltipTarget,
} from "./graph-types";
import { ALL_UNIT_TYPES, ALL_LAYERS } from "./graph-types";

/* ─── Props ─── */

interface GraphCanvasProps {
  className?: string;
}

/* ─── Default filter: everything visible ─── */

function createDefaultFilter(): GraphFilterState {
  return {
    visibleUnitTypes: new Set(ALL_UNIT_TYPES),
    visibleLayers: new Set(ALL_LAYERS),
    showOrphans: true,
    showArchived: false,
  };
}

/* ─── Component ─── */

export function GraphCanvas({ className }: GraphCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const gRef = React.useRef<SVGGElement>(null);
  const zoomRef = React.useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = React.useRef<ZoomTransform>(zoomIdentity);

  const setActiveUnit = useWorkspaceStore((s) => s.setActiveUnit);
  const activeUnitId = useWorkspaceStore((s) => s.activeUnitId);

  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [viewMode, setViewMode] = React.useState<GraphViewMode>("global");
  const [localCenterUnitId, setLocalCenterUnitId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<GraphFilterState>(createDefaultFilter);
  const [layout, setLayout] = React.useState<GraphLayoutMode>("force");
  const [tooltipTarget, setTooltipTarget] = React.useState<TooltipTarget>(null);
  const [containerRect, setContainerRect] = React.useState<DOMRect | null>(null);

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

  // Keep containerRect updated on scroll
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

  // Fetch graph data
  const { nodes: rawNodes, links: rawLinks, clusters, isLoading } = useGraphData();

  // Apply filters
  const { filteredNodes, filteredLinks } = React.useMemo(() => {
    let fn = rawNodes.filter((n) => filter.visibleUnitTypes.has(n.primaryType));
    if (!filter.showArchived) {
      fn = fn.filter((n) => !n.isArchived);
    }

    const nodeIds = new Set(fn.map((n) => n.id));

    if (!filter.showOrphans) {
      const connected = new Set<string>();
      for (const l of rawLinks) {
        if (nodeIds.has(l.sourceId) && nodeIds.has(l.targetId)) {
          connected.add(l.sourceId);
          connected.add(l.targetId);
        }
      }
      fn = fn.filter((n) => connected.has(n.id));
    }

    const finalNodeIds = new Set(fn.map((n) => n.id));
    const fl = rawLinks.filter(
      (l) =>
        filter.visibleLayers.has(l.layer) &&
        finalNodeIds.has(l.sourceId) &&
        finalNodeIds.has(l.targetId),
    );

    return { filteredNodes: fn, filteredLinks: fl };
  }, [rawNodes, rawLinks, filter]);

  // Filter clusters to only include those with visible nodes
  const filteredClusters = React.useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return clusters
      .map((c) => ({
        ...c,
        nodeIds: c.nodeIds.filter((id) => visibleIds.has(id)),
      }))
      .filter((c) => c.nodeIds.length > 2);
  }, [clusters, filteredNodes]);

  // Simulation
  const { tick, reheat, pinNode, unpinNode, setLayout: simSetLayout } =
    useGraphSimulation(filteredNodes, filteredLinks, {
      width: dimensions.width,
      height: dimensions.height,
      layout,
    });

  // Setup d3-zoom
  React.useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: { transform: ZoomTransform }) => {
        transformRef.current = event.transform;
        select(g).attr("transform", event.transform.toString());
      });

    select(svg).call(zoomBehavior);
    // Double-click zoom disabled to avoid conflict with node double-click
    select(svg).on("dblclick.zoom", null);

    zoomRef.current = zoomBehavior;

    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  // Zoom controls
  const handleZoomIn = React.useCallback(() => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    if (!svg || !zb) return;
    select(svg).transition().duration(300).call(zb.scaleBy, 1.3);
  }, []);

  const handleZoomOut = React.useCallback(() => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    if (!svg || !zb) return;
    select(svg).transition().duration(300).call(zb.scaleBy, 0.77);
  }, []);

  const handleFitToScreen = React.useCallback(() => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    if (!svg || !zb || filteredNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of filteredNodes) {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx > maxX) maxX = nx;
      if (ny > maxY) maxY = ny;
    }

    const padding = 60;
    const gw = (maxX - minX) || 100;
    const gh = (maxY - minY) || 100;
    const scale = Math.min(
      (dimensions.width - padding * 2) / gw,
      (dimensions.height - padding * 2) / gh,
      2,
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = dimensions.width / 2 - cx * scale;
    const ty = dimensions.height / 2 - cy * scale;

    const transform = zoomIdentity.translate(tx, ty).scale(scale);
    select(svg).transition().duration(500).call(zb.transform, transform);
  }, [filteredNodes, dimensions]);

  // Layout change
  const handleLayoutChange = React.useCallback(
    (mode: GraphLayoutMode) => {
      setLayout(mode);
      simSetLayout(mode);
      reheat();
    },
    [simSetLayout, reheat],
  );

  // Node interactions
  const handleSetActiveUnit = React.useCallback(
    (id: string) => {
      setActiveUnit(id);
    },
    [setActiveUnit],
  );

  const handleDoubleClick = React.useCallback((id: string) => {
    setLocalCenterUnitId(id);
    setViewMode("local");
  }, []);

  // Node drag
  const dragNodeRef = React.useRef<string | null>(null);
  const dragStartPos = React.useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = React.useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      dragNodeRef.current = nodeId;
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragNodeRef.current) return;
        const t = transformRef.current;
        const gx = (me.clientX - (containerRect?.left ?? 0) - t.x) / t.k;
        const gy = (me.clientY - (containerRect?.top ?? 0) - t.y) / t.k;
        pinNode(dragNodeRef.current, gx, gy);
      };

      const handleMouseUp = () => {
        if (dragNodeRef.current) {
          unpinNode(dragNodeRef.current);
          dragNodeRef.current = null;
        }
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [containerRect, pinNode, unpinNode],
  );

  // Compute graph bounds for minimap
  const graphBounds = React.useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of filteredNodes) {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx > maxX) maxX = nx;
      if (ny > maxY) maxY = ny;
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: dimensions.width, maxY: dimensions.height };
    return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 };
  }, [filteredNodes, dimensions, tick]);

  // Viewport in graph coordinates
  const viewport = React.useMemo(() => {
    const t = transformRef.current;
    return {
      x: -t.x / t.k,
      y: -t.y / t.k,
      width: dimensions.width / t.k,
      height: dimensions.height / t.k,
    };
  }, [dimensions, tick]);

  // Minimap navigation
  const handleMinimapNavigate = React.useCallback(
    (gx: number, gy: number) => {
      const svg = svgRef.current;
      const zb = zoomRef.current;
      if (!svg || !zb) return;
      const t = transformRef.current;
      const tx = dimensions.width / 2 - gx * t.k;
      const ty = dimensions.height / 2 - gy * t.k;
      const transform = zoomIdentity.translate(tx, ty).scale(t.k);
      select(svg).transition().duration(200).call(zb.transform, transform);
    },
    [dimensions],
  );

  // Cluster click — zoom into cluster
  const handleClusterClick = React.useCallback(
    (clusterId: number) => {
      const cluster = filteredClusters.find((c) => c.id === clusterId);
      if (!cluster) return;

      // Find bounding box of cluster nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const nid of cluster.nodeIds) {
        const node = filteredNodes.find((n) => n.id === nid);
        if (node?.x != null && node?.y != null) {
          if (node.x < minX) minX = node.x;
          if (node.y < minY) minY = node.y;
          if (node.x > maxX) maxX = node.x;
          if (node.y > maxY) maxY = node.y;
        }
      }

      if (!isFinite(minX)) return;

      const svg = svgRef.current;
      const zb = zoomRef.current;
      if (!svg || !zb) return;

      const padding = 80;
      const gw = (maxX - minX) || 100;
      const gh = (maxY - minY) || 100;
      const scale = Math.min(
        (dimensions.width - padding * 2) / gw,
        (dimensions.height - padding * 2) / gh,
        3,
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const tx = dimensions.width / 2 - cx * scale;
      const ty = dimensions.height / 2 - cy * scale;
      const transform = zoomIdentity.translate(tx, ty).scale(scale);
      select(svg).transition().duration(500).call(zb.transform, transform);
    },
    [filteredClusters, filteredNodes, dimensions],
  );

  // Compute parallel edge indices
  const edgeParallelMap = React.useMemo(() => {
    const pairCounts = new Map<string, number>();
    for (const link of filteredLinks) {
      const pairKey = [link.sourceId, link.targetId].sort().join("--");
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    const pairCurrentIndex = new Map<string, number>();
    const result = new Map<string, { index: number; total: number }>();

    for (const link of filteredLinks) {
      const pairKey = [link.sourceId, link.targetId].sort().join("--");
      const total = pairCounts.get(pairKey) ?? 1;
      const idx = pairCurrentIndex.get(pairKey) ?? 0;
      pairCurrentIndex.set(pairKey, idx + 1);
      result.set(link.id, { index: idx, total });
    }

    return result;
  }, [filteredLinks]);

  // Clear tooltip on background click
  const handleBackgroundClick = React.useCallback(() => {
    setTooltipTarget(null);
  }, []);

  // If in local view mode, render local view
  if (viewMode === "local" && localCenterUnitId) {
    return (
      <GraphLocalView
        centerUnitId={localCenterUnitId}
        onBack={() => {
          setViewMode("global");
          setLocalCenterUnitId(null);
        }}
        onNavigateToUnit={(id) => {
          setActiveUnit(id);
          setLocalCenterUnitId(id);
        }}
        className={className}
      />
    );
  }

  // Loading state
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
            Loading graph...
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredNodes.length === 0 && !isLoading) {
    return (
      <div
        ref={containerRef}
        className={cn("relative w-full h-full flex items-center justify-center", className)}
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No units to visualize
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Create some thought units in your active context to see the knowledge graph.
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
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        onClick={handleBackgroundClick}
        data-tick={tick}
        aria-label="Knowledge graph visualization"
        role="img"
      >
        <GraphEdgeMarkers />

        <g ref={gRef} style={{ willChange: "transform" }}>
          {/* Clusters (background layer) */}
          <GraphClusters
            clusters={filteredClusters}
            nodes={filteredNodes}
            onClusterClick={handleClusterClick}
          />

          {/* Edges */}
          <g className="graph-edges">
            {filteredLinks.map((link) => {
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

          {/* Nodes */}
          <g className="graph-nodes">
            {filteredNodes.map((node) => (
              <GraphNodeComponent
                key={node.id}
                node={node}
                viewMode="global"
                isActive={node.id === activeUnitId}
                onSetActive={handleSetActiveUnit}
                onDoubleClick={handleDoubleClick}
                onDragStart={handleDragStart}
                onShowTooltip={setTooltipTarget}
                onHideTooltip={() => setTooltipTarget(null)}
              />
            ))}
          </g>
        </g>
      </svg>

      {/* Controls overlay */}
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        filter={filter}
        onFilterChange={setFilter}
        layout={layout}
        onLayoutChange={handleLayoutChange}
      />

      {/* Minimap */}
      <GraphMinimap
        nodes={filteredNodes}
        links={filteredLinks}
        graphBounds={graphBounds}
        viewport={viewport}
        onNavigate={handleMinimapNavigate}
      />

      {/* Tooltip */}
      <GraphTooltip target={tooltipTarget} containerRect={containerRect} />
    </div>
  );
}

GraphCanvas.displayName = "GraphCanvas";
