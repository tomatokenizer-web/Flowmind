"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Loader2, Flame, Minus, Snowflake, HelpCircle } from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface EnergyCell {
  id: string;
  content: string;
  unitType: string;
  energyLevel: "high" | "neutral" | "low" | null;
  importance: number;
  contentLength: number;
  lifecycle: string;
}

interface EnergyStats {
  total: number;
  high: number;
  neutral: number;
  low: number;
  unset: number;
  highPct: number;
  neutralPct: number;
  lowPct: number;
  unsetPct: number;
}

interface EnergyHeatmapProps {
  contextId: string;
  onNavigateToUnit?: (unitId: string) => void;
  className?: string;
}

// ─── Color Helpers ───────────────────────────────────────────────────

function getEnergyColor(level: "high" | "neutral" | "low" | null): string {
  switch (level) {
    case "high":
      return "bg-orange-500/80 hover:bg-orange-500 border-orange-600";
    case "neutral":
      return "bg-yellow-500/60 hover:bg-yellow-500/80 border-yellow-600";
    case "low":
      return "bg-blue-500/60 hover:bg-blue-500/80 border-blue-600";
    default:
      return "bg-gray-500/30 hover:bg-gray-500/50 border-gray-600";
  }
}

function getEnergyLabel(level: "high" | "neutral" | "low" | null): string {
  switch (level) {
    case "high":
      return "High Energy";
    case "neutral":
      return "Neutral";
    case "low":
      return "Low Energy";
    default:
      return "Not Set";
  }
}

function getEnergyIcon(level: "high" | "neutral" | "low" | null) {
  switch (level) {
    case "high":
      return <Flame className="h-3 w-3" aria-hidden="true" />;
    case "neutral":
      return <Minus className="h-3 w-3" aria-hidden="true" />;
    case "low":
      return <Snowflake className="h-3 w-3" aria-hidden="true" />;
    default:
      return <HelpCircle className="h-3 w-3" aria-hidden="true" />;
  }
}

// ─── Cell Size ───────────────────────────────────────────────────────

/**
 * Compute a relative size factor for each cell based on content length
 * and importance. Returns a value between 1 and 3 to scale grid span.
 */
function getCellSize(cell: EnergyCell): number {
  const lengthFactor = Math.min(cell.contentLength / 200, 1);
  const importanceFactor = cell.importance;
  const combined = lengthFactor * 0.6 + importanceFactor * 0.4;
  if (combined > 0.7) return 3;
  if (combined > 0.35) return 2;
  return 1;
}

// ─── Component ───────────────────────────────────────────────────────

