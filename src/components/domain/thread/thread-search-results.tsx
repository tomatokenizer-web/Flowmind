"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Clock,
  Layers,
  BarChart3,
  Tag,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import { Skeleton } from "~/components/shared/skeleton";
import { EmptySearch } from "~/components/shared/empty-state";
import { ThreadRelationSidebar } from "./thread-relation-sidebar";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

export interface SearchResultItem {
  unit: UnitCardUnit;
  /** 0-1 relevance score */
  relevance: number;
  /** Matched snippet with <mark> tags for highlighting */
  snippet?: string;
  /** Context name this unit belongs to */
  contextName?: string;
}

export type SearchGrouping = "by_relevance" | "by_context" | "by_type" | "by_time";

interface ThreadSearchResultsProps {
  results: SearchResultItem[];
  query: string;
  grouping: SearchGrouping;
  onGroupingChange: (grouping: SearchGrouping) => void;
  /** Active filter chips */
  activeFilters: { label: string; value: string; onRemove: () => void }[];
  /** Set of unit IDs in the current thread context */
  threadUnitIds: Set<string>;
  /** Cross-thread relation counts */
  crossRelationCounts: Map<string, number>;
  /** Total result count (for pagination) */
  totalCount: number;
  /** Load more results */
  onLoadMore?: () => void;
  /** Whether more results are being loaded */
  isLoadingMore?: boolean;
  isLoading?: boolean;
  onClick?: (id: string) => void;
  onCmdClick?: (id: string) => void;
  onNavigateToUnit?: (unitId: string) => void;
  onOpenInGraph?: (unitId: string) => void;
  className?: string;
}

/* ─── Grouping icon map ─── */

const GROUPING_OPTIONS: { value: SearchGrouping; label: string; icon: React.ElementType }[] = [
  { value: "by_relevance", label: "Relevance", icon: BarChart3 },
  { value: "by_context", label: "Context", icon: Layers },
  { value: "by_type", label: "Type", icon: Tag },
  { value: "by_time", label: "Time", icon: Clock },
];

/* ─── Helpers ─── */

function groupResults(
  results: SearchResultItem[],
  grouping: SearchGrouping,
): Map<string, SearchResultItem[]> {
  const map = new Map<string, SearchResultItem[]>();

  if (grouping === "by_relevance") {
    map.set("Results", results);
    return map;
  }

  for (const item of results) {
    let key: string;
    switch (grouping) {
      case "by_context":
        key = item.contextName ?? "No context";
        break;
      case "by_type":
        key = item.unit.primaryType.charAt(0).toUpperCase() + item.unit.primaryType.slice(1);
        break;
      case "by_time": {
        const d = new Date(item.unit.createdAt);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 0) key = "Today";
        else if (diffDays === 1) key = "Yesterday";
        else if (diffDays < 7) key = "This week";
        else if (diffDays < 30) key = "This month";
        else key = "Older";
        break;
      }
      default:
        key = "Results";
    }

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return map;
}

/* ─── Highlighted snippet renderer ─── */

