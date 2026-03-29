"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  GitFork,
  ArrowDownNarrowWide,
  Network,
  Search,
  X,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UnitType } from "@prisma/client";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { usePanelStore } from "~/stores/panel-store";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { CATEGORY_COLORS, getRelationCategory } from "~/lib/relation-utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ThreadSortOrder = "chronological" | "derivation";

interface ThreadViewProps {
  projectId: string | undefined;
  onSwitchToGraph?: () => void;
  className?: string;
}

interface RelationData {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
  direction: string;
}

// ─── Branch Point Indicator ───────────────────────────────────────────

function BranchPointIndicator({
  forkCount,
  unitId,
  onExpandBranches,
}: {
  forkCount: number;
  unitId: string;
  onExpandBranches?: (unitId: string) => void;
}) {
  if (forkCount <= 1) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpandBranches?.(unitId);
            }}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 z-10",
              "flex items-center justify-center",
              "h-7 w-7 rounded-full",
              "bg-bg-surface text-text-secondary",
              "border border-border",
              "text-xs font-semibold shadow-resting",
              "transition-all duration-fast",
              "hover:bg-accent-primary hover:text-white hover:scale-110 hover:shadow-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
            aria-label={`${forkCount} branches from this unit`}
          >
            <GitFork className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {forkCount} branches
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Relation Connector ───────────────────────────────────────────────

function RelationConnector({ relation }: { relation: RelationData }) {
  const category = getRelationCategory(relation.type);
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.structure_containment;

  return (
    <div className="flex justify-center py-0.5">
      <div className="flex flex-col items-center">
        <svg width="2" height="14" viewBox="0 0 2 14" aria-hidden="true">
          <line
            x1="1" y1="0" x2="1" y2="14"
            stroke={color} strokeWidth="1.5" strokeOpacity="0.3"
            strokeDasharray="3 2"
          />
        </svg>
        <div
          className="h-1.5 w-1.5 rounded-full ring-2 ring-bg-primary"
          style={{ backgroundColor: color }}
        />
        <svg width="2" height="6" viewBox="0 0 2 6" aria-hidden="true">
          <line
            x1="1" y1="0" x2="1" y2="6"
            stroke={color} strokeWidth="1.5" strokeOpacity="0.3"
            strokeDasharray="3 2"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Card Spacer ──────────────────────────────────────────────────────

function CardSpacer() {
  return <div className="h-3" />;
}

// ─── Thread Unit type ─────────────────────────────────────────────────

interface ThreadUnit {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  createdAt: string | Date;
  originType?: string | null;
  relationCount: number;
}

// ─── Thread Item ──────────────────────────────────────────────────────
// Clean white card matching the AttentionView aesthetic:
// type badge top-left, timestamp top-right, content body, click to open.

function ThreadItem({
  unit,
  relations,
  forkCount,
  isFirst,
  index,
  onExpandBranches,
}: {
  unit: ThreadUnit;
  relations: RelationData[];
  forkCount: number;
  isFirst: boolean;
  index: number;
  onExpandBranches?: (unitId: string) => void;
}) {
  const primaryRelation = relations[0];
  const openPanel = usePanelStore((s) => s.openPanel);
  const createdAt = typeof unit.createdAt === "string"
    ? new Date(unit.createdAt)
    : unit.createdAt;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.025, 0.3),
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Connector or spacer between cards */}
      {!isFirst && (
        primaryRelation
          ? <RelationConnector relation={primaryRelation} />
          : <CardSpacer />
      )}

      {/* Clean white card */}
      <div className="relative">
        <button
          type="button"
          onClick={() => openPanel(unit.id)}
          className={cn(
            "w-full text-left rounded-xl border border-border bg-bg-primary p-4",
            "transition-shadow duration-fast",
            "hover:shadow-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "cursor-pointer",
          )}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UnitTypeBadge unitType={unit.unitType as UnitType} />
              {unit.relationCount > 0 && (
                <span className="text-[11px] text-text-tertiary">
                  {unit.relationCount} links
                </span>
              )}
            </div>
            <span className="text-xs text-text-tertiary">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-text-primary leading-relaxed line-clamp-3">
            {unit.content}
          </p>
        </button>

        <BranchPointIndicator
          forkCount={forkCount}
          unitId={unit.id}
          onExpandBranches={onExpandBranches}
        />
      </div>
    </motion.div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          {i > 0 && (
            <div className="flex justify-center py-1">
              <div className="h-5 w-px bg-border opacity-30" />
            </div>
          )}
          <div className="rounded-xl border border-border bg-bg-primary p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-bg-secondary" />
                <div className="h-4 w-10 rounded bg-bg-secondary" />
              </div>
              <div className="h-4 w-24 rounded bg-bg-secondary" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-bg-secondary" />
              <div className="h-4 w-4/5 rounded bg-bg-secondary" />
              {i % 2 === 0 && <div className="h-4 w-3/5 rounded bg-bg-secondary" />}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="h-3 w-20 rounded bg-bg-secondary" />
              <div className="h-3 w-16 rounded bg-bg-secondary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────

function ThreadEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-2xl bg-bg-secondary p-5">
        <MessageSquare className="h-8 w-8 text-text-tertiary" />
      </div>
      <p className="text-sm font-medium text-text-secondary">No units yet</p>
      <p className="mt-1 text-xs text-text-tertiary max-w-[220px]">
        Capture a thought to start building your thread
      </p>
    </div>
  );
}

