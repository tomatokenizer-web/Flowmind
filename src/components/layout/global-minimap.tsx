"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { useWorkspaceStore } from "~/stores/workspace-store";
import { api } from "~/trpc/react";
import { UNIT_TYPE_ACCENT_COLORS, DEFAULT_NODE_COLOR } from "~/components/domain/graph/graph-types";

/* ─── Constants ─── */

const MM_WIDTH = 160;
const MM_HEIGHT = 120;
const MM_PAD = 6;

/* ─── Lightweight position layout (circle pack without simulation) ─── */

interface MiniNode {
  id: string;
  x: number;
  y: number;
  primaryType: string;
  contextIds: string[];
}

interface MiniEdge {
  sourceId: string;
  targetId: string;
}

function layoutNodes(ids: string[]): MiniNode[] {
  if (!ids.length) return [];
  // Deterministic spiral layout — no physics needed for a tiny overview
  const result: MiniNode[] = [];
  const cx = MM_WIDTH / 2;
  const cy = MM_HEIGHT / 2;
  const maxR = Math.min(MM_WIDTH, MM_HEIGHT) / 2 - MM_PAD - 4;

  ids.forEach((id, i) => {
    const t = i / Math.max(ids.length - 1, 1);
    const angle = i * 2.399963; // golden angle
    const r = maxR * Math.sqrt(t + 0.1);
    result.push({ id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), primaryType: "", contextIds: [] });
  });
  return result;
}

/* ─── Props ─── */

interface GlobalMinimapProps {
  className?: string;
}

/* ─── Component ─── */

export function GlobalMinimap({ className }: GlobalMinimapProps) {
  const { viewMode, activeProjectId, activeContextId, activeUnitId, setViewMode, setActiveUnit } =
    useWorkspaceStore();
  const [collapsed, setCollapsed] = React.useState(false);

  // Lightweight data fetch — units with minimal fields
  const unitsQuery = api.unit.list.useQuery(
    { projectId: activeProjectId!, limit: 100 },
    { enabled: !!activeProjectId, staleTime: 60_000 },
  );

  const units = unitsQuery.data?.items ?? [];

  // Build minimap nodes using spiral layout
  const miniNodes = React.useMemo<MiniNode[]>(() => {
    const nodes = layoutNodes(units.map((u) => u.id));
    for (let i = 0; i < nodes.length; i++) {
      const u = units[i];
      if (u && nodes[i]) {
        nodes[i]!.primaryType = u.primaryType;
        nodes[i]!.contextIds = (u.unitContexts ?? []).map(
          (uc: { contextId: string }) => uc.contextId,
        );
      }
    }
    return nodes;
  }, [units]);

  // Build path unit IDs for reading mode highlight
  // (We reuse the active context's units as a proxy for the reading path)
  const pathUnitIds = React.useMemo(() => {
    if (viewMode !== "reading" || !activeContextId) return new Set<string>();
    return new Set(
      units
        .filter((u) => u.unitContexts?.some((uc: { contextId: string }) => uc.contextId === activeContextId))
        .map((u) => u.id),
    );
  }, [viewMode, activeContextId, units]);

  // ID → position map for edge drawing
  const posMap = React.useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of miniNodes) m.set(n.id, { x: n.x, y: n.y });
    return m;
  }, [miniNodes]);

  // Build reading path line points
  const pathPoints = React.useMemo<string>(() => {
    if (viewMode !== "reading" || !pathUnitIds.size) return "";
    const pts = miniNodes
      .filter((n) => pathUnitIds.has(n.id))
      .map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`);
    return pts.join(" ");
  }, [viewMode, miniNodes, pathUnitIds]);

  // Handle click on minimap dot — jump to graph view centered there
  const handleNodeClick = React.useCallback(
    (unitId: string) => {
      setActiveUnit(unitId);
      setViewMode("graph");
    },
    [setActiveUnit, setViewMode],
  );

  // In graph view, delegate entirely to the existing GraphMinimap (don't double-render)
  if (viewMode === "graph") return null;

  // Don't show if no project
  if (!activeProjectId) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-4 right-4 z-30 select-none rounded-xl shadow-md",
        className,
      )}
      style={{
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        opacity: 0.88,
      }}
      aria-label="Global minimap"
      role="img"
    >
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-t-xl px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
        style={{ color: "var(--text-tertiary)" }}
        aria-label={collapsed ? "Expand minimap" : "Collapse minimap"}
      >
        <span className="font-medium tracking-wide" style={{ fontSize: 10 }}>
          OVERVIEW
        </span>
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center"
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {/* Map body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="map-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: MM_HEIGHT, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <svg
              width={MM_WIDTH}
              height={MM_HEIGHT}
              style={{ display: "block", cursor: "crosshair" }}
            >
              {/* Reading path line */}
              {viewMode === "reading" && pathPoints && (
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth={1.5}
                  strokeOpacity={0.55}
                  strokeLinejoin="round"
                />
              )}

              {/* Nodes */}
              {miniNodes.map((node) => {
                const isActive = node.id === activeUnitId;
                const isInContext =
                  activeContextId ? node.contextIds.includes(activeContextId) : false;
                const isPath = pathUnitIds.has(node.id);
                const color = UNIT_TYPE_ACCENT_COLORS[node.primaryType] ?? DEFAULT_NODE_COLOR;

                return (
                  <circle
                    key={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={isActive ? 4 : isPath ? 3 : isInContext ? 2.5 : 1.8}
                    fill={isActive ? "var(--accent-primary)" : isPath ? color : isInContext ? color : "var(--text-tertiary)"}
                    fillOpacity={isActive ? 1 : isInContext || isPath ? 0.8 : 0.35}
                    stroke={isActive ? "var(--bg-primary)" : "none"}
                    strokeWidth={isActive ? 1.5 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleNodeClick(node.id)}
                    aria-label={`Unit node`}
                  />
                );
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
