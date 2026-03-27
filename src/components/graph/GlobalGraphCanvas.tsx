"use client";

import * as React from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import { useGraphStore } from "~/stores/graphStore";
import { usePanelStore } from "~/stores/panel-store";
import { announceToScreenReader } from "~/lib/accessibility";
import { usePrefersReducedMotion } from "~/hooks/use-prefers-reduced-motion";

import type { SimNode, SimLink, Props } from "./graph-types";
import { UNIT_TYPE_COLORS, NODE_RADIUS, FIT_ALL_PADDING } from "./graph-constants";
import { calcBoundingBox, findNearestInDirection } from "./graph-layout";
import { renderGraph } from "./graph-renderer";

export function GlobalGraphCanvas({ units, relations, onNodeClick }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simRef = React.useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = React.useRef<SimNode[]>([]);
  const linksRef = React.useRef<SimLink[]>([]);
  const animRef = React.useRef<number>(0);

  // Keyboard-focused node ID (separate from selection, which opens the panel)
  const [focusedNodeId, setFocusedNodeId] = React.useState<string | null>(null);
  const focusedNodeIdRef = React.useRef<string | null>(null);
  // Keep ref in sync for the render loop
  React.useEffect(() => {
    focusedNodeIdRef.current = focusedNodeId;
  }, [focusedNodeId]);

  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const panOffset = useGraphStore((s) => s.panOffset);
  const setZoom = useGraphStore((s) => s.setZoom);
  const setPan = useGraphStore((s) => s.setPan);
  const setLocalHub = useGraphStore((s) => s.setLocalHub);
  const setLayer = useGraphStore((s) => s.setLayer);
  const filters = useGraphStore((s) => s.filters);
  const setMiniMapNodes = useGraphStore((s) => s.setMiniMapNodes);

  // Counter for throttled mini-map updates (every ~10 frames)
  const miniMapFrameRef = React.useRef(0);
  const openPanel = usePanelStore((s) => s.openPanel);
  const clearSelection = usePanelStore((s) => s.clearSelection);

  const prefersReducedMotion = usePrefersReducedMotion();

  // Relation type filter: set of hidden relation types
  const hiddenRelationTypes = React.useMemo(
    () => new Set(filters.relationCategories),
    [filters.relationCategories],
  );

  // Filter units
  const filteredUnits = React.useMemo(() => {
    if (filters.unitTypes.length === 0) return units;
    return units.filter((u) => !filters.unitTypes.includes(u.unitType));
  }, [units, filters.unitTypes]);

  const filteredUnitIds = React.useMemo(
    () => new Set(filteredUnits.map((u) => u.id)),
    [filteredUnits],
  );

  // Compute the set of node IDs connected by at least one visible edge.
  // null means "all connected" (no relation filter active).
  const connectedNodeIds = React.useMemo(() => {
    if (hiddenRelationTypes.size === 0) return null;

    const connected = new Set<string>();
    for (const rel of relations) {
      if (hiddenRelationTypes.has(rel.type)) continue;
      if (!filteredUnitIds.has(rel.sourceUnitId)) continue;
      if (!filteredUnitIds.has(rel.targetUnitId)) continue;
      connected.add(rel.sourceUnitId);
      connected.add(rel.targetUnitId);
    }
    return connected;
  }, [relations, hiddenRelationTypes, filteredUnitIds]);

  // Hovered node — used to highlight connections and fade unrelated edges
  const hoveredNodeRef = React.useRef<string | null>(null);

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    content: string;
    unitType: string;
    lifecycle: string;
  } | null>(null);

  // Drag state — pan or node drag
  const dragRef = React.useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
    draggedNode: SimNode | null;
  }>({ dragging: false, lastX: 0, lastY: 0, draggedNode: null });

  // Build simulation
  React.useEffect(() => {
    const nodes: SimNode[] = filteredUnits.map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
      lifecycle: u.lifecycle ?? "confirmed",
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links: SimLink[] = relations
      .filter((r) => nodeIds.has(r.sourceUnitId) && nodeIds.has(r.targetUnitId))
      .map((r) => ({
        id: r.id,
        type: r.type,
        source: r.sourceUnitId,
        target: r.targetUnitId,
        strength: r.strength,
        isLoopback: r.isLoopback ?? r.sourceUnitId === r.targetUnitId,
      }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links).id((d: SimNode) => d.id).distance(120),
      )
      .force("charge", forceManyBody().strength(-250))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(NODE_RADIUS * 3));

    simRef.current = sim;

    // Clear focus if the focused node was filtered out
    if (focusedNodeIdRef.current && !nodeIds.has(focusedNodeIdRef.current)) {
      setFocusedNodeId(null);
    }

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUnits, relations]);

  // ─── Fit All handler via custom event ──────────────────────────

  React.useEffect(() => {
    const handleFitAll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const bbox = calcBoundingBox(nodesRef.current);
      if (!bbox) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const canvasW = rect.width;
      const canvasH = rect.height;

      // Single node: just center it
      if (bbox.width === 0 && bbox.height === 0) {
        setZoom(1);
        setPan({ x: -bbox.centerX, y: -bbox.centerY });
        return;
      }

      // Calculate zoom to fit bounding box + padding
      const scaleX =
        (canvasW - FIT_ALL_PADDING * 2) / (bbox.width + NODE_RADIUS * 4);
      const scaleY =
        (canvasH - FIT_ALL_PADDING * 2) / (bbox.height + NODE_RADIUS * 4);
      const newZoom = Math.max(0.3, Math.min(5, Math.min(scaleX, scaleY)));

      // Pan so bounding-box center lands at canvas center
      const newPanX = -bbox.centerX * newZoom;
      const newPanY = -bbox.centerY * newZoom;

      if (prefersReducedMotion) {
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Animated transition (ease-out cubic, 300ms)
        const startZoom = useGraphStore.getState().zoomLevel;
        const startPan = useGraphStore.getState().panOffset;
        const duration = 300;
        const startTime = performance.now();

        const animate = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - t, 3);

          setZoom(startZoom + (newZoom - startZoom) * ease);
          setPan({
            x: startPan.x + (newPanX - startPan.x) * ease,
            y: startPan.y + (newPanY - startPan.y) * ease,
          });

          if (t < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      }

      announceToScreenReader(
        `Viewport fitted to show all ${nodesRef.current.length} nodes`,
      );
    };

    window.addEventListener("flowmind:fit-all", handleFitAll);
    return () => window.removeEventListener("flowmind:fit-all", handleFitAll);
  }, [setZoom, setPan, prefersReducedMotion]);

  // Render loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      renderGraph(ctx, canvas, nodesRef.current, linksRef.current, {
        panOffset,
        zoomLevel,
        hiddenRelationTypes,
        connectedNodeIds,
        hoveredNodeId: hoveredNodeRef.current,
        focusedNodeId: focusedNodeIdRef.current,
        prefersReducedMotion,
      });

      // Push node positions to the store for the mini-map (throttled)
      miniMapFrameRef.current++;
      if (miniMapFrameRef.current % 10 === 0) {
        const mmNodes = nodesRef.current
          .filter((n) => n.x != null && n.y != null)
          .map((n) => ({ x: n.x!, y: n.y!, unitType: n.unitType }));
        setMiniMapNodes(mmNodes);
      }

      animRef.current = requestAnimationFrame(render);
    };

    // When user prefers reduced motion, render once after simulation
    // stabilizes instead of running a continuous animation loop
    if (prefersReducedMotion) {
      const sim = simRef.current;
      if (sim) {
        sim.on("end.reducedMotion", () => {
          render();
          cancelAnimationFrame(animRef.current);
        });
      }
      // Still render at least once immediately
      animRef.current = requestAnimationFrame(render);
      return () => {
        cancelAnimationFrame(animRef.current);
        if (sim) sim.on("end.reducedMotion", null);
      };
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [
    zoomLevel,
    panOffset,
    filteredUnitIds,
    setMiniMapNodes,
    hiddenRelationTypes,
    connectedNodeIds,
    prefersReducedMotion,
  ]);

  // ─── Keyboard navigation ──────────────────────────────────────

  const selectNode = React.useCallback(
    (node: SimNode) => {
      openPanel(node.id);
      setLocalHub(node.id);
      setLayer("local");
    },
    [openPanel, setLocalHub, setLayer],
  );

  const focusNode = React.useCallback(
    (node: SimNode) => {
      setFocusedNodeId(node.id);
      const label = `${node.unitType}: ${node.content.slice(0, 60)}`;
      announceToScreenReader(`Focused on ${label}`);
    },
    [],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const nodes = nodesRef.current;
      if (nodes.length === 0) return;

      // Arrow keys: directional navigation
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        const currentNode = nodes.find((n) => n.id === focusedNodeIdRef.current);

        if (!currentNode) {
          // No node focused yet -- focus the first node
          const first = nodes[0];
          if (first) focusNode(first);
          return;
        }

        const directionMap: Record<string, "up" | "down" | "left" | "right"> = {
          ArrowUp: "up",
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
        };

        const nearest = findNearestInDirection(
          nodes,
          currentNode,
          directionMap[e.key]!,
        );

        if (nearest) {
          focusNode(nearest);
        }
        return;
      }

      // Tab: cycle through nodes sequentially
      if (e.key === "Tab") {
        // Only intercept Tab when the canvas is focused
        e.preventDefault();

        const currentIndex = nodes.findIndex(
          (n) => n.id === focusedNodeIdRef.current,
        );

        let nextIndex: number;
        if (e.shiftKey) {
          // Shift+Tab: go backwards
          nextIndex =
            currentIndex <= 0 ? nodes.length - 1 : currentIndex - 1;
        } else {
          nextIndex =
            currentIndex < 0 || currentIndex >= nodes.length - 1
              ? 0
              : currentIndex + 1;
        }

        const nextNode = nodes[nextIndex];
        if (nextNode) {
          focusNode(nextNode);
          announceToScreenReader(
            `Node ${nextIndex + 1} of ${nodes.length}: ${nextNode.unitType}, ${nextNode.content.slice(0, 60)}`,
          );
        }
        return;
      }

      // Enter: select/open the focused node
      if (e.key === "Enter") {
        e.preventDefault();
        const currentNode = nodes.find(
          (n) => n.id === focusedNodeIdRef.current,
        );
        if (currentNode) {
          selectNode(currentNode);
          announceToScreenReader(
            `Selected ${currentNode.unitType}: ${currentNode.content.slice(0, 60)}`,
          );
        }
        return;
      }

      // Escape: deselect current node
      if (e.key === "Escape") {
        e.preventDefault();
        setFocusedNodeId(null);
        clearSelection();
        announceToScreenReader("Node deselected");
        return;
      }
    },
    [focusNode, selectNode, clearSelection],
  );

  // Hit test helper
  const hitTest = React.useCallback(
    (clientX: number, clientY: number): SimNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      // Convert screen coords to graph coords
      const gx = (mx - rect.width / 2 - panOffset.x) / zoomLevel;
      const gy = (my - rect.height / 2 - panOffset.y) / zoomLevel;

      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;
        const dx = gx - node.x;
        const dy = gy - node.y;
        if (dx * dx + dy * dy <= (NODE_RADIUS + 4) * (NODE_RADIUS + 4)) {
          return node;
        }
      }
      return null;
    },
    [panOffset, zoomLevel],
  );

  // Mouse handlers — node drag or canvas pan
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      const node = hitTest(e.clientX, e.clientY);
      if (node) {
        // Start dragging this node — fix it in place
        node.fx = node.x;
        node.fy = node.y;
        dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, draggedNode: node };
        // Reheat simulation so other nodes react
        simRef.current?.alpha(0.3).restart();
      } else {
        // Canvas pan
        dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, draggedNode: null };
      }
    },
    [hitTest],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;

        const draggedNode = dragRef.current.draggedNode;
        if (draggedNode) {
          // Move the dragged node in graph coordinates
          draggedNode.fx = (draggedNode.fx ?? 0) + dx / zoomLevel;
          draggedNode.fy = (draggedNode.fy ?? 0) + dy / zoomLevel;
          simRef.current?.alpha(0.1).restart();
        } else {
          // Pan canvas
          setPan({ x: panOffset.x + dx, y: panOffset.y + dy });
        }
        return;
      }

      // Hover tooltip + highlight
      const node = hitTest(e.clientX, e.clientY);
      hoveredNodeRef.current = node?.id ?? null;
      if (node) {
        const rect = canvasRef.current!.getBoundingClientRect();
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 12,
          content: node.content.slice(0, 50) + (node.content.length > 50 ? "..." : ""),
          unitType: node.unitType,
          lifecycle: node.lifecycle,
        });
      } else {
        setTooltip(null);
      }
    },
    [hitTest, panOffset, setPan, zoomLevel],
  );

  const handleMouseUp = React.useCallback(() => {
    const draggedNode = dragRef.current.draggedNode;
    if (draggedNode) {
      // Release the node — unfix so simulation can settle it
      draggedNode.fx = null;
      draggedNode.fy = null;
    }
    dragRef.current.dragging = false;
    dragRef.current.draggedNode = null;
  }, []);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const node = hitTest(e.clientX, e.clientY);
      if (node) {
        setFocusedNodeId(node.id);
        if (onNodeClick) {
          // Merge mode: only fire callback, don't switch to local view
          onNodeClick(node.id);
        } else {
          selectNode(node);
        }
      }
    },
    [hitTest, selectNode, onNodeClick],
  );

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Mouse position relative to canvas center (before zoom)
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(5, zoomLevel * factor));
      const ratio = newZoom / zoomLevel;

      // Adjust pan so the point under the cursor stays fixed:
      // Before zoom, graph point under cursor: gx = (mx - panOffset.x) / zoomLevel
      // After zoom, we want same gx under cursor: gx = (mx - newPanX) / newZoom
      // Solving: newPanX = mx - ratio * (mx - panOffset.x)
      const newPanX = mx - ratio * (mx - panOffset.x);
      const newPanY = my - ratio * (my - panOffset.y);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoomLevel, setZoom, setPan, panOffset],
  );

  // Build the screen-reader description of the focused node
  const focusedNode = React.useMemo(() => {
    if (!focusedNodeId) return null;
    return nodesRef.current.find((n) => n.id === focusedNodeId) ?? null;
  }, [focusedNodeId]);

  const ariaLabel = React.useMemo(() => {
    const base = `Knowledge graph with ${nodesRef.current.length} nodes`;
    if (focusedNode) {
      return `${base}. Focused: ${focusedNode.unitType} node, ${focusedNode.content.slice(0, 80)}`;
    }
    return `${base}. Use arrow keys or Tab to navigate nodes, Enter to select, Escape to deselect.`;
  }, [focusedNode]);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        tabIndex={0}
        role="application"
        aria-label={ariaLabel}
        aria-roledescription="interactive knowledge graph"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      />
      {/* Edge style legend */}
      <div className="pointer-events-none absolute bottom-[120px] left-3 z-10 rounded-lg border border-border bg-bg-secondary/90 px-3 py-2 text-xs text-text-secondary backdrop-blur-sm">
        <div className="mb-1 font-medium text-text-primary">Edge types</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <svg width="32" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="2.5" />
              <polygon points="26,1 32,4 26,7" fill="currentColor" />
            </svg>
            <span>Strong (supports / contradicts)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="32" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="1.8" />
              <polygon points="26,2 32,4 26,6" fill="currentColor" />
            </svg>
            <span>Medium (elaborates / exemplifies)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="32" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="1.0" strokeDasharray="6 4" />
              <polygon points="26,2.5 32,4 26,5.5" fill="currentColor" />
            </svg>
            <span>Creative / Research</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="32" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="1.0" strokeDasharray="2 3" />
              <polygon points="26,2.5 32,4 26,5.5" fill="currentColor" />
            </svg>
            <span>Structural</span>
          </div>
        </div>
      </div>

      {/* Hidden live region for keyboard navigation announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {focusedNode
          ? `Focused on ${focusedNode.unitType} node: ${focusedNode.content.slice(0, 80)}`
          : ""}
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 max-w-xs rounded-md bg-bg-secondary px-3 py-2 text-xs text-text-primary shadow-lg border border-border"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: UNIT_TYPE_COLORS[tooltip.unitType] ?? "#6B7280" }}
          />
          <span className="font-medium capitalize">{tooltip.unitType}</span>
          <span className="mx-1 text-text-tertiary">|</span>
          <span className="capitalize text-text-secondary">{tooltip.lifecycle}</span>
          <span className="mx-1 text-text-tertiary">|</span>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
