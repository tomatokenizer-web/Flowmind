"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Search, Loader2, Layers } from "lucide-react";
import { Button } from "~/components/ui/button";

interface RAGSearchPanelProps {
  projectId: string;
  contextId?: string;
  onSelectUnit?: (unitId: string) => void;
}

const INTENT_LABELS: Record<string, string> = {
  factual: "Factual",
  exploratory: "Exploratory",
  structural: "Structural",
  temporal: "Temporal",
  balanced: "Balanced",
};

const LAYER_COLORS: Record<string, string> = {
  text: "bg-blue-500/20 text-blue-400",
  semantic: "bg-purple-500/20 text-purple-400",
  structural: "bg-green-500/20 text-green-400",
  temporal: "bg-amber-500/20 text-amber-400",
};

export function RAGSearchPanel({ projectId, contextId, onSelectUnit }: RAGSearchPanelProps) {
  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");

  const searchQuery = api.rag.query.useQuery(
    { query: submittedQuery, projectId, contextId },
    { enabled: !!submittedQuery && !!projectId },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmittedQuery(query.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all layers..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded bg-bg-secondary text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <Button type="submit" size="sm" disabled={!query.trim() || searchQuery.isLoading}>
          {searchQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {searchQuery.data && (
        <div className="space-y-3">
          {/* Intent badge */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Layers className="h-3 w-3" />
            Intent: <span className="font-medium text-text-primary">{INTENT_LABELS[searchQuery.data.intent] ?? searchQuery.data.intent}</span>
            &middot; {searchQuery.data.results.length} results
          </div>

          {/* Results */}
          {searchQuery.data.results.length === 0 ? (
            <div className="text-center py-6 text-text-secondary text-sm">No results found</div>
          ) : (
            <div className="space-y-2">
              {searchQuery.data.results.slice(0, 30).map((result) => (
                <button
                  key={result.unitId}
                  onClick={() => onSelectUnit?.(result.unitId)}
                  className="w-full text-left p-3 border border-border rounded hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary line-clamp-2">{result.content}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-secondary">{result.unitType}</span>
                        {result.matchedLayers.map((layer) => (
                          <span
                            key={layer}
                            className={cn("text-xs px-1.5 py-0.5 rounded", LAYER_COLORS[layer])}
                          >
                            {layer}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary whitespace-nowrap">
                      {(result.fusedScore * 100).toFixed(1)}
                    </div>
                  </div>
                  {result.highlights.length > 0 && (
                    <div className="mt-1 text-xs text-text-secondary italic truncate">
                      {result.highlights[0]}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