export function EnergyHeatmap({
  contextId,
  onNavigateToUnit,
  className,
}: EnergyHeatmapProps) {
  const [hoveredCell, setHoveredCell] = React.useState<string | null>(null);

  const { data, isLoading, error } = api.feedback.getEnergyDistribution.useQuery(
    { contextId },
    { enabled: !!contextId },
  );

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">Loading energy heatmap</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-text-secondary text-sm", className)}>
        Failed to load energy data.
      </div>
    );
  }

  if (!data || data.cells.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-text-secondary">No units in this context yet.</p>
      </div>
    );
  }

  const { cells, stats } = data;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Legend */}
      <Legend />

      {/* Heatmap Grid */}
      <div
        className="grid grid-cols-6 gap-1.5 auto-rows-auto"
        role="grid"
        aria-label="Energy distribution heatmap"
      >
        {cells.map((cell) => {
          const size = getCellSize(cell);
          const isHovered = hoveredCell === cell.id;

          return (
            <button
              key={cell.id}
              role="gridcell"
              className={cn(
                "relative rounded-md border p-2 text-left transition-all duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                getEnergyColor(cell.energyLevel),
                size === 3 && "col-span-2 row-span-2",
                size === 2 && "col-span-2",
                isHovered && "ring-2 ring-white/50 z-10 scale-[1.02]",
              )}
              style={{ minHeight: size === 3 ? "5rem" : size === 2 ? "3.5rem" : "3rem" }}
              onClick={() => onNavigateToUnit?.(cell.id)}
              onMouseEnter={() => setHoveredCell(cell.id)}
              onMouseLeave={() => setHoveredCell(null)}
              onFocus={() => setHoveredCell(cell.id)}
              onBlur={() => setHoveredCell(null)}
              aria-label={`${cell.unitType} unit: ${cell.content}. Energy: ${getEnergyLabel(cell.energyLevel)}`}
            >
              <div className="flex items-start gap-1">
                {getEnergyIcon(cell.energyLevel)}
                <span className="text-[10px] font-medium uppercase text-white/80 leading-none">
                  {cell.unitType}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/90 line-clamp-2 leading-snug">
                {cell.content}
              </p>

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-56
                             rounded-lg border border-border bg-bg-primary p-2 shadow-lg pointer-events-none"
                  role="tooltip"
                >
                  <p className="text-xs font-medium text-text-primary mb-1">
                    {cell.content}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                    <span className="capitalize">{cell.unitType}</span>
                    <span>|</span>
                    <span>{getEnergyLabel(cell.energyLevel)}</span>
                    <span>|</span>
                    <span>{cell.lifecycle}</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: EnergyStats }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{stats.total} units total</span>
      </div>

      {/* Distribution Bar */}
      <div
        className="flex h-3 rounded-full overflow-hidden border border-border"
        role="img"
        aria-label={`Energy distribution: ${stats.highPct}% high, ${stats.neutralPct}% neutral, ${stats.lowPct}% low, ${stats.unsetPct}% unset`}
      >
        {stats.highPct > 0 && (
          <div
            className="bg-orange-500 transition-all"
            style={{ width: `${stats.highPct}%` }}
            title={`High: ${stats.high} (${stats.highPct}%)`}
          />
        )}
        {stats.neutralPct > 0 && (
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${stats.neutralPct}%` }}
            title={`Neutral: ${stats.neutral} (${stats.neutralPct}%)`}
          />
        )}
        {stats.lowPct > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${stats.lowPct}%` }}
            title={`Low: ${stats.low} (${stats.lowPct}%)`}
          />
        )}
        {stats.unsetPct > 0 && (
          <div
            className="bg-gray-500/40 transition-all"
            style={{ width: `${stats.unsetPct}%` }}
            title={`Unset: ${stats.unset} (${stats.unsetPct}%)`}
          />
        )}
      </div>

      {/* Numeric breakdown */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <StatItem
          label="High"
          count={stats.high}
          pct={stats.highPct}
          color="text-orange-400"
          icon={<Flame className="h-3 w-3" />}
        />
        <StatItem
          label="Neutral"
          count={stats.neutral}
          pct={stats.neutralPct}
          color="text-yellow-400"
          icon={<Minus className="h-3 w-3" />}
        />
        <StatItem
          label="Low"
          count={stats.low}
          pct={stats.lowPct}
          color="text-blue-400"
          icon={<Snowflake className="h-3 w-3" />}
        />
        <StatItem
          label="Unset"
          count={stats.unset}
          pct={stats.unsetPct}
          color="text-gray-400"
          icon={<HelpCircle className="h-3 w-3" />}
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  count,
  pct,
  color,
  icon,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={cn("flex items-center gap-1", color)}>
        {icon}
        <span className="text-sm font-semibold">{count}</span>
      </div>
      <span className="text-[10px] text-text-secondary">
        {label} ({pct}%)
      </span>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { level: "high" as const, label: "High Energy", desc: "Exciting, motivating ideas" },
    { level: "neutral" as const, label: "Neutral", desc: "Stable, balanced thoughts" },
    { level: "low" as const, label: "Low Energy", desc: "Draining or tedious topics" },
    { level: null, label: "Unset", desc: "No energy level assigned" },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-3 w-3 rounded-sm border",
              getEnergyColor(item.level),
            )}
            aria-hidden="true"
          />
          <span className="text-text-secondary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
