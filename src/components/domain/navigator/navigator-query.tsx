"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  Loader2,
  Lightbulb,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { EmptyState } from "~/components/shared/empty-state";
import { UnitCard, type UnitCardUnit } from "~/components/domain/unit";
import { RelationBadge } from "~/components/domain/relation";
import type { UseNavigatorReturn, PathNode } from "~/hooks/use-navigator";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";

/* ─── Types ─── */

interface NavigatorQueryProps {
  navigator: UseNavigatorReturn;
  onStartNavigation: (unitIds: string[]) => void;
  className?: string;
}

interface QueryInterpretation {
  summary: string;
  matchedPathType: string;
  confidence: number;
}

/* ─── Example Queries ─── */

const EXAMPLE_QUERIES = [
  "Show me evidence against my hypothesis",
  "What caused this outcome?",
  "How did this idea evolve over time?",
  "Find connections between these concepts",
  "What assumptions underlie this claim?",
];

/* ─── Component ─── */

export function NavigatorQuery({
  navigator,
  onStartNavigation,
  className,
}: NavigatorQueryProps) {
  const [query, setQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [interpretation, setInterpretation] =
    React.useState<QueryInterpretation | null>(null);
  const [resultPath, setResultPath] = React.useState<PathNode[]>([]);
  const [resultUnits, setResultUnits] = React.useState<UnitCardUnit[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  // Use the global search query for finding matching units
  const searchQuery = api.search.global.useQuery(
    { query, projectId: activeProjectId!, limit: 20 },
    {
      enabled: false, // Manual trigger only
    },
  );

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setIsSearching(true);
      setInterpretation(null);
      setResultPath([]);
      setResultUnits([]);

      try {
        const result = await searchQuery.refetch();
        const units = (result.data?.units ?? []) as unknown as UnitCardUnit[];

        // Build an interpretation from the query
        const interp = interpretQuery(query, navigator.pathType);
        setInterpretation(interp);

        // Build path nodes from results
        const nodes: PathNode[] = units.map((u, i) => ({
          unitId: u.id,
          visited: false,
          branches: [],
          relationFromPrevious:
            i > 0 ? interp.matchedPathType : undefined,
        }));

        setResultPath(nodes);
        setResultUnits(units);
      } catch {
        // Error handled by tRPC
      } finally {
        setIsSearching(false);
      }
    },
    [query, navigator.pathType, searchQuery],
  );

  const handleStartPath = React.useCallback(() => {
    if (resultPath.length === 0) return;
    navigator.setPath(resultPath);
    onStartNavigation(resultPath.map((n) => n.unitId));
  }, [resultPath, navigator, onStartNavigation]);

  const handleExampleClick = React.useCallback((example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  }, []);

  const handleClear = React.useCallback(() => {
    setQuery("");
    setInterpretation(null);
    setResultPath([]);
    setResultUnits([]);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Search input */}
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your knowledge..."
            className={cn(
              "w-full rounded-lg border border-border bg-bg-primary pl-10 pr-20 py-2.5",
              "text-sm text-text-primary placeholder:text-text-tertiary",
              "transition-all duration-fast ease-default",
              "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary",
            )}
            aria-label="Navigation query"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded p-1 text-text-tertiary hover:text-text-secondary transition-colors duration-fast"
                aria-label="Clear query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || isSearching}
              className="h-7 px-2.5"
            >
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Content area */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <AnimatePresence mode="wait">
            {/* Interpretation feedback */}
            {interpretation && (
              <motion.div
                key="interpretation"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mb-4 rounded-lg border border-border bg-bg-secondary p-3",
                )}
              >
                <div className="flex items-start gap-2">
                  <Lightbulb
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary">
                      Interpreted as: {interpretation.summary}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      Path type: {interpretation.matchedPathType} | Confidence:{" "}
                      {Math.round(interpretation.confidence * 100)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {resultUnits.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Start navigation button */}
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">
                    {resultUnits.length} units found
                  </p>
                  <Button
                    size="sm"
                    onClick={handleStartPath}
                    className="gap-1.5"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Start path
                  </Button>
                </div>

                {/* Unit result cards */}
                <div className="space-y-2">
                  {resultUnits.map((unit, i) => (
                    <div key={unit.id}>
                      {i > 0 && (
                        <div className="flex items-center justify-center py-1">
                          <RelationBadge
                            type={
                              resultPath[i]?.relationFromPrevious ?? "related"
                            }
                            layer="L1"
                          />
                        </div>
                      )}
                      <UnitCard
                        unit={unit}
                        variant="compact"
                        onClick={() =>
                          navigator.goToStep(i)
                        }
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : !isSearching && !interpretation ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Example queries */}
                <div className="mt-4">
                  <p className="mb-3 text-xs font-medium text-text-tertiary">
                    Try asking:
                  </p>
                  <div className="space-y-1.5">
                    {EXAMPLE_QUERIES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left",
                          "text-sm text-text-secondary",
                          "transition-all duration-fast ease-default",
                          "hover:bg-bg-hover hover:text-text-primary",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        )}
                      >
                        <Search
                          className="mr-2 inline h-3.5 w-3.5 text-text-tertiary"
                          aria-hidden="true"
                        />
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : isSearching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-12"
              >
                <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
                <p className="text-sm text-text-tertiary">
                  Searching your knowledge graph...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState
                  icon={Search}
                  headline="No matching units found"
                  description="Try rephrasing your question or broadening the scope."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Query Interpretation (client-side heuristic) ─── */

function interpretQuery(
  query: string,
  currentPathType: string,
): QueryInterpretation {
  const lower = query.toLowerCase();

  const patterns: {
    keywords: string[];
    pathType: string;
    summary: string;
  }[] = [
    {
      keywords: ["evidence", "support", "contradict", "argue", "against", "rebut", "prove"],
      pathType: "argument",
      summary: "Finding argumentative connections",
    },
    {
      keywords: ["cause", "effect", "result", "lead to", "because", "enable", "prevent"],
      pathType: "causal",
      summary: "Tracing causal relationships",
    },
    {
      keywords: ["when", "before", "after", "timeline", "evolve", "history", "over time"],
      pathType: "temporal",
      summary: "Following temporal progression",
    },
    {
      keywords: ["similar", "like", "parallel", "analogy", "connect", "resemble", "echo"],
      pathType: "associative",
      summary: "Exploring associative connections",
    },
    {
      keywords: ["contain", "part of", "inside", "structure", "hierarchy", "breakdown"],
      pathType: "containment",
      summary: "Navigating structural hierarchy",
    },
    {
      keywords: ["context", "different", "perspective", "reuse", "across", "appear"],
      pathType: "cross-context",
      summary: "Tracing cross-context appearances",
    },
  ];

  let bestMatch = {
    summary: `Searching for: "${query}"`,
    matchedPathType: currentPathType,
    confidence: 0.5,
  };

  for (const pattern of patterns) {
    const matchCount = pattern.keywords.filter((kw) =>
      lower.includes(kw),
    ).length;
    const confidence = Math.min(1, matchCount / 2);
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        summary: pattern.summary,
        matchedPathType: pattern.pathType,
        confidence,
      };
    }
  }

  return bestMatch;
}
