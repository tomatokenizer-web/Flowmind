"use client";

import * as React from "react";
import { Search, X, Layers, Clock, FileText } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSelectionStore } from "~/stores/selectionStore";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import type { UnitType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

type SearchLayer = "text" | "structural" | "temporal";

interface SearchViewProps {
  projectId: string;
  contextId?: string;
  onClose: () => void;
  className?: string;
}

// ─── Layer Toggle Button ─────────────────────────────────────────────

function LayerToggle({
  layer,
  icon: Icon,
  label,
  active,
  onToggle,
}: {
  layer: SearchLayer;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onToggle: (layer: SearchLayer) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(layer)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
        "transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        active
          ? "bg-accent-primary text-white"
          : "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
      )}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

// ─── Search Result Item ──────────────────────────────────────────────

function SearchResultItem({
  result,
  onClick,
}: {
  result: {
    unitId: string;
    content: string;
    unitType: UnitType;
    score: number;
    matchLayer: SearchLayer;
    highlights: string[];
  };
  onClick: (unitId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(result.unitId)}
      className={cn(
        "w-full text-left p-3 rounded-lg border border-border bg-bg-primary",
        "hover:bg-bg-hover transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <UnitTypeBadge unitType={result.unitType} />
        <div className="flex-1 min-w-0">
          {/* Highlighted content or snippet */}
          {result.highlights.length > 0 ? (
            <p className="text-sm text-text-primary line-clamp-2">
              {result.highlights[0]}
            </p>
          ) : (
            <p className="text-sm text-text-primary line-clamp-2">
              {result.content.slice(0, 150)}
              {result.content.length > 150 ? "..." : ""}
            </p>
          )}
          {/* Match layer indicator */}
          <span className="mt-1 inline-block text-xs text-text-tertiary capitalize">
            Matched in {result.matchLayer}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function SearchResultSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border bg-bg-primary animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-5 w-16 bg-bg-secondary rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-bg-secondary rounded w-full" />
          <div className="h-4 bg-bg-secondary rounded w-3/4" />
          <div className="h-3 bg-bg-secondary rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// ─── SearchView ──────────────────────────────────────────────────────

export function SearchView({
  projectId,
  contextId,
  onClose,
  className,
}: SearchViewProps) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [activeLayers, setActiveLayers] = React.useState<SearchLayer[]>(["text"]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);

  // Debounce query input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Search query
  const { data: results, isLoading } = api.search.query.useQuery(
    {
      query: debouncedQuery,
      projectId,
      contextId,
      layers: activeLayers,
      limit: 50,
    },
    {
      enabled: debouncedQuery.length > 0 || activeLayers.length > 1,
    },
  );

  const toggleLayer = React.useCallback((layer: SearchLayer) => {
    setActiveLayers((prev) => {
      if (prev.includes(layer)) {
        // Don't allow removing the last layer
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== layer);
      }
      return [...prev, layer];
    });
  }, []);

  const handleResultClick = React.useCallback(
    (unitId: string) => {
      setSelectedUnit(unitId);
      onClose();
    },
    [setSelectedUnit, onClose],
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm",
        "flex flex-col",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="max-w-3xl mx-auto p-4">
          {/* Search input */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search thoughts..."
              className={cn(
                "w-full pl-12 pr-12 py-3 rounded-xl",
                "bg-bg-secondary border border-border",
                "text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent",
                "text-lg",
              )}
              aria-label="Search query"
            />
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-text-tertiary mr-2">Search in:</span>
            <LayerToggle
              layer="text"
              icon={FileText}
              label="Text"
              active={activeLayers.includes("text")}
              onToggle={toggleLayer}
            />
            <LayerToggle
              layer="structural"
              icon={Layers}
              label="Structural"
              active={activeLayers.includes("structural")}
              onToggle={toggleLayer}
            />
            <LayerToggle
              layer="temporal"
              icon={Clock}
              label="Temporal"
              active={activeLayers.includes("temporal")}
              onToggle={toggleLayer}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4">
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading results">
              {Array.from({ length: 5 }, (_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          ) : !debouncedQuery && activeLayers.length === 1 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary">
                Start typing to search your thoughts
              </p>
              <p className="text-sm text-text-tertiary mt-1">
                Use layer toggles to filter by structure or time
              </p>
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Search results">
              <p className="text-sm text-text-tertiary mb-4">
                {results.length} result{results.length !== 1 ? "s" : ""} found
              </p>
              {results.map((result) => (
                <SearchResultItem
                  key={result.unitId}
                  result={result}
                  onClick={handleResultClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary">No results found</p>
              <p className="text-sm text-text-tertiary mt-1">
                Try different keywords or adjust layer filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