function HighlightedSnippet({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-accent-warning/20 text-text-primary rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

/* ─── Relevance bar ─── */

function RelevanceBar({ score }: { score: number }) {
  return (
    <div
      className="h-1 w-12 rounded-full bg-bg-secondary overflow-hidden"
      role="meter"
      aria-valuenow={Math.round(score * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Relevance: ${Math.round(score * 100)}%`}
    >
      <div
        className="h-full rounded-full bg-accent-primary transition-all duration-fast"
        style={{ width: `${score * 100}%` }}
      />
    </div>
  );
}

/* ─── Search Result Row ─── */

function SearchResultRow({
  item,
  query,
  threadUnitIds,
  crossRelationCount,
  onClick,
  onCmdClick,
  onNavigateToUnit,
  onOpenInGraph,
}: {
  item: SearchResultItem;
  query: string;
  threadUnitIds: Set<string>;
  crossRelationCount: number;
  onClick?: (id: string) => void;
  onCmdClick?: (id: string) => void;
  onNavigateToUnit?: (unitId: string) => void;
  onOpenInGraph?: (unitId: string) => void;
}) {
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        onCmdClick?.(item.unit.id);
      } else {
        onClick?.(item.unit.id);
      }
    },
    [onClick, onCmdClick, item.unit.id],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onClick?.(item.unit.id);
      }
    },
    [onClick, item.unit.id],
  );

  const displayText = item.snippet ?? item.unit.content.slice(0, 120);

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/result flex gap-3 rounded-card border border-border p-3",
        "bg-bg-primary cursor-pointer select-none",
        "transition-all duration-fast ease-default",
        "hover:shadow-hover hover:border-border-focus/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
      )}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top row: type + context + relevance */}
        <div className="flex items-center gap-2 mb-1">
          <UnitTypeBadge type={item.unit.primaryType} size="sm" />
          {item.contextName && (
            <span className="inline-block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-bg-hover text-text-tertiary max-w-[120px]">
              {item.contextName}
            </span>
          )}
          <div className="ml-auto shrink-0">
            <RelevanceBar score={item.relevance} />
          </div>
        </div>

        {/* Snippet with highlighting */}
        <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
          <HighlightedSnippet text={displayText} query={query} />
        </p>
      </div>

      {/* Right: cross-thread relation badge */}
      <div className="flex flex-col items-end justify-start shrink-0">
        <ThreadRelationSidebar
          unitId={item.unit.id}
          threadUnitIds={threadUnitIds}
          crossRelationCount={crossRelationCount}
          onNavigateToUnit={onNavigateToUnit}
          onOpenInGraph={onOpenInGraph}
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function ThreadSearchResults({
  results,
  query,
  grouping,
  onGroupingChange,
  activeFilters,
  threadUnitIds,
  crossRelationCounts,
  totalCount,
  onLoadMore,
  isLoadingMore = false,
  isLoading = false,
  onClick,
  onCmdClick,
  onNavigateToUnit,
  onOpenInGraph,
  className,
}: ThreadSearchResultsProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const grouped = React.useMemo(
    () => groupResults(results, grouping),
    [results, grouping],
  );

  // Flatten for virtualization: interleave group headers + items
  const flatItems = React.useMemo(() => {
    const flat: ({ type: "header"; label: string; count: number } | { type: "item"; item: SearchResultItem })[] = [];
    for (const [label, items] of grouped) {
      if (grouping !== "by_relevance") {
        flat.push({ type: "header", label, count: items.length });
      }
      for (const item of items) {
        flat.push({ type: "item", item });
      }
    }
    return flat;
  }, [grouped, grouping]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const entry = flatItems[index];
      return entry?.type === "header" ? 36 : 88;
    },
    overscan: 5,
  });

  // Infinite scroll: load more when near bottom
  const virtualItems = virtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  React.useEffect(() => {
    if (
      lastItem &&
      lastItem.index >= flatItems.length - 3 &&
      results.length < totalCount &&
      onLoadMore &&
      !isLoadingMore
    ) {
      onLoadMore();
    }
  }, [lastItem, flatItems.length, results.length, totalCount, onLoadMore, isLoadingMore]);

  /* ─── Loading state ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        <Skeleton height="32px" width="200px" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height="80px" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar: filter chips + grouping */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 flex-wrap">
        {/* Active filters */}
        {activeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={filter.onRemove}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
              "text-xs font-medium",
              "bg-accent-primary/10 text-accent-primary",
              "hover:bg-accent-primary/20 transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
            aria-label={`Remove filter: ${filter.label}`}
          >
            {filter.label}
            <span aria-hidden="true" className="ml-0.5">x</span>
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span className="text-xs text-text-tertiary tabular-nums shrink-0">
          {totalCount} result{totalCount !== 1 ? "s" : ""}
        </span>

        {/* Grouping buttons */}
        <div className="flex items-center gap-0.5 border-l border-border pl-2 ml-1">
          {GROUPING_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = grouping === opt.value;
            return (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0",
                  isActive && "bg-bg-hover text-accent-primary",
                )}
                onClick={() => onGroupingChange(opt.value)}
                aria-label={`Group by ${opt.label}`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <EmptySearch className="flex-1" />
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
                  {entry.type === "header" ? (
                    <div className="flex items-center gap-2 h-full">
                      <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        {entry.label}
                      </h3>
                      <span className="text-[10px] text-text-tertiary tabular-nums">
                        ({entry.count})
                      </span>
                    </div>
                  ) : (
                    <div className="py-1">
                      <SearchResultRow
                        item={entry.item}
                        query={query}
                        threadUnitIds={threadUnitIds}
                        crossRelationCount={
                          crossRelationCounts.get(entry.item.unit.id) ?? 0
                        }
                        onClick={onClick}
                        onCmdClick={onCmdClick}
                        onNavigateToUnit={onNavigateToUnit}
                        onOpenInGraph={onOpenInGraph}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Skeleton height="20px" width="120px" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ThreadSearchResults.displayName = "ThreadSearchResults";
