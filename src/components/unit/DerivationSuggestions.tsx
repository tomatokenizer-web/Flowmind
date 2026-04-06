"use client";

import * as React from "react";
import { Sparkles, Plus, Loader2, ChevronDown, ChevronUp, FolderPlus } from "lucide-react";
import type { UnitType } from "@prisma/client";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "./unit-type-badge";
import { toast } from "~/lib/toast";

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

interface ContextSuggestion {
  contextId: string;
  contextName: string;
  confidence: number;
  reason: string;
  alreadyLinked: boolean;
}

interface DerivationSuggestionsProps {
  unitId: string;
  contextId?: string | null;
  projectId?: string;
  onCreateUnit?: (content: string, unitType: UnitType, relation: string) => void;
  onUnitCreated?: () => void;
  className?: string;
}

// ─── Context Picker Popover ────────────────────────────────────────

function ContextPickerPopover({
  suggestions,
  isLoading,
  onSelect,
  onCreateWithoutContext,
  onClose,
}: {
  suggestions: ContextSuggestion[];
  isLoading: boolean;
  onSelect: (contextId: string, contextName: string) => void;
  onCreateWithoutContext: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-1 z-50 w-72",
        "rounded-lg border border-border bg-bg-surface shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150",
      )}
    >
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium text-text-primary">Add to Context</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          Select a context or create without one
        </p>
      </div>

      <div className="max-h-48 overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />
            <span className="ml-2 text-xs text-text-tertiary">Analyzing context fit...</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((s) => (
            <button
              key={s.contextId}
              type="button"
              disabled={s.alreadyLinked}
              onClick={() => onSelect(s.contextId, s.contextName)}
              className={cn(
                "w-full text-left rounded-md px-2.5 py-2 text-xs",
                "transition-colors duration-fast",
                s.alreadyLinked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent-primary/10 cursor-pointer",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-text-primary truncate">
                  {s.contextName}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    s.confidence >= 0.8
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : s.confidence >= 0.6
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-bg-secondary text-text-tertiary",
                  )}
                >
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-text-tertiary leading-tight line-clamp-1">
                {s.alreadyLinked ? "Already in this context" : s.reason}
              </p>
            </button>
          ))
        ) : (
          <p className="py-3 text-center text-xs text-text-tertiary">
            No matching contexts found
          </p>
        )}
      </div>

      <div className="border-t border-border p-1">
        <button
          type="button"
          onClick={onCreateWithoutContext}
          className={cn(
            "w-full text-left rounded-md px-2.5 py-2 text-xs",
            "text-text-secondary hover:bg-bg-secondary",
            "transition-colors duration-fast",
          )}
        >
          Create without context assignment
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function DerivationSuggestions({
  unitId,
  contextId,
  projectId,
  onCreateUnit,
  onUnitCreated,
  className,
}: DerivationSuggestionsProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [createdContents, setCreatedContents] = React.useState<Set<string>>(new Set());
  const [pickerOpenFor, setPickerOpenFor] = React.useState<number | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  const { data, isLoading } = api.ai.suggestDerivations.useQuery(
    { unitId, contextId: contextId ?? undefined },
    { enabled: expanded, retry: false },
  );

  const derivations: Derivation[] = (data?.derivations ?? []).filter(
    (d) => !createdContents.has(d.content),
  );

  const { data: contextData, isLoading: contextLoading } = api.ai.suggestContextForUnit.useQuery(
    { unitId, projectId: projectId! },
    {
      enabled: pickerOpenFor !== null && !!projectId,
      retry: false,
    },
  );

  const createInContext = api.ai.createDerivationInContext.useMutation({
    onSuccess: (result, variables) => {
      setCreatedContents((prev) => new Set(prev).add(variables.content));
      void utils.unit.invalidate();
      void utils.relation.invalidate();
      if (result.contextAssigned) {
        void utils.context.invalidate();
      }
      onUnitCreated?.();
    },
  });

  // Close picker on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpenFor(null);
      }
    }
    if (pickerOpenFor !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [pickerOpenFor]);

  /** Create derivation via server mutation — handles context + auto-relate atomically */
  function handleCreate(
    d: Derivation,
    targetContextId?: string,
    targetContextName?: string,
  ) {
    if (!projectId) return;
    setPickerOpenFor(null);

    // If no context selected and parent has a simple create handler, use it
    if (!targetContextId && onCreateUnit) {
      onCreateUnit(d.content, d.unitType as UnitType, d.relationToOrigin);
      setCreatedContents((prev) => new Set(prev).add(d.content));
      return;
    }

    // Use server mutation for context assignment + auto-relate
    createInContext.mutate(
      {
        sourceUnitId: unitId,
        content: d.content,
        unitType: d.unitType as "claim" | "question" | "evidence" | "counterargument" | "observation" | "idea" | "definition" | "assumption" | "action",
        relationToOrigin: d.relationToOrigin,
        projectId,
        contextId: targetContextId,
      },
      {
        onSuccess: (result) => {
          if (targetContextName && result.contextAssigned) {
            const msg = result.autoRelatedCount > 0
              ? `Added to "${targetContextName}" with ${result.autoRelatedCount} auto-relation${result.autoRelatedCount > 1 ? "s" : ""}`
              : `Added to "${targetContextName}"`;
            toast.success(msg);
          } else {
            toast.success("Derivation created");
          }
        },
        onError: () => {
          toast.error("Failed to create derivation");
        },
      },
    );
  }

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
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
              <span className="ml-2 text-xs text-text-tertiary">AI analyzing unit content...</span>
            </div>
          ) : data && !data.aiGenerated ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                AI analysis failed. Check server logs for details.
              </p>
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
                  {/* Action buttons */}
                  {projectId && (
                    <div className="shrink-0 flex flex-col gap-1 relative" ref={pickerOpenFor === i ? pickerRef : undefined}>
                      {/* Create button (no context) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreate(d);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1.5",
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
                      {/* Add to context button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickerOpenFor(pickerOpenFor === i ? null : i);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1.5",
                          "text-xs font-medium text-text-secondary",
                          "border border-border",
                          "hover:bg-bg-secondary hover:text-text-primary transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                          pickerOpenFor === i && "bg-bg-secondary text-text-primary",
                        )}
                        aria-label="Create and add to context"
                      >
                        <FolderPlus className="h-3 w-3" aria-hidden="true" />
                        + Context
                      </button>
                      {/* Context picker popover */}
                      {pickerOpenFor === i && (
                        <ContextPickerPopover
                          suggestions={contextData?.suggestions ?? []}
                          isLoading={contextLoading}
                          onSelect={(ctxId, ctxName) =>
                            handleCreate(d, ctxId, ctxName)
                          }
                          onCreateWithoutContext={() =>
                            handleCreate(d)
                          }
                          onClose={() => setPickerOpenFor(null)}
                        />
                      )}
                    </div>
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
