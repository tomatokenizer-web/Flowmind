"use client";

import * as React from "react";
import * as d3 from "d3";
import { useGraphStore } from "~/stores/graphStore";

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

const NODE_RADIUS = 6;

// ─── Types ────────────────────────────────────────────────────────

interface GraphUnit {
  id: string;
  content: string;
  unitType: string;
}

interface GraphRelation {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
  direction: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  content: string;
  unitType: string;
  x?: number;
  y?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  strength: number;
  source: string | SimNode;
  target: string | SimNode;
}

interface Props {
  units: GraphUnit[];
  relations: GraphRelation[];
}

export function GlobalGraphCanvas({ units, relations }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simRef = React.useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = React.useRef<SimNode[]>([]);
  const linksRef = React.useRef<SimLink[]>([]);
  const animRef = React.useRef<number>(0);

  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const panOffset = useGraphStore((s) => s.panOffset);
  const setZoom = useGraphStore((s) => s.setZoom);
  const setPan = useGraphStore((s) => s.setPan);
  const setLocalHub = useGraphStore((s) => s.setLocalHub);
  const setLayer = useGraphStore((s) => s.setLayer);
  const filters = useGraphStore((s) => s.filters);

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    content: string;
    unitType: string;
  } | null>(null);

  // Drag state
  const dragRef = React.useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
  }>({ dragging: false, lastX: 0, lastY: 0 });

  // Filter units
  const filteredUnits = React.useMemo(() => {
    if (filters.unitTypes.length === 0) return units;
    return units.filter((u) => !filters.unitTypes.includes(u.unitType));
  }, [units, filters.unitTypes]);

  const filteredUnitIds = React.useMemo(
    () => new Set(filteredUnits.map((u) => u.id)),
    [filteredUnits],
  );

  // Build simulation
  React.useEffect(() => {
    const nodes: SimNode[] = filteredUnits.map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links: SimLink[] = relations
      .filter((r) => nodeIds.has(r.sourceUnitId) && nodeIds.has(r.targetUnitId))
      .map((r) => ({
        id: r.id,
        source: r.sourceUnitId,
        target: r.targetUnitId,
        strength: r.strength,
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

    return () => {
      sim.stop();
    };
  }, [filteredUnits, relations]);

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

      // Draw links
      for (const link of linksRef.current) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (source.x == null || source.y == null || target.x == null || target.y == null)
          continue;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = "rgba(156, 163, 175, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = UNIT_TYPE_COLORS[node.unitType] ?? "#6B7280";
        ctx.fill();
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [zoomLevel, panOffset, filteredUnitIds]);

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
        setLocalHub(node.id);
        setLayer("local");
      }
    },
    [hitTest, setLocalHub, setLayer],
  );

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoomLevel * delta);
    },
    [zoomLevel, setZoom],
  );

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
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
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
