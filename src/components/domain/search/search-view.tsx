"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  List,
  Share2,
  Bookmark,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";
import { EmptySearch } from "~/components/shared/empty-state";
import { useSearch } from "~/hooks/use-search";
import type { SearchViewMode } from "~/hooks/use-search";
import { SearchFilters } from "./search-filters";
import { SearchInterpretation } from "./search-interpretation";
import { SearchResultCard } from "./search-result-card";
import { SearchHistory } from "./search-history";
import { SearchGraphView } from "./search-graph-view";

/* ─── Types ─── */

interface SearchViewProps {
  /** When provided, opens with this initial query */
  initialQuery?: string;
  /** Called when a unit is selected */
  onUnitClick?: (id: string) => void;
  /** Called on Cmd+click (split view) */
  onUnitCmdClick?: (id: string) => void;
  /** Called to open unit in graph */
  onOpenInGraph?: (id: string) => void;
  className?: string;
}

/* ─── View mode button ─── */

function ViewToggle({
  mode,
  onChange,
}: {
  mode: SearchViewMode;
  onChange: (mode: SearchViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      <button
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
          "transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          mode === "list"
            ? "bg-bg-hover text-text-primary"
            : "text-text-tertiary hover:text-text-secondary",
        )}
        aria-pressed={mode === "list"}
        aria-label="List view"
      >
        <List className="h-3.5 w-3.5" aria-hidden="true" />
        List
      </button>
      <button
        onClick={() => onChange("graph")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
          "transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          mode === "graph"
            ? "bg-bg-hover text-text-primary"
            : "text-text-tertiary hover:text-text-secondary",
        )}
        aria-pressed={mode === "graph"}
        aria-label="Graph view"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        Graph
      </button>
    </div>
  );
}

/* ─── Component ─── */

export function SearchView({
  initialQuery,
  onUnitClick,
  onUnitCmdClick,
  onOpenInGraph,
  className,
}: SearchViewProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    filters,
    addFilter,
    removeFilter,
    results,
    isLoading,
    isFetching,
    interpretation,
    viewMode,
    setViewMode,
    history,
    removeFromHistory,
    clearHistory,
    savedSearches,
    saveSearch,
    removeSavedSearch,
    executeSearch,
  } = useSearch();

  /* ─── Initialize with provided query ─── */
  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery, setQuery]);

  /* ─── Auto-focus search input ─── */
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ─── Keyboard shortcut: Cmd+K to focus ─── */
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasQuery = query.trim().length > 0;
  const hasResults = results && Array.isArray(results.units) && results.units.length > 0;
  const showHistory = !hasQuery;
  const showResults = hasQuery && !isLoading;
  const showEmpty = showResults && !hasResults;

  /* ─── Extract result items ─── */
  const resultItems = React.useMemo(() => {
    if (!results?.units) return [];
    return results.units;
  }, [results]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* ─── Search Bar ─── */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                executeSearch(query, filters);
              } else if (e.key === "Escape") {
                setQuery("");
                inputRef.current?.blur();
              }
            }}
            placeholder='Search your thinking... (Ctrl+K)'
            className={cn(
              "w-full h-11 rounded-xl border border-border bg-bg-surface",
              "pl-10 pr-10 text-base text-text-primary",
              "placeholder:text-text-tertiary",
              "transition-all duration-fast",
              "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent",
            )}
            aria-label="Search"
            role="searchbox"
          />

          {/* Right side: loading indicator or clear button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isFetching && (
              <Loader2
                className="h-4 w-4 text-text-tertiary animate-spin"
                aria-label="Searching"
              />
            )}
            {hasQuery && !isFetching && (
              <button
                onClick={() => setQuery("")}
                className={cn(
                  "p-0.5 rounded text-text-tertiary hover:text-text-secondary",
                  "transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Filter chips ─── */}
        <SearchFilters
          filters={filters}
          onRemoveFilter={removeFilter}
          onAddFilter={addFilter}
          className="mt-2"
        />

        {/* ─── Interpretation feedback ─── */}
        {hasQuery && (
          <SearchInterpretation
            interpretation={interpretation}
            className="mt-2"
          />
        )}

        {/* ─── Results toolbar ─── */}
        {showResults && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary tabular-nums">
                {resultItems.length} result{resultItems.length !== 1 ? "s" : ""}
              </span>
              {hasQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveSearch(query, filters)}
                  className="h-6 px-2 text-[10px]"
                >
                  <Bookmark className="h-3 w-3 mr-1" aria-hidden="true" />
                  Save
                </Button>
              )}
            </div>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-hidden">
        {/* Loading skeleton */}
        {isLoading && hasQuery && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height="80px" />
            ))}
          </div>
        )}

        {/* History (when no query) */}
        {showHistory && (
          <ScrollArea className="h-full">
            <SearchHistory
              history={history}
              savedSearches={savedSearches}
              onExecuteSearch={executeSearch}
              onRemoveFromHistory={removeFromHistory}
              onClearHistory={clearHistory}
              onSaveSearch={saveSearch}
              onRemoveSavedSearch={removeSavedSearch}
              className="p-4"
            />
          </ScrollArea>
        )}

        {/* Empty results */}
        {showEmpty && <EmptySearch className="flex-1" />}

        {/* Results — List view */}
        {showResults && hasResults && viewMode === "list" && (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-4">
              <AnimatePresence mode="popLayout">
                {resultItems.map((item: Record<string, unknown>, index: number) => {
                  const unit = (item.unit ?? item) as Record<string, unknown>;
                  return (
                    <motion.div
                      key={(unit.id as string) ?? index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                    >
                      <SearchResultCard
                        unit={unit as never}
                        relevance={(item.relevance as number) ?? 0.5}
                        snippet={(item.snippet as string) ?? undefined}
                        matchTerms={query.split(/\s+/).filter(Boolean)}
                        contextName={(item.contextName as string) ?? undefined}
                        relationCount={(unit._count as Record<string, number>)?.relations}
                        onClick={onUnitClick}
                        onCmdClick={onUnitCmdClick}
                        onOpenInGraph={onOpenInGraph}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}

        {/* Results — Graph view */}
        {showResults && hasResults && viewMode === "graph" && (
          <SearchGraphView
            matchedUnits={resultItems.map((item: Record<string, unknown>) =>
              ((item.unit ?? item) as never),
            )}
            onNodeClick={onUnitClick}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

SearchView.displayName = "SearchView";
