"use client";

import * as React from "react";
import { GitMerge, HelpCircle, Layers, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

// ─── Props ────────────────────────────────────────────────────────

interface ContextStatsPanelProps {
  contextId: string;
  className?: string;
}

// ─── Stat card ────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg-secondary px-3 py-2.5 min-w-[80px]">
      <div className={cn("flex items-center gap-1.5 text-xs", colorMap[color])}>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-semibold leading-tight text-text-primary tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-tertiary">{sub}</div>}
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
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-text-secondary">Unit types</p>
      <div className="flex flex-col gap-1">
        {items.map(({ type, pct }) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-20 truncate text-[10px] capitalize text-text-tertiary">{type}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: TYPE_COLORS[type] ?? "#6B7280",
                }}
              />
            </div>
            <span className="w-7 text-right text-[10px] tabular-nums text-text-tertiary">{pct}%</span>
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
  const W = 120;
  const H = 28;
  const step = W / (data.length - 1);

  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = H - (d.unitCount / max) * (H - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-text-secondary">Activity (7 days)</p>
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
            r={d.unitCount > 0 ? 2.5 : 1.5}
            fill={d.unitCount > 0 ? "var(--color-accent-primary, #3B82F6)" : "var(--color-text-tertiary, #6B7280)"}
          >
            <title>{`${d.date}: ${d.unitCount} units`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-text-tertiary">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── Context Stats Panel ──────────────────────────────────────────

export function ContextStatsPanel({ contextId, className }: ContextStatsPanelProps) {
  const { data: stats, isLoading } = api.context.getContextStats.useQuery(
    { contextId },
    { staleTime: 30_000 },
  );

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-bg-primary p-4", className)}>
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-bg-secondary" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 w-20 animate-pulse rounded-lg bg-bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      className={cn("rounded-xl border border-border bg-bg-primary p-4 shadow-resting", className)}
      role="region"
      aria-label="Context analytics"
    >
      <h3 className="mb-3 text-sm font-medium text-text-primary">Analytics</h3>

      {/* Key metric cards */}
      <div className="mb-4 flex flex-wrap gap-2">
        <StatCard icon={Layers} label="Units" value={stats.unitCount} color="primary" />
        <StatCard icon={MessageSquare} label="Claims" value={stats.claimCount} color="default" />
        <StatCard icon={HelpCircle} label="Questions" value={stats.questionCount} color="warning" />
        <StatCard
          icon={GitMerge}
          label="Relations"
          value={stats.relationCount}
          sub={`~${stats.avgRelationsPerUnit} per unit`}
          color="info"
        />
        <StatCard icon={TrendingUp} label="Evidence" value={stats.evidenceCount} color="success" />
      </div>

      {/* Type distribution + sparkline */}
      <div className="flex flex-wrap gap-6">
        {stats.topContributingTypes.length > 0 && (
          <TypeDistribution items={stats.topContributingTypes} />
        )}
        {stats.recentActivity.length > 0 && (
          <ActivitySparkline data={stats.recentActivity} />
        )}
      </div>
    </div>
  );
}
