"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";

// ─── Types ────────────────────────────────────────────────────────────

interface KnowledgeSuggestion {
  title: string;
  description: string;
  relevance: string;
}

interface ExternalKnowledgePanelProps {
  /** The unit whose content seeds the default query */
  unitId: string;
  /** Raw text content of the unit (used to pre-fill the query) */
  unitContent: string;
  /** Called when the user clicks "Add as Unit" on a suggestion */
  onAddAsUnit?: (content: string) => void;
  className?: string;
}

// ─── Suggestion Card ─────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onAddAsUnit,
}: {
  suggestion: KnowledgeSuggestion;
  onAddAsUnit?: (content: string) => void;
}) {
  const [showRelevance, setShowRelevance] = React.useState(false);

  return (
    <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <BookOpen
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-text-primary leading-snug">
            {suggestion.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRelevance((v) => !v)}
          className={cn(
            "shrink-0 rounded p-0.5 text-text-tertiary",
            "hover:bg-bg-hover hover:text-text-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          )}
          aria-label={showRelevance ? "Hide relevance" : "Show relevance"}
          aria-expanded={showRelevance}
        >
          {showRelevance ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed pl-5">
        {suggestion.description}
      </p>

      {showRelevance && (
        <p className="text-xs text-accent-primary/80 bg-accent-primary/5 rounded px-2 py-1 leading-relaxed pl-5">
          Why relevant: {suggestion.relevance}
        </p>
      )}

      {onAddAsUnit && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={() =>
              onAddAsUnit(`${suggestion.title}: ${suggestion.description}`)
            }
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              "border border-accent-primary/30 text-accent-primary",
              "hover:bg-accent-primary/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              "transition-colors",
            )}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add as Unit
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ExternalKnowledgePanel ───────────────────────────────────────────

export function ExternalKnowledgePanel({
  unitId,
  unitContent,
  onAddAsUnit,
  className,
}: ExternalKnowledgePanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  // Derive a short plain-text query from unit content
  const defaultQuery = React.useMemo(
    () =>
      unitContent
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 200),
    [unitContent],
  );

  const [query, setQuery] = React.useState(defaultQuery);

  // Reset query when unit changes
  React.useEffect(() => {
    setQuery(
      unitContent
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 200),
    );
  }, [unitId, unitContent]);

  const searchMutation = api.ai.searchExternalKnowledge.useMutation({
    onError: (err) => {
      toast.error("Knowledge search failed", { description: err.message });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate({ query: query.trim(), unitId });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const results = searchMutation.data;

  return (
    <div className={cn("rounded-xl border border-border", className)}>
      {/* Header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-left",
          "hover:bg-bg-hover rounded-xl transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          isOpen && "rounded-b-none border-b border-border",
        )}
        aria-expanded={isOpen}
        aria-controls="external-knowledge-body"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-primary" aria-hidden="true" />
        <span className="flex-1 text-xs font-medium text-text-primary">
          Related Knowledge
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        )}
      </button>

      {/* Body */}
      {isOpen && (
        <div id="external-knowledge-body" className="p-3 space-y-3">
          {/* Query input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search related knowledge..."
                className={cn(
                  "w-full rounded-lg border border-border bg-bg-primary",
                  "pl-8 pr-3 py-1.5 text-xs text-text-primary",
                  "placeholder:text-text-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-accent-primary",
                )}
                aria-label="Knowledge search query"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
              className="text-xs h-8 px-3 shrink-0"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Loading */}
          {searchMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Finding related knowledge...
            </div>
          )}

          {/* Results */}
          {results && !searchMutation.isPending && (
            <div className="space-y-3">
              {/* Suggestions */}
              {results.suggestions.length > 0 ? (
                <div className="space-y-2">
                  {results.suggestions.map((s, i) => (
                    <SuggestionCard
                      key={`${s.title}-${i}`}
                      suggestion={s}
                      onAddAsUnit={onAddAsUnit}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-text-tertiary">
                  No suggestions found for this query.
                </p>
              )}

              {/* Related concepts */}
              {results.relatedConcepts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    Related Concepts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {results.relatedConcepts.map((concept) => (
                      <button
                        key={concept}
                        type="button"
                        onClick={() => {
                          setQuery(concept);
                          searchMutation.mutate({ query: concept, unitId });
                        }}
                        className={cn(
                          "rounded-full border border-border bg-bg-secondary",
                          "px-2 py-0.5 text-xs text-text-secondary",
                          "hover:border-accent-primary/50 hover:text-accent-primary hover:bg-accent-primary/5",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                          "transition-colors cursor-pointer",
                        )}
                      >
                        {concept}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty initial state */}
          {!results && !searchMutation.isPending && (
            <p className="py-3 text-center text-xs text-text-tertiary">
              Search for related concepts, theories, or topics from AI knowledge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
