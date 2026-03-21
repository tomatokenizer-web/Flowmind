"use client";

import * as React from "react";
import {
  Boxes,
  CheckCircle2,
  FileEdit,
  Clock,
  Link2,
  HelpCircle,
  AlertTriangle,
  ScanSearch,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSelectionStore } from "~/stores/selectionStore";

// ─── Types ───────────────────────────────────────────────────────────

interface ContextDashboardProps {
  contextId: string;
  projectId: string;
  className?: string;
}

interface StatBadgeProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color?: "default" | "success" | "warning" | "danger" | "info";
}

// ─── Stat Badge ──────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, count, color = "default" }: StatBadgeProps) {
  const colorClasses = {
    default: "bg-bg-secondary text-text-secondary",
    success: "bg-lifecycle-confirmed-bg text-lifecycle-confirmed-text",
    warning: "bg-lifecycle-pending-bg text-lifecycle-pending-text",
    danger: "bg-accent-danger/10 text-accent-danger",
    info: "bg-accent-primary/10 text-accent-primary",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        colorClasses[color],
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{count}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Connected Unit Chip ─────────────────────────────────────────────

function ConnectedUnitChip({
  unitId,
  content,
  relationCount,
  onClick,
}: {
  unitId: string;
  content: string;
  relationCount: number;
  onClick: (unitId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(unitId)}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs",
        "bg-bg-secondary hover:bg-bg-hover text-text-primary",
        "transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        "max-w-[180px]",
      )}
      title={content}
    >
      <Link2 className="h-3 w-3 flex-shrink-0 text-text-tertiary" />
      <span className="truncate">{content.slice(0, 30)}{content.length > 30 ? "..." : ""}</span>
      <span className="flex-shrink-0 text-text-tertiary">({relationCount})</span>
    </button>
  );
}

// ─── Context Dashboard ───────────────────────────────────────────────

export function ContextDashboard({
  contextId,
  projectId,
  className,
}: ContextDashboardProps) {
  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);

  // Contradiction analysis — triggered on demand
  const [contradictionCount, setContradictionCount] = React.useState<number | null>(null);
  const contradictionMutation = api.ai.detectContradictions.useMutation({
    onSuccess: (pairs) => setContradictionCount(pairs.length),
  });

  // Fetch context statistics
  const { data: context } = api.context.getById.useQuery({ id: contextId });

  // Fetch units in context for statistics
  const { data: units } = api.context.getUnitsForContext.useQuery({ id: contextId });

  // Compute statistics
  const stats = React.useMemo(() => {
    if (!units) {
      return {
        total: 0,
        confirmed: 0,
        draft: 0,
        pending: 0,
        questions: 0,
        contradictions: 0,
        topConnected: [] as Array<{ id: string; content: string; relationCount: number }>,
      };
    }

    let confirmed = 0;
    let draft = 0;
    let pending = 0;
    let questions = 0;

    // Track units with relation counts
    const unitsWithCounts: Array<{ id: string; content: string; relationCount: number }> = [];

    for (const unitContext of units) {
      const unit = unitContext.unit;
      // Lifecycle counts
      switch (unit.lifecycle) {
        case "confirmed":
          confirmed++;
          break;
        case "draft":
          draft++;
          break;
        case "pending":
          pending++;
          break;
      }

      // Question count (open questions)
      if (unit.unitType === "question" && unit.lifecycle !== "complete") {
        questions++;
      }

      // Track for top connected (relation count not included in this query, default to 0)
      unitsWithCounts.push({
        id: unit.id,
        content: unit.content,
        relationCount: 0, // Would need separate query to get actual counts
      });
    }

    // Sort by relation count and take top 3
    const topConnected = unitsWithCounts
      .sort((a, b) => b.relationCount - a.relationCount)
      .slice(0, 3)
      .filter((u) => u.relationCount > 0);

    return {
      total: units.length,
      confirmed,
      draft,
      pending,
      questions,
      topConnected,
    };
  }, [units]);

  const handleUnitClick = React.useCallback(
    (unitId: string) => {
      setSelectedUnit(unitId);
    },
    [setSelectedUnit],
  );

  if (!context) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-primary p-4",
        "shadow-resting",
        className,
      )}
      role="region"
      aria-label="Context statistics"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary">
          Context Overview
        </h3>
      </div>

      {/* Unit counts */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <StatBadge icon={Boxes} label="Total units" count={stats.total} />
        <StatBadge
          icon={CheckCircle2}
          label="Confirmed"
          count={stats.confirmed}
          color="success"
        />
        <StatBadge icon={FileEdit} label="Draft" count={stats.draft} />
        <StatBadge
          icon={Clock}
          label="Pending review"
          count={stats.pending}
          color="warning"
        />
      </div>

      {/* Open questions & contradictions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {stats.questions > 0 && (
          <StatBadge
            icon={HelpCircle}
            label="Open questions"
            count={stats.questions}
            color="info"
          />
        )}
        {/* Contradiction analysis — on-demand */}
        <div className="inline-flex items-center gap-1.5">
          {contradictionCount !== null && contradictionCount > 0 && (
            <StatBadge
              icon={AlertTriangle}
              label="Contradictions"
              count={contradictionCount}
              color="danger"
            />
          )}
          {contradictionCount !== null && contradictionCount === 0 && (
            <span className="text-xs text-text-tertiary">No contradictions found</span>
          )}
          <button
            type="button"
            onClick={() =>
              contradictionMutation.mutate({ contextId })
            }
            disabled={contradictionMutation.isPending}
            title="Scan for contradictions"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              "text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary",
              "transition-colors duration-fast disabled:opacity-50",
            )}
          >
            <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
            {contradictionMutation.isPending ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Top connected units */}
      {stats.topConnected.length > 0 && (
        <div>
          <p className="text-xs text-text-tertiary mb-2">Most connected:</p>
          <div className="flex flex-wrap gap-2">
            {stats.topConnected.map((unit) => (
              <ConnectedUnitChip
                key={unit.id}
                unitId={unit.id}
                content={unit.content}
                relationCount={unit.relationCount}
                onClick={handleUnitClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
