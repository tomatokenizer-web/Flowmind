"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Calendar,
  Filter,
  Flame,
  Layers,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EmptyUnits } from "~/components/shared/empty-state";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";
import { UnitCard, type UnitCardUnit } from "./unit-card";
import { UNIT_TYPE_CONFIG, type UnitType } from "./unit-type-badge";

/* ─── Types ─── */

type SortField = "created" | "modified" | "salience" | "type";
type SortDirection = "asc" | "desc";

interface UnitListProps {
  units: UnitCardUnit[];
  /** Variant for all cards */
  variant?: "compact" | "default" | "expanded";
  /** Show context badge on cards */
  showContextBadge?: boolean;
  /** Callback when a unit is clicked */
  onUnitClick?: (id: string) => void;
  /** Callback to create a new unit (shown in empty state) */
  onCreateUnit?: () => void;
  /** Estimated card height for virtualization */
  estimatedCardHeight?: number;
  className?: string;
}

/* ─── Sort Helpers ─── */

const SORT_OPTIONS: { field: SortField; label: string; icon: React.ElementType }[] = [
  { field: "created", label: "Created", icon: Calendar },
  { field: "modified", label: "Modified", icon: Calendar },
  { field: "salience", label: "Salience", icon: Flame },
  { field: "type", label: "Type", icon: ArrowDownAZ },
];

function sortUnits(
  units: UnitCardUnit[],
  field: SortField,
  direction: SortDirection,
): UnitCardUnit[] {
  const sorted = [...units];
  const dir = direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (field) {
      case "created":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "modified":
        return dir * (new Date(a.modifiedAt ?? a.createdAt).getTime() - new Date(b.modifiedAt ?? b.createdAt).getTime());
      case "salience":
        return dir * ((a.salience ?? 0) - (b.salience ?? 0));
      case "type":
        return dir * a.primaryType.localeCompare(b.primaryType);
      default:
        return 0;
    }
  });

  return sorted;
}

/* ─── Filter Helpers ─── */

const LIFECYCLE_FILTERS = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "deferred", label: "Deferred" },
  { value: "complete", label: "Complete" },
] as const;

function filterUnits(
  units: UnitCardUnit[],
  typeFilters: Set<string>,
  lifecycleFilters: Set<string>,
  tagFilters: Set<string>,
): UnitCardUnit[] {
  return units.filter((unit) => {
    if (typeFilters.size > 0 && !typeFilters.has(unit.primaryType)) return false;
    if (lifecycleFilters.size > 0 && !lifecycleFilters.has(unit.lifecycle)) return false;
    if (tagFilters.size > 0) {
      const unitTagNames = new Set((unit.tags ?? []).map((t) => t.tag.name));
      let hasMatch = false;
      tagFilters.forEach((tf) => {
        if (unitTagNames.has(tf)) hasMatch = true;
      });
      if (!hasMatch) return false;
    }
    return true;
  });
}

/* ─── Active Filter Chips ─── */

function FilterChips({
  typeFilters,
  lifecycleFilters,
  onRemoveType,
  onRemoveLifecycle,
  onClearAll,
}: {
  typeFilters: Set<string>;
  lifecycleFilters: Set<string>;
  onRemoveType: (type: string) => void;
  onRemoveLifecycle: (lifecycle: string) => void;
  onClearAll: () => void;
}) {
  const totalActive = typeFilters.size + lifecycleFilters.size;
  if (totalActive === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from(typeFilters).map((type) => {
        const config = UNIT_TYPE_CONFIG[type as UnitType];
        return (
          <button
            key={`type-${type}`}
            type="button"
            onClick={() => onRemoveType(type)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
              "text-[10px] font-medium",
              config?.bgClass ?? "bg-bg-secondary",
              config?.accentClass ?? "text-text-secondary",
              "hover:opacity-70 transition-opacity duration-fast",
            )}
          >
            {config?.label ?? type}
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        );
      })}
      {Array.from(lifecycleFilters).map((lc) => (
        <button
          key={`lc-${lc}`}
          type="button"
          onClick={() => onRemoveLifecycle(lc)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
            "text-[10px] font-medium",
            "bg-bg-secondary text-text-tertiary",
            "hover:opacity-70 transition-opacity duration-fast",
          )}
        >
          {lc}
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[10px] text-text-tertiary hover:text-text-primary transition-colors duration-fast"
      >
        Clear all
      </button>
    </div>
  );
}

/* ─── UnitList Component ─── */

