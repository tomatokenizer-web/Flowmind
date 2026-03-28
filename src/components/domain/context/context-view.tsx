"use client";

import * as React from "react";
import {
  List,
  Network,
  BookOpen,
  LayoutGrid,
  Plus,
  Hash,
  Link2,
  HelpCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ViewMode } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { EmptyUnits } from "~/components/shared/empty-state";
import { ContextHeader } from "./context-header";

/* ─── View mode config ─── */

const VIEW_MODES: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: "list", icon: List, label: "List view" },
  { value: "graph", icon: Network, label: "Graph view" },
  { value: "reading", icon: BookOpen, label: "Reading view" },
  { value: "board", icon: LayoutGrid, label: "Board view" },
];

/* ─── Types ─── */

interface ContextViewProps {
  contextId: string;
  className?: string;
}

/* ─── Component ─── */

export function ContextView({ contextId, className }: ContextViewProps) {
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const contextQuery = api.context.getById.useQuery({ id: contextId });
  const unitsQuery = api.unit.list.useQuery(
    { projectId: activeProjectId!, contextId },
    { enabled: !!activeProjectId },
  );
  const relationsQuery = api.relation.list.useQuery(
    { unitId: contextId },
    { enabled: false }, // Only used for stats count
  );

  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const context = contextQuery.data;
  const units = unitsQuery.data?.items ?? [];
  const isLoading = contextQuery.isLoading || unitsQuery.isLoading;

  /* ─── Unit creation ─── */

  function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content) return;
    // Unit creation is delegated to parent/unit components
    // This is a placeholder that fires the pattern
    setInputValue("");
    inputRef.current?.focus();
  }

  /* ─── Stats ─── */

  const unitCount = units.length;
  const questionCount = units.filter(
    (u) => u.primaryType === "question",
  ).length;

  /* ─── Loading skeleton ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)}>
        <div className="flex flex-col gap-2">
          <Skeleton height="28px" width="50%" />
          <Skeleton height="16px" width="30%" />
        </div>
        <Skeleton height="40px" width="100%" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <section
      className={cn("flex flex-col h-full", className)}
      aria-label={`Context: ${context.name}`}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <ContextHeader contextId={contextId} />

        {/* Unit creation input */}
        <form
          onSubmit={handleCreateUnit}
          className="mt-4 flex items-center gap-2"
        >
          <div
            className={cn(
              "flex-1 flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2",
              "focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary",
              "transition-all duration-fast",
            )}
          >
            <Plus className="h-4 w-4 text-text-tertiary shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Capture a thought..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              aria-label="Create a new thought unit"
            />
          </div>
          <Button type="submit" size="sm" disabled={!inputValue.trim()}>
            Add
          </Button>
        </form>

        {/* View mode switch */}
        <div className="mt-3 flex items-center justify-between">
          <div
            className="inline-flex items-center gap-0.5 rounded-lg bg-bg-secondary p-0.5"
            role="radiogroup"
            aria-label="View mode"
          >
            {VIEW_MODES.map(({ value, icon: Icon, label }) => (
              <SimpleTooltip key={value} content={label}>
                <Toggle
                  size="sm"
                  pressed={viewMode === value}
                  onPressedChange={() => setViewMode(value)}
                  aria-label={label}
                  className="h-7 w-7 px-0"
                >
                  <Icon className="h-3.5 w-3.5" />
                </Toggle>
              </SimpleTooltip>
            ))}
          </div>

          <span className="text-xs text-text-tertiary">
            {unitCount} {unitCount === 1 ? "unit" : "units"}
          </span>
        </div>
      </div>

      {/* Unit list area (delegates to unit-list component) */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {units.length === 0 ? (
          <EmptyUnits
            onAction={() => inputRef.current?.focus()}
          />
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="Thought units">
            {/* Unit list items would be rendered here by unit-list component */}
            {units.map((unit) => (
              <div
                key={unit.id}
                role="listitem"
                className={cn(
                  "rounded-card border border-border bg-bg-primary p-3",
                  "hover:shadow-hover transition-shadow duration-fast",
                  "cursor-pointer",
                )}
              >
                <p className="text-sm text-text-primary line-clamp-3">
                  {unit.content}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                    style={{
                      backgroundColor: `var(--unit-${unit.primaryType}-bg, var(--bg-secondary))`,
                      color: `var(--unit-${unit.primaryType}-accent, var(--text-secondary))`,
                    }}
                  >
                    {unit.primaryType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats bar */}
      <footer className="shrink-0 flex items-center gap-4 px-6 py-2 border-t border-border bg-bg-surface text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3 w-3" aria-hidden="true" />
          {unitCount} units
        </span>
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-3 w-3" aria-hidden="true" />
          {relationsQuery.data?.length ?? 0} relations
        </span>
        {questionCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <HelpCircle className="h-3 w-3" aria-hidden="true" />
            {questionCount} open questions
          </span>
        )}
      </footer>
    </section>
  );
}
