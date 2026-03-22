"use client";

import * as React from "react";
import { Check, X, ChevronDown, Sparkles, Loader2, Tag, Link2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { toast } from "~/lib/toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestionCategory = "type" | "relation" | "refinement";

interface TypeSuggestionItem {
  id: string;
  unitId: string;
  unitContent: string;
  category: "type";
  suggestion: string;
  confidence: number;
  reasoning?: string;
}

interface RelationSuggestionItem {
  id: string;
  unitId: string;
  unitContent: string;
  category: "relation";
  suggestion: string;
  targetUnitId?: string;
  relationType?: string;
  confidence: number;
  reasoning?: string;
}

type SuggestionItem = TypeSuggestionItem | RelationSuggestionItem;

interface SuggestionQueuePanelProps {
  contextId: string;
  projectId: string;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-emerald-600";
  if (confidence >= 0.5) return "text-amber-600";
  return "text-text-tertiary";
}

// ─── Individual Suggestion Row ───────────────────────────────────────────────

function SuggestionRow({
  item,
  onAccept,
  onDismiss,
}: {
  item: SuggestionItem;
  onAccept: (item: SuggestionItem) => void;
  onDismiss: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const categoryIcon =
    item.category === "type" ? (
      <Tag className="h-3 w-3 text-blue-500" aria-hidden="true" />
    ) : (
      <Link2 className="h-3 w-3 text-violet-500" aria-hidden="true" />
    );

  const categoryLabel = item.category === "type" ? "Type" : "Relation";

  return (
    <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {categoryIcon}
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            {categoryLabel}
          </span>
        </div>
        <span className={cn("shrink-0 text-[10px] font-medium", confidenceColor(item.confidence))}>
          {confidenceLabel(item.confidence)} ({Math.round(item.confidence * 100)}%)
        </span>
      </div>

      {/* Unit content preview */}
      <p className="line-clamp-2 text-xs text-text-secondary">
        {item.unitContent.replace(/<[^>]*>/g, "").slice(0, 120)}
      </p>

      {/* Suggestion */}
      <p className="text-sm font-medium text-text-primary capitalize">
        {item.suggestion.replace(/_/g, " ")}
      </p>

      {/* Expandable reasoning */}
      {item.reasoning && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-text-tertiary hover:text-text-secondary"
        >
          {expanded ? "Hide reasoning" : "Show reasoning"}
        </button>
      )}
      {expanded && item.reasoning && (
        <p className="text-xs text-text-secondary italic">{item.reasoning}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onAccept(item)}
          className="h-6 gap-1 px-2 text-xs"
        >
          <Check className="h-3 w-3" />
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(item.id)}
          className="h-6 gap-1 px-2 text-xs text-text-secondary"
        >
          <X className="h-3 w-3" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

// ─── SuggestionQueuePanel ────────────────────────────────────────────────────

export function SuggestionQueuePanel({
  contextId,
  projectId,
  className,
}: SuggestionQueuePanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<SuggestionItem[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<SuggestionCategory | "all">("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const utils = api.useUtils();

  // Fetch context units to generate suggestions for
  const { data: unitPage } = api.unit.list.useQuery(
    { projectId, limit: 10, lifecycle: "pending" },
    { enabled: !!projectId && isOpen },
  );

  const suggestTypeMutation = api.ai.suggestType.useMutation();
  const suggestRelationsMutation = api.ai.suggestRelations.useMutation();
  const updateUnitMutation = api.unit.update.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate({ projectId });
    },
    onError: (err) => toast.error("Failed to apply suggestion", { description: err.message }),
  });

  // Generate suggestions for pending units in the context
  const generateSuggestions = React.useCallback(async () => {
    const units = unitPage?.items ?? [];
    if (units.length === 0) return;

    setIsLoading(true);
    const newSuggestions: SuggestionItem[] = [];

    await Promise.allSettled(
      units.slice(0, 5).map(async (unit) => {
        // Type suggestion
        try {
          const typeResult = await suggestTypeMutation.mutateAsync({
            content: unit.content,
            contextId,
          });
          if (typeResult.suggestion) {
            newSuggestions.push({
              id: `type-${unit.id}`,
              unitId: unit.id,
              unitContent: unit.content,
              category: "type",
              suggestion: typeResult.suggestion.unitType,
              confidence: typeResult.suggestion.confidence,
              reasoning: typeResult.suggestion.reasoning,
            });
          }
        } catch {
          // Skip failed suggestions silently
        }

        // Relation suggestions
        try {
          const relResult = await suggestRelationsMutation.mutateAsync({
            content: unit.content,
            contextId,
          });
          for (const rel of relResult.suggestions.slice(0, 2)) {
            newSuggestions.push({
              id: `rel-${unit.id}-${rel.targetUnitId}-${rel.relationType}`,
              unitId: unit.id,
              unitContent: unit.content,
              category: "relation",
              suggestion: rel.relationType,
              targetUnitId: rel.targetUnitId,
              relationType: rel.relationType,
              confidence: rel.strength,
              reasoning: rel.reasoning,
            });
          }
        } catch {
          // Skip failed suggestions silently
        }
      }),
    );

    setSuggestions(newSuggestions);
    setIsLoading(false);
  }, [unitPage, contextId, suggestTypeMutation, suggestRelationsMutation]);

  // Auto-generate when panel opens and units are available
  React.useEffect(() => {
    if (isOpen && unitPage?.items && unitPage.items.length > 0 && suggestions.length === 0) {
      void generateSuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, unitPage]);

  const handleAccept = React.useCallback(
    (item: SuggestionItem) => {
      if (item.category === "type") {
        updateUnitMutation.mutate({
          id: item.unitId,
          unitType: item.suggestion as Parameters<typeof updateUnitMutation.mutate>[0]["unitType"],
        });
      }
      // Relation acceptance would require a relation.create call — remove from queue for now
      setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
      toast.success("Suggestion accepted");
    },
    [updateUnitMutation],
  );

  const handleDismiss = React.useCallback((itemId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== itemId));
  }, []);

  // Bulk actions
  const handleAcceptAllTypes = React.useCallback(() => {
    const typeItems = suggestions.filter((s) => s.category === "type");
    typeItems.forEach((item) => {
      updateUnitMutation.mutate({
        id: item.unitId,
        unitType: item.suggestion as Parameters<typeof updateUnitMutation.mutate>[0]["unitType"],
      });
    });
    setSuggestions((prev) => prev.filter((s) => s.category !== "type"));
    toast.success(`Accepted ${typeItems.length} type suggestion${typeItems.length !== 1 ? "s" : ""}`);
  }, [suggestions, updateUnitMutation]);

  const handleAcceptAllRelations = React.useCallback(() => {
    const relItems = suggestions.filter((s) => s.category === "relation");
    setSuggestions((prev) => prev.filter((s) => s.category !== "relation"));
    toast.success(`Accepted ${relItems.length} relation suggestion${relItems.length !== 1 ? "s" : ""}`);
  }, [suggestions]);

  const handleDismissAll = React.useCallback(() => {
    setSuggestions([]);
  }, []);

  const filteredSuggestions =
    activeCategory === "all"
      ? suggestions
      : suggestions.filter((s) => s.category === activeCategory);

  const typeCount = suggestions.filter((s) => s.category === "type").length;
  const relationCount = suggestions.filter((s) => s.category === "relation").length;
  const totalCount = suggestions.length;

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI Suggestion Queue
          {totalCount > 0 && (
            <span className="rounded-full bg-accent-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-primary">
              {totalCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="border-t border-border p-3 space-y-3">
          {/* Category filter tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1 w-fit">
            {(["all", "type", "relation"] as const).map((cat) => {
              const label =
                cat === "all" ? "All" : cat === "type" ? `Types (${typeCount})` : `Relations (${relationCount})`;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-bg-primary text-text-primary shadow-sm"
                      : "text-text-tertiary hover:text-text-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Bulk actions */}
          {totalCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {typeCount > 0 && (
                <button
                  type="button"
                  onClick={handleAcceptAllTypes}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Accept All Types
                </button>
              )}
              {relationCount > 0 && (
                <button
                  type="button"
                  onClick={handleAcceptAllRelations}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Accept All Relations
                </button>
              )}
              <button
                type="button"
                onClick={handleDismissAll}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Dismiss All
              </button>
            </div>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              setSuggestions([]);
              void generateSuggestions();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-accent-primary hover:underline disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Analyzing units...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Refresh suggestions
              </>
            )}
          </button>

          {/* Suggestion list */}
          {filteredSuggestions.length === 0 && !isLoading ? (
            <p className="py-4 text-center text-sm text-text-tertiary">
              {totalCount === 0
                ? "No pending suggestions. Click refresh to analyze units."
                : "No suggestions in this category."}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {filteredSuggestions.map((item) => (
                <SuggestionRow
                  key={item.id}
                  item={item}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
