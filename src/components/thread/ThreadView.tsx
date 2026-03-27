"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  GitFork,
  ArrowDownNarrowWide,
  Network,
  List,
  Search,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { usePanelStore } from "~/stores/panel-store";
import { UnitCard, type UnitCardUnit } from "~/components/unit/unit-card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Toggle } from "~/components/ui/toggle";
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
  /** Callback to switch to Graph View */
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

interface BranchPointIndicatorProps {
  forkCount: number;
  unitId: string;
  onExpandBranches?: (unitId: string) => void;
}

function BranchPointIndicator({
  forkCount,
  unitId,
  onExpandBranches,
}: BranchPointIndicatorProps) {
  if (forkCount <= 1) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onExpandBranches?.(unitId)}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2",
              "flex items-center justify-center",
              "h-6 w-6 rounded-full",
              "bg-accent-secondary text-text-primary",
              "border border-border",
              "text-xs font-medium",
              "transition-all duration-fast",
              "hover:bg-accent-primary hover:text-white hover:scale-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
            aria-label={`${forkCount} branches from this unit`}
          >
            <GitFork className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{forkCount} branches</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Relation Connector ───────────────────────────────────────────────

interface RelationConnectorProps {
  relation: RelationData;
  isLastInGroup?: boolean;
}

function RelationConnector({ relation, isLastInGroup }: RelationConnectorProps) {
  const category = getRelationCategory(relation.type);
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.structure_containment;

  return (
    <div
      className="relative flex items-center justify-center py-1"
      role="img"
      aria-label={`${relation.type} relation`}
    >
      {/* Vertical line */}
      <svg
        className="absolute left-1/2 -translate-x-1/2"
        width="2"
        height="24"
        viewBox="0 0 2 24"
        aria-hidden="true"
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="24"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
      </svg>

      {/* Center dot */}
      <div
        className="relative z-10 h-2.5 w-2.5 rounded-full border-2 border-bg-primary"
        style={{ backgroundColor: color }}
        title={relation.type.replace(/_/g, " ")}
      />

      {/* Relation type label on hover */}
      <span
        className={cn(
          "absolute left-1/2 ml-4 whitespace-nowrap",
          "text-xs text-text-tertiary",
          "opacity-0 transition-opacity duration-fast",
          "group-hover:opacity-100",
        )}
      >
        {relation.type.replace(/_/g, " ")}
      </span>
    </div>
  );
}

// ─── Thread Item Wrapper ──────────────────────────────────────────────

interface ThreadItemProps {
  unit: UnitCardUnit;
  relations: RelationData[];
  forkCount: number;
  isFirst: boolean;
  isLast: boolean;
  onExpandBranches?: (unitId: string) => void;
  onLifecycleAction?: (unitId: string, action: "approve" | "reject" | "reset") => void;
}

