"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { UnitCard } from "~/components/unit/unit-card";
import { Button } from "~/components/ui/button";

// ── Relation category -> line color ──────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  argument: "#3B82F6",
  creative_research: "#8B5CF6",
  structure_containment: "#6B7280",
};

function getRelationCategory(type: string): string {
  const argumentTypes = [
    "supports", "contradicts", "derives_from", "expands",
    "references", "exemplifies", "defines", "questions",
  ];
  const creativeTypes = [
    "inspires", "echoes", "transforms_into", "foreshadows",
    "parallels", "contextualizes", "operationalizes",
  ];
  if (argumentTypes.includes(type)) return "argument";
  if (creativeTypes.includes(type)) return "creative_research";
  return "structure_containment";
}

// ── Framer Motion variants ───────────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (depthLayer: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: depthLayer * 0.1,
      duration: 0.35,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
};

const columnVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (colIndex: number) => ({
    opacity: 1,
    transition: {
      delay: colIndex * 0.08,
      duration: 0.3,
      staggerChildren: 0.06,
    },
  }),
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ── SVG line drawing variant ─────────────────────────────────────

const lineVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (depthLayer: number) => ({
    pathLength: 1,
    opacity: 0.7,
    transition: {
      delay: depthLayer * 0.1 + 0.15,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ── Utility: build a cubic bezier path between two points ────────

function buildBezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const dx = x2 - x1;
  const cpOffset = Math.abs(dx) * 0.4;
  const cp1x = x1 + cpOffset;
  const cp2x = x2 - cpOffset;
  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}

// ── Card position anchor interface ───────────────────────────────

interface CardAnchor {
  left: number;
  right: number;
  centerY: number;
}

// ── Component ────────────────────────────────────────────────────

export function LocalCardArray() {
  const localHubId = useGraphStore((s) => s.localHubId);
  const localDepth = useGraphStore((s) => s.localDepth);
  const setLocalDepth = useGraphStore((s) => s.setLocalDepth);
  const setLayer = useGraphStore((s) => s.setLayer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  const [hoveredUnitId, setHoveredUnitId] = React.useState<string | null>(null);
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [anchors, setAnchors] = React.useState<Map<string, CardAnchor>>(new Map());

  // Fetch multi-depth subgraph
  const { data: subgraph } = api.relation.neighborsByDepth.useQuery(
    {
      hubId: localHubId!,
      depth: localDepth,
      contextId: activeContextId ?? undefined,
    },
    { enabled: !!localHubId },
  );

  const relations = subgraph?.relations ?? [];
  const layers = subgraph?.layers ?? [];

  // Collect all unit IDs across all depth layers
  const allIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const layer of layers) {
      for (const id of layer) {
        ids.push(id);
      }
    }
    return ids;
  }, [layers]);

  // Build a map: unitId -> depth layer index
  const unitDepthMap = React.useMemo(() => {
    const map = new Map<string, number>();
    layers.forEach((layer, depthIdx) => {
      for (const id of layer) {
        if (!map.has(id)) map.set(id, depthIdx);
      }
    });
    return map;
  }, [layers]);

  // Fetch all unit data in one query
  const { data: units } = api.unit.listByIds.useQuery(
    { ids: allIds },
    { enabled: allIds.length > 0 },
  );

  // Escape to go back
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLayer("global");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLayer]);

  const hubUnit = units?.find((u) => u.id === localHubId);

  // Build unit lookup for fast access
  const unitMap = React.useMemo(() => {
    const map = new Map<string, NonNullable<typeof units>[number]>();
    if (units) {
      for (const u of units) {
        map.set(u.id, u);
      }
    }
    return map;
  }, [units]);

  // Group units by column (depth)
  const columns = React.useMemo(() => {
    const cols: Array<{ depth: number; unitIds: string[] }> = [];
    for (let d = 0; d < layers.length; d++) {
      const layerIds = layers[d] ?? [];
      if (layerIds.length > 0) {
        cols.push({ depth: d, unitIds: layerIds });
      }
    }
    return cols;
  }, [layers]);

  // Build relation adjacency: unitId -> set of connected unitIds
  const adjacency = React.useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const r of relations) {
      if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, new Set());
      if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, new Set());
      adj.get(r.sourceUnitId)!.add(r.targetUnitId);
      adj.get(r.targetUnitId)!.add(r.sourceUnitId);
    }
    return adj;
  }, [relations]);

  // Determine which unitIds are highlighted on hover
  const highlightedIds = React.useMemo(() => {
    if (!hoveredUnitId) return null;
    const connected = adjacency.get(hoveredUnitId);
    const set = new Set<string>([hoveredUnitId]);
    if (connected) {
      for (const id of connected) set.add(id);
    }
    return set;
  }, [hoveredUnitId, adjacency]);

  // Determine which relation IDs are highlighted on hover
  const highlightedRelationIds = React.useMemo(() => {
    if (!hoveredUnitId) return null;
    const set = new Set<string>();
    for (const r of relations) {
      if (r.sourceUnitId === hoveredUnitId || r.targetUnitId === hoveredUnitId) {
        set.add(r.id);
      }
    }
    return set;
  }, [hoveredUnitId, relations]);

  // Recalculate card anchors after render
  const recalcAnchors = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newAnchors = new Map<string, CardAnchor>();

    cardRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      newAnchors.set(id, {
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
        centerY: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setAnchors(newAnchors);
  }, []);

  // Recalculate anchors on data change and resize
  React.useEffect(() => {
    // Small delay so DOM has rendered the cards
    const timer = setTimeout(recalcAnchors, 60);
    return () => clearTimeout(timer);
  }, [allIds, units, localDepth, recalcAnchors]);

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      recalcAnchors();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recalcAnchors]);

  // Register a card ref
  const setCardRef = React.useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  // Build unit card props for reuse
  const buildUnitCardProps = React.useCallback(
    (unit: NonNullable<typeof units>[number], isHub: boolean) => ({
      id: unit.id,
      content: unit.content,
      unitType: unit.unitType,
      createdAt: new Date(unit.createdAt),
      lifecycle: (
        ["draft", "pending", "confirmed", "deferred", "complete"].includes(unit.lifecycle)
          ? unit.lifecycle
          : "draft"
      ) as "draft" | "pending" | "confirmed" | "deferred" | "complete",
      originType: unit.originType ?? undefined,
      sourceSpan: typeof unit.sourceSpan === "string" ? unit.sourceSpan : null,
    }),
    [],
  );

  // Determine the depth layer for a relation line (for animation delay)
  const getRelationDepthLayer = React.useCallback(
    (sourceId: string, targetId: string): number => {
      const sd = unitDepthMap.get(sourceId) ?? 0;
      const td = unitDepthMap.get(targetId) ?? 0;
      return Math.max(sd, td);
    },
    [unitDepthMap],
  );

  // Column header labels
  const columnLabel = (depth: number): string => {
    if (depth === 0) return "Hub";
    if (depth === 1) return "Direct";
    return `Depth ${depth}`;
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg-primary">
      {/* Controls bar */}
      <div className="flex flex-shrink-0 items-center gap-4 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLayer("global")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Global
        </Button>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <label htmlFor="depth-slider">Depth:</label>
          <input
            id="depth-slider"
            type="range"
            min={1}
            max={3}
            value={localDepth}
            onChange={(e) => setLocalDepth(Number(e.target.value))}
            className="h-1 w-24 accent-accent-primary"
          />
          <span className="w-4 text-center font-mono text-xs">{localDepth}</span>
        </div>

        {hubUnit && (
          <span className="truncate text-sm font-medium text-text-primary">
            Hub: {hubUnit.content.slice(0, 40)}
            {hubUnit.content.length > 40 ? "..." : ""}
          </span>
        )}

        <span className="text-xs text-text-tertiary">
          {allIds.length} unit{allIds.length !== 1 ? "s" : ""} &middot;{" "}
          {relations.length} relation{relations.length !== 1 ? "s" : ""}
        </span>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: CATEGORY_COLORS.argument }} />
            <span className="text-[10px] text-text-tertiary">Argument</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: CATEGORY_COLORS.creative_research }} />
            <span className="text-[10px] text-text-tertiary">Creative</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: CATEGORY_COLORS.structure_containment }} />
            <span className="text-[10px] text-text-tertiary">Structure</span>
          </div>
        </div>
      </div>

      {/* Main content area: columns with SVG overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto"
      >
        {/* SVG overlay for bezier connection lines */}
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          style={{ minHeight: "100%", minWidth: "100%" }}
        >
          <AnimatePresence mode="popLayout">
            {relations.map((r) => {
              const sourceAnchor = anchors.get(r.sourceUnitId);
              const targetAnchor = anchors.get(r.targetUnitId);
              if (!sourceAnchor || !targetAnchor) return null;

              const category = getRelationCategory(r.type);
              const color = CATEGORY_COLORS[category] ?? "#6B7280";
              const depthLayer = getRelationDepthLayer(r.sourceUnitId, r.targetUnitId);

              // Determine connection points: from the right edge of the source to the left edge of the target
              const sourceDepth = unitDepthMap.get(r.sourceUnitId) ?? 0;
              const targetDepth = unitDepthMap.get(r.targetUnitId) ?? 0;

              let x1: number, y1: number, x2: number, y2: number;

              if (sourceDepth <= targetDepth) {
                x1 = sourceAnchor.right;
                y1 = sourceAnchor.centerY;
                x2 = targetAnchor.left;
                y2 = targetAnchor.centerY;
              } else {
                x1 = targetAnchor.right;
                y1 = targetAnchor.centerY;
                x2 = sourceAnchor.left;
                y2 = sourceAnchor.centerY;
              }

              const isHighlighted = highlightedRelationIds === null || highlightedRelationIds.has(r.id);
              const isFaded = highlightedRelationIds !== null && !highlightedRelationIds.has(r.id);

              return (
                <motion.path
                  key={r.id}
                  d={buildBezierPath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isFaded ? 1 : Math.max(1.5, r.strength * 4)}
                  strokeLinecap="round"
                  custom={depthLayer}
                  variants={lineVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    opacity: isFaded ? 0.1 : undefined,
                    filter: isHighlighted && highlightedRelationIds !== null
                      ? `drop-shadow(0 0 3px ${color})`
                      : undefined,
                  }}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Column grid */}
        <div
          className="grid h-full gap-6 p-6"
          style={{
            gridTemplateColumns: columns.length > 0
              ? columns.map((col) => col.depth === 0 ? "minmax(280px, 320px)" : "minmax(240px, 1fr)").join(" ")
              : "1fr",
            minHeight: "100%",
          }}
        >
          <AnimatePresence mode="popLayout">
            {columns.map((col) => (
              <motion.div
                key={`col-${col.depth}`}
                className="flex flex-col gap-3"
                custom={col.depth}
                variants={columnVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Column header */}
                <div className="flex flex-shrink-0 items-center gap-2 pb-1">
                  <span
                    className={
                      col.depth === 0
                        ? "text-sm font-semibold text-accent-primary"
                        : "text-xs font-medium text-text-tertiary uppercase tracking-wider"
                    }
                  >
                    {columnLabel(col.depth)}
                  </span>
                  <span className="rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">
                    {col.unitIds.length}
                  </span>
                </div>

                {/* Scrollable card list */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                  {col.unitIds.map((id) => {
                    const unit = unitMap.get(id);
                    if (!unit) return null;

                    const depthLayer = unitDepthMap.get(id) ?? 0;
                    const isHub = id === localHubId;
                    const isFaded = highlightedIds !== null && !highlightedIds.has(id);
                    const isActive = highlightedIds !== null && highlightedIds.has(id);

                    return (
                      <motion.div
                        key={id}
                        ref={(el) => setCardRef(id, el)}
                        custom={depthLayer}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onMouseEnter={() => setHoveredUnitId(id)}
                        onMouseLeave={() => setHoveredUnitId(null)}
                        className="relative"
                        style={{
                          opacity: isFaded ? 0.3 : 1,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        {/* Hub glow effect */}
                        {isHub && (
                          <div
                            className="absolute -inset-1 rounded-lg bg-accent-primary/20 blur-md"
                            aria-hidden="true"
                          />
                        )}

                        {/* Hover highlight glow */}
                        {isActive && highlightedIds !== null && (
                          <div
                            className="absolute -inset-0.5 rounded-lg bg-accent-primary/10 blur-sm"
                            aria-hidden="true"
                          />
                        )}

                        <div
                          className={
                            isHub
                              ? "relative rounded-lg ring-2 ring-accent-primary shadow-lg"
                              : "relative"
                          }
                        >
                          <UnitCard
                            unit={buildUnitCardProps(unit, isHub)}
                            variant="compact"
                            selected={isHub}
                            className={isHub ? "border-accent-primary" : ""}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {columns.length === 0 && (
            <div className="flex items-center justify-center text-sm text-text-tertiary">
              No connections found. Try increasing the depth.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
