"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CalendarClock,
  GitBranch,
  Filter,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/shared/skeleton";
import { EmptyUnits } from "~/components/shared/empty-state";
import { useThread, type ThreadSortOrder } from "~/hooks/use-thread";
import { ThreadItem } from "./thread-item";
import { ThreadForkIndicator } from "./thread-fork-indicator";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

interface FilterChip {
  category: "type" | "lifecycle" | "context";
  label: string;
  value: string;
}

interface ThreadViewProps {
  /** Override context ID (otherwise reads from workspace store) */
  contextId?: string;
  /** Navigate to a related unit */
  onNavigateToUnit?: (unitId: string) => void;
  /** Open a unit in graph view */
  onOpenInGraph?: (unitId: string) => void;
  /** Open a unit in the editor */
  onOpenEditor?: (unitId: string) => void;
  className?: string;
}

/* ─── Sort config ─── */

const SORT_OPTIONS: { value: ThreadSortOrder; label: string; icon: React.ElementType }[] = [
  { value: "chronological", label: "Chronological", icon: CalendarClock },
  { value: "derivation", label: "Derivation order", icon: GitBranch },
  { value: "modified", label: "Recently modified", icon: ArrowDownAZ },
];

/* ─── Filter chip presets ─── */

const TYPE_FILTERS: FilterChip[] = [
  { category: "type", label: "Claims", value: "claim" },
  { category: "type", label: "Questions", value: "question" },
  { category: "type", label: "Evidence", value: "evidence" },
  { category: "type", label: "Ideas", value: "idea" },
  { category: "type", label: "Actions", value: "action" },
  { category: "type", label: "Decisions", value: "decision" },
];

const LIFECYCLE_FILTERS: FilterChip[] = [
  { category: "lifecycle", label: "Draft", value: "draft" },
  { category: "lifecycle", label: "Pending", value: "pending" },
  { category: "lifecycle", label: "Confirmed", value: "confirmed" },
  { category: "lifecycle", label: "Complete", value: "complete" },
];

/* ─── Component ─── */

