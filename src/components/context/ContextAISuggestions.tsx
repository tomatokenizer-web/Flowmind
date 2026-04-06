"use client";

import * as React from "react";
import { useState } from "react";
import { Sparkles, Merge, Scissors, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

// ─── Props ──────────────────────────────────────────────────────────

interface ContextAISuggestionsProps {
  projectId: string;
  onMerge: (sourceId: string, targetId: string) => void;
  onSplit: (contextId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextAISuggestions({ projectId, onMerge, onSplit }: ContextAISuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionsQuery = api.ai.suggestContextOperations.useQuery(
    { projectId },
    { enabled: showSuggestions, refetchOnWindowFocus: false },
  );

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setShowSuggestions((v) => !v)}
        className={cn(
          "flex w-full items-center gap-space-2 px-space-3 py-space-2",
          "text-xs text-text-secondary hover:text-text-primary transition-colors duration-fast",
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
        <span>AI Suggestions</span>
        {showSuggestions ? (
          <ChevronDown className="ml-auto h-3 w-3" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3" />
        )}
      </button>

      {showSuggestions && (
        <div className="px-space-3 pb-space-2 space-y-space-1">
          {suggestionsQuery.isLoading && (
            <div className="flex items-center gap-space-2 py-space-2 text-xs text-text-tertiary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing contexts...</span>
            </div>
          )}

          {suggestionsQuery.data?.mergeSuggestions.map((m, i) => (
            <button
              key={`merge-${i}`}
              type="button"
              onClick={() => onMerge(m.contextIdA, m.contextIdB)}
              className={cn(
                "w-full rounded-md border border-border bg-bg-surface p-space-2 text-left",
                "hover:bg-bg-hover transition-colors duration-fast",
              )}
            >
              <div className="flex items-center gap-space-1 text-xs">
                <Merge className="h-3 w-3 text-accent-primary shrink-0" />
                <span className="font-medium text-text-primary truncate">Merge</span>
                <span className={cn(
                  "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  m.confidence >= 0.7
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-bg-secondary text-text-tertiary",
                )}>
                  {Math.round(m.confidence * 100)}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-text-secondary truncate">
                {m.contextNameA} + {m.contextNameB}
              </p>
              <p className="mt-0.5 text-[10px] text-text-tertiary truncate">{m.reason}</p>
            </button>
          ))}

          {suggestionsQuery.data?.splitSuggestions.map((s, i) => (
            <button
              key={`split-${i}`}
              type="button"
              onClick={() => onSplit(s.contextId)}
              className={cn(
                "w-full rounded-md border border-border bg-bg-surface p-space-2 text-left",
                "hover:bg-bg-hover transition-colors duration-fast",
              )}
            >
              <div className="flex items-center gap-space-1 text-xs">
                <Scissors className="h-3 w-3 text-accent-primary shrink-0" />
                <span className="font-medium text-text-primary truncate">Split {s.contextName}</span>
                <span className={cn(
                  "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  s.confidence >= 0.7
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-bg-secondary text-text-tertiary",
                )}>
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-text-secondary truncate">
                {s.suggestedSplitA} / {s.suggestedSplitB}
              </p>
              <p className="mt-0.5 text-[10px] text-text-tertiary truncate">{s.reason}</p>
            </button>
          ))}

          {suggestionsQuery.data &&
            suggestionsQuery.data.mergeSuggestions.length === 0 &&
            suggestionsQuery.data.splitSuggestions.length === 0 && (
            <p className="py-space-1 text-[11px] text-text-tertiary">
              No merge or split suggestions at this time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