export function UnitList({
  units,
  variant = "default",
  showContextBadge = false,
  onUnitClick,
  onCreateUnit,
  estimatedCardHeight = 120,
  className,
}: UnitListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  /* Sort state */
  const [sortField, setSortField] = React.useState<SortField>("modified");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  /* Filter state */
  const [typeFilters, setTypeFilters] = React.useState<Set<string>>(new Set());
  const [lifecycleFilters, setLifecycleFilters] = React.useState<Set<string>>(new Set());
  const tagFilters = React.useMemo(() => new Set<string>(), []);

  /* Selection store */
  const { selectedUnitIds, toggle, selectRange, selectAll, clearSelection, isSelected } =
    useUnitSelectionStore();
  const hasSelection = selectedUnitIds.size > 0;

  /* Process units */
  const filteredUnits = React.useMemo(
    () => filterUnits(units, typeFilters, lifecycleFilters, tagFilters),
    [units, typeFilters, lifecycleFilters, tagFilters],
  );

  const sortedUnits = React.useMemo(
    () => sortUnits(filteredUnits, sortField, sortDirection),
    [filteredUnits, sortField, sortDirection],
  );

  /* Virtualizer */
  const virtualizer = useVirtualizer({
    count: sortedUnits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedCardHeight,
    overscan: 5,
    gap: 8,
  });

  /* Shift-click range selection */
  const lastClickedIndexRef = React.useRef<number | null>(null);

  const handleSelect = React.useCallback(
    (id: string, event?: React.MouseEvent) => {
      const currentIndex = sortedUnits.findIndex((u) => u.id === id);

      if (event?.shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, currentIndex);
        const end = Math.max(lastClickedIndexRef.current, currentIndex);
        const rangeIds = sortedUnits.slice(start, end + 1).map((u) => u.id);
        selectRange(rangeIds);
      } else {
        toggle(id);
      }

      lastClickedIndexRef.current = currentIndex;
    },
    [sortedUnits, toggle, selectRange],
  );

  /* Keyboard shortcuts */
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAll(sortedUnits.map((u) => u.id));
      } else if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sortedUnits, selectAll, clearSelection]);

  /* Filter toggle helpers */
  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleLifecycleFilter = (lc: string) => {
    setLifecycleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(lc)) next.delete(lc);
      else next.add(lc);
      return next;
    });
  };

  const clearAllFilters = () => {
    setTypeFilters(new Set());
    setLifecycleFilters(new Set());
  };

  const toggleSortDirection = () => {
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  };

  const totalFilters = typeFilters.size + lifecycleFilters.size;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar: sort + filter */}
      <div className="flex items-center justify-between gap-2 px-1 pb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {SORT_OPTIONS.find((o) => o.field === sortField)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.field}
                  onSelect={() => setSortField(option.field)}
                  className={cn(sortField === option.field && "bg-bg-hover")}
                >
                  <option.icon className="mr-2 h-4 w-4 text-text-tertiary" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direction toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={toggleSortDirection}
            aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
          >
            <ArrowUpDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-fast",
                sortDirection === "asc" && "rotate-180",
              )}
            />
          </Button>
        </div>

        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs relative">
              <Filter className="h-3.5 w-3.5" />
              Filter
              {totalFilters > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center",
                    "rounded-full bg-accent-primary text-[9px] font-bold text-white",
                  )}
                >
                  {totalFilters}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Type</DropdownMenuLabel>
            {Object.entries(UNIT_TYPE_CONFIG).map(([key, config]) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={typeFilters.has(key)}
                onCheckedChange={() => toggleTypeFilter(key)}
              >
                {config.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
            {LIFECYCLE_FILTERS.map((lc) => (
              <DropdownMenuCheckboxItem
                key={lc.value}
                checked={lifecycleFilters.has(lc.value)}
                onCheckedChange={() => toggleLifecycleFilter(lc.value)}
              >
                {lc.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active filter chips */}
      <FilterChips
        typeFilters={typeFilters}
        lifecycleFilters={lifecycleFilters}
        onRemoveType={toggleTypeFilter}
        onRemoveLifecycle={toggleLifecycleFilter}
        onClearAll={clearAllFilters}
      />

      {/* Count indicator */}
      <div className="flex items-center justify-between px-1 py-1 shrink-0">
        <span className="text-[10px] text-text-tertiary">
          {sortedUnits.length} unit{sortedUnits.length !== 1 ? "s" : ""}
          {totalFilters > 0 && ` (filtered from ${units.length})`}
        </span>
        {hasSelection && (
          <span className="text-[10px] text-accent-primary font-medium">
            {selectedUnitIds.size} selected
          </span>
        )}
      </div>

      {/* Virtualized list */}
      {sortedUnits.length === 0 ? (
        <EmptyUnits onAction={onCreateUnit} />
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
          role="list"
          aria-label="Thought units"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const unit = sortedUnits[virtualRow.index];
              if (!unit) return null;

              return (
                <div
                  key={unit.id}
                  role="listitem"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  <UnitCard
                    unit={unit}
                    variant={variant}
                    showContextBadge={showContextBadge}
                    isSelected={isSelected(unit.id)}
                    onSelect={(id) =>
                      handleSelect(id, undefined)
                    }
                    onClick={onUnitClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

UnitList.displayName = "UnitList";