// ─── ThreadView ───────────────────────────────────────────────────────

export function ThreadView({
  projectId,
  onSwitchToGraph,
  className,
}: ThreadViewProps) {
  const [sortOrder, setSortOrder] = React.useState<ThreadSortOrder>("chronological");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const openPanel = usePanelStore((s) => s.openPanel);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch units
  const { data: unitsData, isLoading } = api.unit.list.useQuery(
    { projectId, contextId: activeContextId ?? undefined, limit: 100 },
    { enabled: !!projectId },
  );
  const units = unitsData?.items ?? [];

  // Fetch relations
  const unitIds = React.useMemo(() => units.map((u) => u.id), [units]);
  const { data: relationsData } = api.relation.listByUnits.useQuery(
    { unitIds, contextId: activeContextId ?? undefined },
    { enabled: unitIds.length > 0 },
  );

  // Build relations map and fork counts
  const { relationsMap, forkCounts } = React.useMemo(() => {
    const map = new Map<string, RelationData[]>();
    const forks = new Map<string, number>();
    const seen = new Set<string>();

    if (!relationsData) return { relationsMap: map, forkCounts: forks };

    for (const r of relationsData) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const existing = map.get(r.targetUnitId) ?? [];
      existing.push(r);
      map.set(r.targetUnitId, existing);
      forks.set(r.sourceUnitId, (forks.get(r.sourceUnitId) ?? 0) + 1);
    }

    return { relationsMap: map, forkCounts: forks };
  }, [relationsData]);

  // Build derivation order
  const derivationOrder = React.useMemo(() => {
    if (sortOrder !== "derivation") return null;

    const derivesFrom = new Map<string, string[]>();
    for (const [targetId, rels] of relationsMap) {
      for (const r of rels) {
        if (r.type === "derives_from") {
          const existing = derivesFrom.get(r.sourceUnitId) ?? [];
          existing.push(targetId);
          derivesFrom.set(r.sourceUnitId, existing);
        }
      }
    }

    const hasParent = new Set<string>();
    for (const [, rels] of relationsMap) {
      for (const r of rels) {
        if (r.type === "derives_from") hasParent.add(r.targetUnitId);
      }
    }

    const roots = units.filter((u) => !hasParent.has(u.id));
    const ordered: typeof units = [];
    const visited = new Set<string>();

    function visit(unitId: string) {
      if (visited.has(unitId)) return;
      visited.add(unitId);
      const unit = units.find((u) => u.id === unitId);
      if (unit) ordered.push(unit);
      for (const childId of derivesFrom.get(unitId) ?? []) visit(childId);
    }

    for (const root of roots) visit(root.id);
    for (const unit of units) if (!visited.has(unit.id)) ordered.push(unit);

    return ordered;
  }, [sortOrder, units, relationsMap]);

  const sortedUnits = React.useMemo(() => {
    if (sortOrder === "derivation" && derivationOrder) return derivationOrder;
    return [...units].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [units, sortOrder, derivationOrder]);

  const filteredUnits = React.useMemo(() => {
    let result = sortedUnits;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => u.content.toLowerCase().includes(q));
    }
    if (filterType) {
      result = result.filter((u) => u.unitType === filterType);
    }
    return result;
  }, [sortedUnits, searchQuery, filterType]);

  const availableTypes = React.useMemo(() => {
    const types = new Set(units.map((u) => u.unitType));
    return Array.from(types).sort();
  }, [units]);

  // Map to ThreadUnit format
  const threadUnits: ThreadUnit[] = React.useMemo(
    () =>
      filteredUnits.map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        createdAt: u.createdAt,
        originType: u.originType,
        relationCount:
          (relationsMap.get(u.id)?.length ?? 0) + (forkCounts.get(u.id) ?? 0),
      })),
    [filteredUnits, relationsMap, forkCounts],
  );

  // Scroll to selected unit
  React.useEffect(() => {
    if (selectedUnitId && scrollRef.current) {
      scrollRef.current
        .querySelector(`[data-unit-id="${selectedUnitId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedUnitId]);

  // Focus search on open
  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (!threadUnits.length) return;

      const currentIndex = selectedUnitId
        ? threadUnits.findIndex((u) => u.id === selectedUnitId)
        : -1;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, threadUnits.length - 1);
        if (threadUnits[next]) openPanel(threadUnits[next].id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        if (threadUnits[prev]) openPanel(threadUnits[prev].id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [threadUnits, selectedUnitId, openPanel]);

  const handleExpandBranches = React.useCallback(
    (unitId: string) => openPanel(unitId),
    [openPanel],
  );

  return (
    <div
      className={cn("relative flex h-full flex-col bg-bg-primary", className)}
      role="region"
      aria-label="Thread view - linear reading mode"
    >
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
                "transition-all duration-fast",
                filterType === type
                  ? "bg-accent-primary text-white shadow-sm"
                  : "bg-bg-secondary text-text-tertiary hover:bg-bg-hover hover:text-text-secondary",
              )}
            >
              {type}
            </button>
          ))}
          <span className="text-[11px] tabular-nums text-text-tertiary ml-1">
            {threadUnits.length}
            {searchQuery || filterType ? ` / ${units.length}` : ""} units
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-text-tertiary transition-colors duration-fast",
              searchOpen
                ? "bg-accent-primary/10 text-accent-primary"
                : "hover:bg-bg-hover hover:text-text-secondary",
            )}
            aria-label="Toggle search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Sort toggle */}
          <div className="flex items-center rounded-lg bg-bg-secondary p-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSortOrder("chronological")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-fast",
                      sortOrder === "chronological"
                        ? "bg-bg-primary text-text-primary shadow-sm"
                        : "text-text-tertiary hover:text-text-secondary",
                    )}
                    aria-label="Chronological order"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Chronological</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSortOrder("derivation")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-fast",
                      sortOrder === "derivation"
                        ? "bg-bg-primary text-text-primary shadow-sm"
                        : "text-text-tertiary hover:text-text-secondary",
                    )}
                    aria-label="Derivation order"
                  >
                    <ArrowDownNarrowWide className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Derivation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Graph switch */}
          {onSwitchToGraph && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToGraph}
              className="h-8 gap-1.5 px-2 text-text-tertiary hover:text-text-secondary"
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Graph</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Collapsible Search ─────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-5 py-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search units..."
                  className={cn(
                    "w-full rounded-lg border border-border bg-bg-surface",
                    "py-2 pl-9 pr-8 text-sm text-text-primary",
                    "placeholder:text-text-tertiary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:border-transparent",
                    "transition-all duration-fast",
                  )}
                  aria-label="Search units in thread"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only">
        Use arrow keys or J/K to navigate between units. Press Enter to view details.
      </span>

      {/* ── Thread content ───────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="mx-auto max-w-3xl px-6 py-6">
          {isLoading ? (
            <ThreadSkeleton />
          ) : threadUnits.length === 0 ? (
            <ThreadEmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              {threadUnits.map((unit, index) => (
                <div key={unit.id} data-unit-id={unit.id}>
                  <ThreadItem
                    unit={unit}
                    relations={relationsMap.get(unit.id) ?? []}
                    forkCount={forkCounts.get(unit.id) ?? 0}
                    isFirst={index === 0}
                    index={index}
                    onExpandBranches={handleExpandBranches}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* ── Relation legend ──────────────────────────────────────── */}
      <div className="border-t border-border px-5 py-2">
        <div className="flex flex-wrap items-center gap-3 text-[10px] tracking-wide uppercase text-text-tertiary">
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <span key={category} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {category.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
