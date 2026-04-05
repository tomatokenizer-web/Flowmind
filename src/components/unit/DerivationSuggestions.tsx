"use client";

import * as React from "react";
import { Sparkles, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { UnitType } from "@prisma/client";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "./unit-type-badge";

// ─── Relation label mapping ─────────────────────────────────────────

const RELATION_LABELS: Record<string, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  derives_from: "Derives from",
  expands: "Expands",
  references: "References",
  exemplifies: "Exemplifies",
  defines: "Defines",
  questions: "Questions",
};

// ─── Types ──────────────────────────────────────────────────────────

interface Derivation {
  content: string;
  unitType: string;
  relationToOrigin: string;
  rationale: string;
}

interface DerivationSuggestionsProps {
  unitId: string;
  contextId?: string | null;
  projectId?: string;
  onCreateUnit?: (content: string, unitType: UnitType, relation: string) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function DerivationSuggestions({
  unitId,
  contextId,
  projectId,
  onCreateUnit,
  className,
}: DerivationSuggestionsProps) {
  const [expanded, setExpanded] = React.useState(false);

  const { data, isLoading } = api.ai.suggestDerivations.useQuery(
    { unitId, contextId: contextId ?? undefined },
    { enabled: expanded, retry: false },
  );

  const derivations: Derivation[] = data?.derivations ?? [];

  return (
    <div className={cn("border-t border-border pt-3", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((p) => !p);
        }}
        className={cn(
          "flex w-full items-center gap-2 text-xs font-medium",
          "text-accent-primary hover:text-accent-primary/80",
          "transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        AI Derivation Suggestions
        {expanded ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
              <span className="ml-2 text-xs text-text-tertiary">Generating suggestions...</span>
            </div>
          ) : derivations.length > 0 ? (
            derivations.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border border-border bg-bg-surface p-3",
                  "hover:border-accent-primary/30 transition-colors duration-fast",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Type + relation badges */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <UnitTypeBadge unitType={d.unitType as UnitType} />
                      <span className="text-[10px] font-medium text-text-tertiary px-1.5 py-0.5 rounded-full bg-bg-secondary">
                        {RELATION_LABELS[d.relationToOrigin] ?? d.relationToOrigin}
                      </span>
                    </div>
                    {/* Suggested content */}
                    <p className="text-sm text-text-primary leading-relaxed">
                      {d.content}
                    </p>
                    {/* Rationale */}
                    <p className="mt-1 text-xs text-text-tertiary italic">
                      {d.rationale}
                    </p>
                  </div>
                  {/* Create button */}
                  {onCreateUnit && projectId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateUnit(d.content, d.unitType as UnitType, d.relationToOrigin);
                      }}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1.5",
                        "text-xs font-medium text-accent-primary",
                        "border border-accent-primary/30",
                        "hover:bg-accent-primary/10 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      )}
                      aria-label={`Create ${d.unitType} unit from suggestion`}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                      Create
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-xs text-text-tertiary">
              No derivation suggestions available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
