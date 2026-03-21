"use client";

import * as React from "react";
import * as d3 from "d3";
import { useGraphStore } from "~/stores/graphStore";
import { usePanelStore } from "~/stores/panel-store";
import { useSelectionStore } from "~/stores/selectionStore";
import { announceToScreenReader } from "~/lib/accessibility";
import { usePrefersReducedMotion } from "~/hooks/use-prefers-reduced-motion";

// ─── Unit type → hex color ────────────────────────────────────────

const UNIT_TYPE_COLORS: Record<string, string> = {
  claim: "#3B82F6",
  question: "#F59E0B",
  evidence: "#10B981",
  counterargument: "#EF4444",
  observation: "#8B5CF6",
  idea: "#F97316",
  definition: "#06B6D4",
  assumption: "#EC4899",
  action: "#84CC16",
};

// ─── Relation type → hex color ────────────────────────────────────

const RELATION_TYPE_COLORS: Record<string, string> = {
  supports: "#10B981",
  contradicts: "#EF4444",
  derives_from: "#3B82F6",
  expands: "#8B5CF6",
  references: "#6B7280",
  exemplifies: "#F59E0B",
  defines: "#06B6D4",
  questions: "#F97316",
};

// ─── Relation type → purpose category ─────────────────────────────
// Maps each system relation type name to its purpose category.
// Argument: solid thick lines | Creative/Research: dashed lines | Structural: dotted lighter lines

type RelationCategory = "argument" | "creative_research" | "structure_containment";

const RELATION_TYPE_CATEGORY: Record<string, RelationCategory> = {
  // argument
  supports: "argument",
  contradicts: "argument",
  derives_from: "argument",
  expands: "argument",
  references: "argument",
  exemplifies: "argument",
  defines: "argument",
  questions: "argument",
  // creative_research
  inspires: "creative_research",
  echoes: "creative_research",
  transforms_into: "creative_research",
  foreshadows: "creative_research",
  parallels: "creative_research",
  contextualizes: "creative_research",
  operationalizes: "creative_research",
  // structure_containment
  contains: "structure_containment",
  presupposes: "structure_containment",
  defined_by: "structure_containment",
  grounded_in: "structure_containment",
  instantiates: "structure_containment",
  precedes: "structure_containment",
  supersedes: "structure_containment",
  complements: "structure_containment",
};

const NODE_RADIUS = 6;
const FOCUS_RING_RADIUS = NODE_RADIUS + 4;
const FOCUS_RING_COLOR = "#FFFFFF";
const FOCUS_RING_WIDTH = 2;
const FIT_ALL_PADDING = 60;
const DIMMED_OPACITY = 0.3;

// ─── Types ────────────────────────────────────────────────────────

interface GraphUnit {
  id: string;
  content: string;
  unitType: string;
  lifecycle?: string;
}

interface GraphRelation {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
  direction: string;
  isLoopback?: boolean;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  x?: number;
  y?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
  strength: number;
  isLoopback: boolean;
  source: string | SimNode;
  target: string | SimNode;
}

interface Props {
  units: GraphUnit[];
  relations: GraphRelation[];
  onNodeClick?: (nodeId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Find the nearest node in a given direction from the currently focused node.
 * Direction is one of "up", "down", "left", "right".
 */
function findNearestInDirection(
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

    // Check if the node is in the correct general direction.
    // We use a cone-based approach: the primary axis displacement must
    // be at least as large as the secondary axis displacement.
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

/**
 * Calculate bounding box of all visible nodes.
 */
function calcBoundingBox(nodes: SimNode[]) {
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

export function GlobalGraphCanvas({ units, relations, onNodeClick }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simRef = React.useRef<d3.Simulation<SimNode, SimLink> | null>(null);
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
  const closePanel = usePanelStore((s) => s.closePanel);
  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

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

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    content: string;
    unitType: string;
    lifecycle: string;
  } | null>(null);

  // Drag state
  const dragRef = React.useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
  }>({ dragging: false, lastX: 0, lastY: 0 });

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

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links).id((d: SimNode) => d.id),
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide(NODE_RADIUS * 2));

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
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw links (skip edges whose relation type is filtered out)
      for (const link of linksRef.current) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (source.x == null || source.y == null || target.x == null || target.y == null)
          continue;

        // Hide edges whose relation type is deselected
        if (hiddenRelationTypes.has(link.type)) continue;

        const edgeColor =
          RELATION_TYPE_COLORS[link.type] ?? "rgba(156, 163, 175, 1)";

        // Determine visual style based on purpose category
        const category = RELATION_TYPE_CATEGORY[link.type] ?? "argument";
        let lineDash: number[];
        let lineWidth: number;
        let edgeAlpha: number;
        if (category === "argument") {
          lineDash = [];        // solid
          lineWidth = 1.8;
          edgeAlpha = 0.7;
        } else if (category === "creative_research") {
          lineDash = [6, 4];   // dashed
          lineWidth = 1.2;
          edgeAlpha = 0.55;
        } else {
          // structure_containment
          lineDash = [2, 3];   // dotted
          lineWidth = 1;
          edgeAlpha = 0.4;
        }

        if (link.isLoopback) {
          const loopRadius = NODE_RADIUS * 3;
          ctx.beginPath();
          ctx.arc(source.x, source.y - loopRadius, loopRadius, 0, Math.PI * 2);
          ctx.setLineDash(lineDash.length ? lineDash : [4, 3]);
          ctx.strokeStyle = edgeColor;
          ctx.globalAlpha = edgeAlpha;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        } else {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.setLineDash(lineDash);
          ctx.strokeStyle = edgeColor;
          ctx.globalAlpha = edgeAlpha;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      const currentFocusId = focusedNodeIdRef.current;

      // Draw nodes (dim disconnected nodes to 30% opacity when relation filter is active)
      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;

        const isDimmed =
          connectedNodeIds !== null && !connectedNodeIds.has(node.id);

        // Draw focus ring if this node is keyboard-focused
        if (currentFocusId === node.id) {
          // Outer glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, FOCUS_RING_RADIUS + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = FOCUS_RING_WIDTH + 2;
          ctx.stroke();

          // Inner focus ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, FOCUS_RING_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = FOCUS_RING_COLOR;
          ctx.lineWidth = FOCUS_RING_WIDTH;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = UNIT_TYPE_COLORS[node.unitType] ?? "#6B7280";
        ctx.globalAlpha = isDimmed ? DIMMED_OPACITY : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

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
      setSelectedUnit(node.id);
      openPanel(node.id);
      setLocalHub(node.id);
      setLayer("local");
    },
    [setSelectedUnit, openPanel, setLocalHub, setLayer],
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
        closePanel();
        announceToScreenReader("Node deselected");
        return;
      }
    },
    [focusNode, selectNode, clearSelection, closePanel],
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

  // Mouse handlers
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    },
    [],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        setPan({ x: panOffset.x + dx, y: panOffset.y + dy });
        return;
      }

      // Hover tooltip
      const node = hitTest(e.clientX, e.clientY);
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
    [hitTest, panOffset, setPan],
  );

  const handleMouseUp = React.useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const node = hitTest(e.clientX, e.clientY);
      if (node) {
        setFocusedNodeId(node.id);
        selectNode(node);
        onNodeClick?.(node.id);
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
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-bg-secondary/90 px-3 py-2 text-xs text-text-secondary backdrop-blur-sm">
        <div className="mb-1 font-medium text-text-primary">Edge types</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <svg width="24" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <span>Argument</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 4" />
            </svg>
            <span>Creative / Research</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
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
      {/* Keyboard navigation hint (visible when canvas is focused but no node selected) */}
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