export function ThreadView({
  contextId,
  onNavigateToUnit,
  onOpenInGraph,
  onOpenEditor,
  className,
}: ThreadViewProps) {
  const activeUnitId = useWorkspaceStore((s) => s.activeUnitId);
  const setActiveUnit = useWorkspaceStore((s) => s.setActiveUnit);

  const [activeFilters, setActiveFilters] = React.useState<FilterChip[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);

  const filterTypes = React.useMemo(
    () => activeFilters.filter((f) => f.category === "type").map((f) => f.value),
    [activeFilters],
  );
  const filterLifecycles = React.useMemo(
    () => activeFilters.filter((f) => f.category === "lifecycle").map((f) => f.value),
    [activeFilters],
  );

  const {
    items,
    forkPoints,
    currentBranch,
    sortOrder,
    setSortOrder,
    switchBranch,
    isLoading,
    crossRelationCounts,
  } = useThread({
    contextId,
    filterTypes: filterTypes.length > 0 ? filterTypes : undefined,
    filterLifecycles: filterLifecycles.length > 0 ? filterLifecycles : undefined,
  });

  // Build thread unit ID set
  const threadUnitIds = React.useMemo(
    () => new Set(items.map((u) => u.id)),
    [items],
  );

  // Build fork point lookup: unitId -> ForkPoint
  const forkPointMap = React.useMemo(() => {
    const map = new Map<string, (typeof forkPoints)[number]>();
    for (const fp of forkPoints) {
      map.set(fp.unitId, fp);
    }
    return map;
  }, [forkPoints]);

  // Build unit map for branch previews
  const unitMap = React.useMemo(() => {
    const map = new Map<string, UnitCardUnit>();
    for (const u of items) map.set(u.id, u);
    return map;
  }, [items]);

  // Flatten items + fork indicators for virtualization
  const flatItems = React.useMemo(() => {
    const flat: (
      | { type: "unit"; unit: UnitCardUnit }
      | { type: "fork"; forkUnitId: string; branches: string[] }
    )[] = [];

    for (const unit of items) {
      flat.push({ type: "unit", unit });

      const fork = forkPointMap.get(unit.id);
      if (fork) {
        flat.push({
          type: "fork",
          forkUnitId: fork.unitId,
          branches: fork.branches,
        });
      }
    }

    return flat;
  }, [items, forkPointMap]);

  // Virtualizer
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const entry = flatItems[index];
      return entry?.type === "fork" ? 48 : 96;
    },
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Toggle filter chip
  function toggleFilter(chip: FilterChip) {
    setActiveFilters((prev) => {
      const exists = prev.some(
        (f) => f.category === chip.category && f.value === chip.value,
      );
      if (exists) {
        return prev.filter(
          (f) => !(f.category === chip.category && f.value === chip.value),
        );
      }
      return [...prev, chip];
    });
  }

  function removeFilter(chip: FilterChip) {
    setActiveFilters((prev) =>
      prev.filter(
        (f) => !(f.category === chip.category && f.value === chip.value),
      ),
    );
  }

  function isFilterActive(chip: FilterChip) {
    return activeFilters.some(
      (f) => f.category === chip.category && f.value === chip.value,
    );
  }

  /* ─── Loading state ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        <Skeleton height="36px" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="88px" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        {/* Sort toggle */}
        <div className="flex items-center gap-0.5">
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = sortOrder === opt.value;
            return (
              <SimpleTooltip key={opt.value} content={opt.label} side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0",
                    isActive && "bg-bg-hover text-accent-primary",
                  )}
                  onClick={() => setSortOrder(opt.value)}
                  aria-label={`Sort by ${opt.label}`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              </SimpleTooltip>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border" aria-hidden="true" />

        {/* Filter toggle */}
        <SimpleTooltip content="Toggle filters" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2",
              showFilters && "bg-bg-hover text-accent-primary",
            )}
            onClick={() => setShowFilters((s) => !s)}
            aria-pressed={showFilters}
            aria-label="Toggle filter bar"
          >
            <Filter className="h-3.5 w-3.5" />
            {activeFilters.length > 0 && (
              <span className="text-[10px] tabular-nums">
                {activeFilters.length}
              </span>
            )}
          </Button>
        </SimpleTooltip>

        {/* Active filter chips (inline summary) */}
        {activeFilters.length > 0 && !showFilters && (
          <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
            {activeFilters.slice(0, 3).map((chip) => (
              <button
                key={`${chip.category}-${chip.value}`}
                onClick={() => removeFilter(chip)}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5",
                  "text-[10px] font-medium",
                  "bg-accent-primary/10 text-accent-primary",
                  "hover:bg-accent-primary/20 transition-colors duration-fast",
                )}
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label}
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            ))}
            {activeFilters.length > 3 && (
              <span className="text-[10px] text-text-tertiary">
                +{activeFilters.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Item count */}
        <span className="text-xs text-text-tertiary tabular-nums shrink-0">
          {items.length} unit{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Expanded filter bar */}
      {showFilters && (
        <div className="px-4 py-2 border-b border-border shrink-0 space-y-2">
          {/* Type filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide w-14 shrink-0">
              Type
            </span>
            {TYPE_FILTERS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => toggleFilter(chip)}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1",
                  "text-xs font-medium transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  isFilterActive(chip)
                    ? "bg-accent-primary text-white"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
                )}
                aria-pressed={isFilterActive(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Lifecycle filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide w-14 shrink-0">
              Stage
            </span>
            {LIFECYCLE_FILTERS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => toggleFilter(chip)}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1",
                  "text-xs font-medium transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  isFilterActive(chip)
                    ? "bg-accent-primary text-white"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
                )}
                aria-pressed={isFilterActive(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Clear all */}
          {activeFilters.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-text-tertiary"
                onClick={() => setActiveFilters([])}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Thread list */}
      {items.length === 0 ? (
        <EmptyUnits className="flex-1" />
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
        >
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualItems.map((virtualRow) => {
              const entry = flatItems[virtualRow.index];
              if (!entry) return null;

              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 right-0 px-3"
                  style={{
                    top: `${virtualRow.start}px`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  {entry.type === "fork" ? (
                    <ThreadForkIndicator
                      branchCount={entry.branches.length}
                      branches={entry.branches.map((branchId) => {
                        const u = unitMap.get(branchId);
                        return {
                          id: branchId,
                          content: u?.content ?? "Unknown branch",
                          primaryType: u?.primaryType ?? "claim",
                        };
                      })}
                      selectedBranchId={
                        currentBranch.find((id) => entry.branches.includes(id))
                      }
                      onSelectBranch={(branchId) =>
                        switchBranch(entry.forkUnitId, branchId)
                      }
                    />
                  ) : (
                    <div className="py-1">
                      <ThreadItem
                        unit={entry.unit}
                        isActive={entry.unit.id === activeUnitId}
                        crossRelationCount={
                          crossRelationCounts.get(entry.unit.id) ?? 0
                        }
                        threadUnitIds={threadUnitIds}
                        onClick={setActiveUnit}
                        onDoubleClick={onOpenEditor}
                        onNavigateToUnit={onNavigateToUnit}
                        onOpenInGraph={onOpenInGraph}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

ThreadView.displayName = "ThreadView";
