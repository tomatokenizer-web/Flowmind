"use client";

import { Plus, Lightbulb, Boxes } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  ContextSummaryCard,
  type ContextSummaryData,
} from "~/components/dashboard/context-summary-card";

// ─── Skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading contexts"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-bg-secondary p-4"
        >
          <div className="mb-3 h-5 w-2/3 rounded bg-bg-hover" />
          <div className="mb-4 h-3 w-full rounded bg-bg-hover" />
          <div className="flex gap-4">
            <div className="h-3 w-16 rounded bg-bg-hover" />
            <div className="h-3 w-12 rounded bg-bg-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Boxes className="h-12 w-12 text-text-tertiary" />
      <h3 className="font-medium text-text-secondary">No contexts yet</h3>
      <p className="max-w-xs text-sm text-text-tertiary">
        Create your first context to start organizing your thoughts.
      </p>
      <Button variant="ghost" onClick={onCreateClick}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Context
      </Button>
    </div>
  );
}

// ─── AI Suggestions Placeholder ──────────────────────────────────────

function AiSuggestionsPanel({
  totalUnresolved,
  contextCount,
}: {
  totalUnresolved: number;
  contextCount: number;
}) {
  if (contextCount === 0) return null;

  return (
    <aside
      className="rounded-xl border border-border bg-bg-surface p-4"
      aria-label="AI suggestions"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
        <Lightbulb className="h-4 w-4 text-accent-warning" aria-hidden="true" />
        Suggested Actions
      </div>
      <ul className="space-y-1.5 text-sm text-text-secondary">
        {totalUnresolved > 0 && (
          <li>
            You have {totalUnresolved} open question{totalUnresolved !== 1 ? "s" : ""}{" "}
            across your contexts.
          </li>
        )}
        <li>
          {contextCount} context{contextCount !== 1 ? "s" : ""} active &mdash;
          review the least-visited one.
        </li>
      </ul>
    </aside>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

interface ProjectOverviewProps {
  contexts: ContextSummaryData[];
  isLoading: boolean;
  onNewContext: () => void;
}

export function ProjectOverview({
  contexts,
  isLoading,
  onNewContext,
}: ProjectOverviewProps) {
  const totalUnits = contexts.reduce((sum, c) => sum + c.unitCount, 0);
  const totalUnresolved = contexts.reduce(
    (sum, c) => sum + c.unresolvedQuestionCount,
    0,
  );

  return (
    <section aria-label="Project dashboard" className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-text-primary">
            Your Contexts
          </h1>
          {!isLoading && contexts.length > 0 && (
            <p className="mt-1 text-sm text-text-secondary">
              {contexts.length} context{contexts.length !== 1 ? "s" : ""} &middot;{" "}
              {totalUnits} total unit{totalUnits !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={onNewContext} size="md">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Context
        </Button>
      </div>

      {/* AI Suggestions */}
      {!isLoading && (
        <AiSuggestionsPanel
          totalUnresolved={totalUnresolved}
          contextCount={contexts.length}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : contexts.length === 0 ? (
        <EmptyState onCreateClick={onNewContext} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contexts.map((ctx) => (
            <ContextSummaryCard key={ctx.id} context={ctx} />
          ))}
        </div>
      )}
    </section>
  );
}
