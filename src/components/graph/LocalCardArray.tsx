"use client";

import * as React from "react";
import { ArrowLeft, Link2 } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { Button } from "~/components/ui/button";
import { CATEGORY_COLORS, getRelationCategory } from "~/lib/relation-utils";
import { UNIT_TYPE_COLORS } from "~/lib/unit-types";
import type { UnitType } from "@prisma/client";

// -- Utility: strip HTML tags and decode common entities --

function sanitizeContent(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// -- Framer Motion variants --

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

// -- SVG line drawing variant --

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

// -- Utility: build a cubic bezier path between two points --

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

// -- Utility: compute the midpoint of a cubic bezier --

function bezierMidpoint(
  x1: number, y1: number,
  x2: number, y2: number,
): { x: number; y: number } {
  const dx = x2 - x1;
  const cpOffset = Math.abs(dx) * 0.4;
  const cp1x = x1 + cpOffset;
  const cp2x = x2 - cpOffset;
  const t = 0.5;
  const mt = 1 - t;
  const x = mt ** 3 * x1 + 3 * mt ** 2 * t * cp1x + 3 * mt * t ** 2 * cp2x + t ** 3 * x2;
  const y = mt ** 3 * y1 + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y2;
  return { x, y };
}

// -- Utility: map strength to line opacity --

function strengthToOpacity(strength: number): number {
  if (strength >= 0.8) return 0.9;
  if (strength >= 0.5) return 0.6;
  return 0.4;
}

// -- Card position anchor interface --

interface CardAnchor {
  left: number;
  right: number;
  centerY: number;
}

// -- Component --

export function LocalCardArray() {
  const localHubId = useGraphStore((s) => s.localHubId);
  const localDepth = useGraphStore((s) => s.localDepth);
  const setLocalDepth = useGraphStore((s) => s.setLocalDepth);
  const setLayer = useGraphStore((s) => s.setLayer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  const [hoveredUnitId, setHoveredUnitId] = React.useState<string | null>(null);
  const [hiddenRelTypes, setHiddenRelTypes] = React.useState<Set<string>>(new Set());
  const [hintVisible, setHintVisible] = React.useState(true);
  const hintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [anchors, setAnchors] = React.useState<Map<string, CardAnchor>>(new Map());

  // Auto-hide hint after 3 seconds
  React.useEffect(() => {
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000);
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // Hide hint on first hover
  const handleCardHover = React.useCallback((id: string) => {
    setHoveredUnitId(id);
    if (hintVisible) {
      setHintVisible(false);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    }
  }, [hintVisible]);

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

  // Build relation count per unit
  const relationCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of relations) {
      map.set(r.sourceUnitId, (map.get(r.sourceUnitId) ?? 0) + 1);
      map.set(r.targetUnitId, (map.get(r.targetUnitId) ?? 0) + 1);
    }
    return map;
  }, [relations]);

  // Collect unique relation types present in the current subgraph
  const relTypeSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of relations) {
      set.add(r.type);
    }
    return set;
  }, [relations]);

  // Toggle a relation type filter
  const toggleRelType = React.useCallback((type: string) => {
    setHiddenRelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

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

  // Visible relations (filtered by type)
  const visibleRelations = React.useMemo(() => {
    return relations.filter((r) => !hiddenRelTypes.has(r.type));
  }, [relations, hiddenRelTypes]);

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
            Hub: {sanitizeContent(hubUnit.content).slice(0, 40)}
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

      {/* Relation type filter row */}
      {relTypeSet.size > 0 && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            Filter:
          </span>
          {Array.from(relTypeSet).sort().map((type) => {
            const category = getRelationCategory(type);
            const color = CATEGORY_COLORS[category] ?? "#6B7280";
            const isHidden = hiddenRelTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleRelType(type)}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all"
                style={{
                  backgroundColor: isHidden ? "transparent" : `${color}20`,
                  color: isHidden ? "#9CA3AF" : color,
                  border: `1px solid ${isHidden ? "#D1D5DB" : color}40`,
                  opacity: isHidden ? 0.5 : 1,
                  textDecoration: isHidden ? "line-through" : "none",
                }}
                aria-label={`${isHidden ? "Show" : "Hide"} ${type} relations`}
                aria-pressed={!isHidden}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: isHidden ? "#9CA3AF" : color }}
                />
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content area: columns with SVG overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto"
      >
        {/* Hover hint */}
        <AnimatePresence>
          {hintVisible && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-bg-secondary/90 px-3 py-1 text-[11px] text-text-tertiary shadow-sm backdrop-blur-sm"
            >
              Hover a card to see its connections
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG overlay for bezier connection lines */}
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          style={{ minHeight: "100%", minWidth: "100%" }}
        >
          <AnimatePresence mode="popLayout">
            {visibleRelations.map((r) => {
              const sourceAnchor = anchors.get(r.sourceUnitId);
              const targetAnchor = anchors.get(r.targetUnitId);
              if (!sourceAnchor || !targetAnchor) return null;

              const category = getRelationCategory(r.type);
              const color = CATEGORY_COLORS[category] ?? "#6B7280";
              const depthLayer = getRelationDepthLayer(r.sourceUnitId, r.targetUnitId);

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

              // Progressive disclosure: lines only visible when a connected card is hovered
              const isConnectedToHovered = highlightedRelationIds !== null && highlightedRelationIds.has(r.id);
              const shouldShow = hoveredUnitId !== null && isConnectedToHovered;
              const baseOpacity = strengthToOpacity(r.strength);
              const mid = bezierMidpoint(x1, y1, x2, y2);

              return (
                <motion.g
                  key={r.id}
                  custom={depthLayer}
                  variants={lineVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    opacity: shouldShow ? baseOpacity : 0,
                    filter: shouldShow
                      ? `drop-shadow(0 0 3px ${color})`
                      : undefined,
                    transition: "opacity 0.25s ease",
                  }}
                >
                  <path
                    d={buildBezierPath(x1, y1, x2, y2)}
                    fill="none"
                    stroke={color}
                    strokeWidth={Math.max(1.5, r.strength * 4)}
                    strokeLinecap="round"
                  />
                  {/* Relation type label at midpoint -- only when line is visible */}
                  {shouldShow && (
                    <>
                      <rect
                        x={mid.x - (r.type.length * 3 + 6)}
                        y={mid.y - 9}
                        width={r.type.length * 6 + 12}
                        height={18}
                        rx={9}
                        fill={color}
                        fillOpacity={0.15}
                      />
                      <text
                        x={mid.x}
                        y={mid.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={color}
                        fontSize={9}
                        fontWeight={600}
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {r.type}
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Column grid -- gap-12 for more breathing room */}
        <div
          className="grid h-full gap-12 p-6"
          style={{
            gridTemplateColumns: columns.length > 0
              ? columns.map((col) => col.depth === 0 ? "280px" : "240px").join(" ")
              : "1fr",
            minHeight: "100%",
          }}
        >
          <AnimatePresence mode="popLayout">
            {columns.map((col) => (
              <motion.div
                key={`col-${col.depth}`}
                className="flex flex-col gap-1.5"
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
                <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                  {col.unitIds.map((id) => {
                    const unit = unitMap.get(id);
                    if (!unit) return null;

                    const depthLayer = unitDepthMap.get(id) ?? 0;
                    const isHub = id === localHubId;
                    const isFaded = highlightedIds !== null && !highlightedIds.has(id);
                    const isConnected = highlightedIds !== null && highlightedIds.has(id) && id !== hoveredUnitId;
                    const isHovered = id === hoveredUnitId;
                    const relCount = relationCountMap.get(id) ?? 0;

                    const typeColors = UNIT_TYPE_COLORS[unit.unitType as UnitType] ?? { bg: "#F3F4F6", accent: "#6B7280" };
                    const cleanContent = sanitizeContent(unit.content);
                    const maxChars = isHub ? 40 : 25;
                    const truncated = cleanContent.length > maxChars
                      ? cleanContent.slice(0, maxChars) + "..."
                      : cleanContent;

                    return (
                      <motion.div
                        key={id}
                        ref={(el) => setCardRef(id, el)}
                        custom={depthLayer}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onMouseEnter={() => handleCardHover(id)}
                        onMouseLeave={() => setHoveredUnitId(null)}
                        className="relative"
                        style={{
                          opacity: isFaded ? 0.3 : 1,
                          transition: "opacity 0.2s ease, box-shadow 0.2s ease",
                        }}
                      >
                        {/* Mini card */}
                        <div
                          className="flex items-center gap-2 rounded-md border bg-bg-primary px-2.5"
                          style={{
                            height: isHub ? 64 : 48,
                            width: isHub ? 280 : 240,
                            borderLeftWidth: 3,
                            borderLeftColor: typeColors.accent,
                            borderColor: isConnected
                              ? `${typeColors.accent}80`
                              : isHovered
                                ? typeColors.accent
                                : undefined,
                            boxShadow: isHovered
                              ? `0 0 12px ${typeColors.accent}30, 0 2px 8px rgba(0,0,0,0.08)`
                              : isConnected
                                ? `0 0 8px ${typeColors.accent}20`
                                : isHub
                                  ? `0 0 0 2px ${typeColors.accent}30`
                                  : "0 1px 2px rgba(0,0,0,0.04)",
                            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                          }}
                        >
                          {/* Type badge */}
                          <span
                            className="flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${typeColors.accent}15`,
                              color: typeColors.accent,
                            }}
                          >
                            {unit.unitType.slice(0, 4)}
                          </span>

                          {/* Content */}
                          <span
                            className="min-w-0 flex-1 truncate text-xs text-text-primary"
                            style={{ fontWeight: isHub ? 600 : 400 }}
                            title={cleanContent}
                          >
                            {truncated}
                          </span>

                          {/* Relation count badge */}
                          {relCount > 0 && (
                            <span
                              className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-bg-secondary px-1 py-0.5 text-[9px] font-medium text-text-tertiary"
                              aria-label={`${relCount} link${relCount !== 1 ? "s" : ""}`}
                            >
                              <Link2 className="h-2.5 w-2.5" />
                              {relCount}
                            </span>
                          )}
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
            <div className="flex flex-col items-center justify-center gap-2 text-center text-text-tertiary">
              <Link2 className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No relations found</p>
              <p className="max-w-xs text-xs">
                Use AI Auto-create relations or manually link units to build
                connections from this hub.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