function ThreadItem({
  unit,
  relations,
  forkCount,
  isFirst,
  isLast,
  onExpandBranches,
  onLifecycleAction,
}: ThreadItemProps) {
  // Get the primary relation (first one) for the connector
  const primaryRelation = relations[0];

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
    >
      {/* Connector from previous card */}
      {!isFirst && primaryRelation && (
        <RelationConnector relation={primaryRelation} />
      )}

      {/* Card with branch indicator */}
      <div className="relative">
        <UnitCard
          unit={unit}
          variant="standard"
          onLifecycleAction={onLifecycleAction}
          onClick={(u) => {
            usePanelStore.getState().openPanel(u.id);
          }}
        />
        <BranchPointIndicator
          forkCount={forkCount}
          unitId={unit.id}
          onExpandBranches={onExpandBranches}
        />
      </div>
    </motion.div>
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
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch units for the current context/project
  const { data: unitsData, isLoading } = api.unit.list.useQuery(
    {
      projectId: projectId,
      contextId: activeContextId ?? undefined,
      limit: 100,
    },
    { enabled: !!projectId },
  );

  const units = unitsData?.items ?? [];

  // Fetch relations for all visible units in a single batch query
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

      // Map relations to their target unit
      const existing = map.get(r.targetUnitId) ?? [];
      existing.push(r);
      map.set(r.targetUnitId, existing);

      // Count forks from source
      forks.set(r.sourceUnitId, (forks.get(r.sourceUnitId) ?? 0) + 1);
    }

    return { relationsMap: map, forkCounts: forks };
  }, [relationsData]);

  // Build derivation order by following derives_from relations
  const derivationOrder = React.useMemo(() => {
    if (sortOrder !== "derivation") return null;

    // Build adjacency list (target -> sources that derive from it)
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

    // Find roots (units with no derives_from relations)
    const hasParent = new Set<string>();
    for (const [, rels] of relationsMap) {
      for (const r of rels) {
        if (r.type === "derives_from") {
          hasParent.add(r.targetUnitId);
        }
      }
    }

    const roots = units.filter((u) => !hasParent.has(u.id));
    const ordered: typeof units = [];
    const visited = new Set<string>();

    // DFS to build order
    function visit(unitId: string) {
      if (visited.has(unitId)) return;
      visited.add(unitId);

      const unit = units.find((u) => u.id === unitId);
      if (unit) ordered.push(unit);

      const children = derivesFrom.get(unitId) ?? [];
      for (const childId of children) {
        visit(childId);
      }
    }

    for (const root of roots) {
      visit(root.id);
    }

    // Add any remaining units not in the derivation tree
    for (const unit of units) {
      if (!visited.has(unit.id)) {
        ordered.push(unit);
      }
    }

    return ordered;
  }, [sortOrder, units, relationsMap]);

  // Sort units based on order
  const sortedUnits = React.useMemo(() => {
    if (sortOrder === "derivation" && derivationOrder) {
      return derivationOrder;
    }
    // Chronological: sort by createdAt ascending
    return [...units].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [units, sortOrder, derivationOrder]);

  // Filter units by search query and type
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

  // Get available unit types for filter dropdown
  const availableTypes = React.useMemo(() => {
    const types = new Set(units.map((u) => u.unitType));
    return Array.from(types).sort();
  }, [units]);

  // Map units to UnitCardUnit format
  const cardUnits: UnitCardUnit[] = React.useMemo(
    () =>
      filteredUnits.map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        createdAt: new Date(u.createdAt),
        lifecycle: (["draft", "pending", "confirmed", "deferred", "complete"].includes(
          u.lifecycle
        )
          ? u.lifecycle
          : "draft") as "draft" | "pending" | "confirmed" | "deferred" | "complete",
        branchPotential: u.branchPotential ?? undefined,
        relationCount: (relationsMap.get(u.id)?.length ?? 0) + (forkCounts.get(u.id) ?? 0),
        originType: u.originType ?? undefined,
        sourceSpan: typeof u.sourceSpan === "string" ? u.sourceSpan : null,
      })),
    [filteredUnits, relationsMap, forkCounts]
  );

  // Scroll to selected unit
  React.useEffect(() => {
    if (selectedUnitId && scrollRef.current) {
      const element = scrollRef.current.querySelector(
        `[data-unit-id="${selectedUnitId}"]`
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedUnitId]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!cardUnits.length) return;

      const currentIndex = selectedUnitId
        ? cardUnits.findIndex((u) => u.id === selectedUnitId)
        : -1;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, cardUnits.length - 1);
        if (cardUnits[nextIndex]) {
          usePanelStore.getState().openPanel(cardUnits[nextIndex].id);
        }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (cardUnits[prevIndex]) {
          usePanelStore.getState().openPanel(cardUnits[prevIndex].id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cardUnits, selectedUnitId]);

  // Handle branch expansion — selects the unit and opens detail panel
  const handleExpandBranches = React.useCallback((unitId: string) => {
    usePanelStore.getState().openPanel(unitId);
  }, []);

  return (
    <div
      className={cn("relative flex h-full flex-col bg-bg-primary", className)}
      role="region"
      aria-label="Thread view - linear reading mode"
    >
      {/* Search & Filter Bar */}
      <div className="border-b border-border px-4 py-2 space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search units..."
            className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-8 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            aria-label="Search units in thread"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Controls row: type filter, sort, count, graph switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Type filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs transition-colors",
                    filterType === type
                      ? "bg-accent-primary text-white"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <span className="text-xs text-text-tertiary">
              {cardUnits.length}{searchQuery || filterType ? ` / ${units.length}` : ""} units
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort order toggle */}
            <TooltipProvider>
              <div
                role="radiogroup"
                aria-label="Sort order"
                className="flex items-center gap-1 rounded-lg bg-bg-secondary p-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={sortOrder === "chronological"}
                      onPressedChange={() => setSortOrder("chronological")}
                      aria-label="Chronological order"
                    >
                      <Clock className="h-4 w-4" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chronological order</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={sortOrder === "derivation"}
                      onPressedChange={() => setSortOrder("derivation")}
                      aria-label="Derivation order"
                    >
                      <ArrowDownNarrowWide className="h-4 w-4" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Derivation order</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Switch to Graph View */}
            {onSwitchToGraph && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSwitchToGraph}
                      className="gap-1.5"
                    >
                      <Network className="h-4 w-4" />
                      <span className="hidden sm:inline">Graph</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Switch to Graph View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Screen reader instructions */}
      <span className="sr-only">
        Use arrow keys or J/K to navigate between units. Press Enter to view
        details.
      </span>

      {/* Thread content */}
      <ScrollArea className="flex-1">
        <div
          ref={scrollRef}
          className="mx-auto max-w-2xl space-y-0 px-4 py-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            </div>
          ) : cardUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <List className="mb-3 h-12 w-12 text-text-tertiary" />
              <p className="text-sm text-text-secondary">No units yet</p>
              <p className="text-xs text-text-tertiary">
                Capture a thought to get started
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cardUnits.map((unit, index) => (
                <div key={unit.id} data-unit-id={unit.id}>
                  <ThreadItem
                    unit={unit}
                    relations={relationsMap.get(unit.id) ?? []}
                    forkCount={forkCounts.get(unit.id) ?? 0}
                    isFirst={index === 0}
                    isLast={index === cardUnits.length - 1}
                    onExpandBranches={handleExpandBranches}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Relation legend */}
      <div className="border-t border-border px-4 py-2">
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
          <span className="font-medium">Relations:</span>
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <span key={category} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
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
