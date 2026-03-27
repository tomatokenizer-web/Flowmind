"use client";

import * as React from "react";
import { GitMerge, HelpCircle, Layers, MessageSquare, TrendingUp, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

// ─── Props ────────────────────────────────────────────────────────

interface ContextStatsPanelProps {
  contextId: string;
  className?: string;
}

// ─── Compact stat pill ────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  color = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: "default" | "primary" | "success" | "warning" | "info";
}) {
  const colorMap = {
    default: "text-text-secondary",
    primary: "text-accent-primary",
    success: "text-lifecycle-confirmed-text",
    warning: "text-lifecycle-pending-text",
    info: "text-accent-secondary",
  };

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-secondary px-2 py-1">
      <Icon className={cn("h-3 w-3 shrink-0", colorMap[color])} aria-hidden="true" />
      <span className="text-[10px] text-text-tertiary">{label}</span>
      <span className="text-xs font-semibold text-text-primary tabular-nums">{value}</span>
    </div>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  claim: "#3B82F6",
  question: "#F59E0B",
  evidence: "#10B981",
  counterargument: "#EF4444",
  observation: "#8B5CF6",
  idea: "#F97316",
  definition: "#06B6D4",
  assumption: "#EC4899",
  action: "#84CC16",
};

function TypeDistribution({
  items,
}: {
  items: Array<{ type: string; count: number; pct: number }>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Types</p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ type, pct }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: TYPE_COLORS[type] ?? "#6B7280" }}
            />
            <span className="w-16 truncate text-[10px] capitalize text-text-tertiary">{type}</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: TYPE_COLORS[type] ?? "#6B7280",
                }}
              />
            </div>
            <span className="w-6 text-right text-[9px] tabular-nums text-text-tertiary">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Activity sparkline ───────────────────────────────────────────

function ActivitySparkline({
  data,
}: {
  data: Array<{ date: string; unitCount: number }>;
}) {
  const max = Math.max(...data.map((d) => d.unitCount), 1);
  const W = 100;
  const H = 22;
  const step = W / (data.length - 1);

  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = H - (d.unitCount / max) * (H - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Activity (7d)</p>
      <svg
        width={W}
        height={H}
        aria-label="Activity over last 7 days"
        role="img"
        className="overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-accent-primary, #3B82F6)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={i * step}
            cy={H - (d.unitCount / max) * (H - 4) - 2}
            r={d.unitCount > 0 ? 2 : 1.5}
            fill={d.unitCount > 0 ? "var(--color-accent-primary, #3B82F6)" : "var(--color-text-tertiary, #6B7280)"}
          >
            <title>{`${d.date}: ${d.unitCount} units`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[8px] text-text-tertiary">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── Context Stats Panel ──────────────────────────────────────────

export function ContextStatsPanel({ contextId, className }: ContextStatsPanelProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const { data: stats, isLoading } = api.context.getContextStats.useQuery(
    { contextId },
    { staleTime: 30_000 },
  );

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-bg-primary p-3", className)}>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-16 animate-pulse rounded-md bg-bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      className={cn("rounded-lg border border-border bg-bg-primary p-3", className)}
      role="region"
      aria-label="Context analytics"
    >
      {/* Compact stat pills in a single row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatPill icon={Layers} label="Units" value={stats.unitCount} color="primary" />
        <StatPill icon={MessageSquare} label="Claims" value={stats.claimCount} />
        <StatPill icon={HelpCircle} label="Questions" value={stats.questionCount} color="warning" />
        <StatPill icon={GitMerge} label="Relations" value={stats.relationCount} color="info" />
        <StatPill icon={TrendingUp} label="Evidence" value={stats.evidenceCount} color="success" />

        {/* Expand details toggle */}
        {(stats.topContributingTypes.length > 0 || stats.recentActivity.length > 0) && (
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="ml-auto flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Details
            <ChevronDown className={cn("h-3 w-3 transition-transform", detailsOpen && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Expandable details: type distribution + sparkline side by side */}
      {detailsOpen && (
        <div className="mt-3 flex flex-wrap gap-6 border-t border-border pt-3">
          {stats.topContributingTypes.length > 0 && (
            <TypeDistribution items={stats.topContributingTypes} />
          )}
          {stats.recentActivity.length > 0 && (
            <ActivitySparkline data={stats.recentActivity} />
          )}
        </div>
      )}
    </div>
  );
}
