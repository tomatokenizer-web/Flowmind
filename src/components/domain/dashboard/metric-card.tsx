"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { SparkLine } from "./spark-line";

/* ─── Types ─── */

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Metric label */
  label: string;
  /** Main display value */
  value: string | number;
  /** Optional accent color (CSS color value) */
  accent?: string;
  /** Trend direction and percentage */
  trend?: {
    direction: "up" | "down";
    percentage: number;
    /** Whether up is good (green) or bad (red) */
    positiveDirection?: "up" | "down";
  };
  /** Optional sub-label text */
  subLabel?: string;
  /** Optional progress bar (0-1) */
  progress?: number;
  /** Optional sparkline data */
  sparkData?: number[];
  /** Click handler for navigation */
  onNavigate?: () => void;
}

/* ─── Component ─── */

export function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  subLabel,
  progress,
  sparkData,
  onNavigate,
  className,
  ...props
}: MetricCardProps) {
  const isClickable = !!onNavigate;

  const trendColor = React.useMemo(() => {
    if (!trend) return undefined;
    const positiveDir = trend.positiveDirection ?? "up";
    const isPositive = trend.direction === positiveDir;
    return isPositive ? "var(--accent-success)" : "var(--accent-error)";
  }, [trend]);

  const TrendIcon = trend?.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <motion.div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onNavigate}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter") onNavigate?.();
            }
          : undefined
      }
      className={cn(
        "relative flex flex-col gap-2 rounded-card border border-border p-4",
        "bg-bg-surface overflow-hidden",
        "transition-all duration-fast",
        isClickable && [
          "cursor-pointer",
          "hover:shadow-hover hover:border-border-focus/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        ],
        className,
      )}
      whileHover={isClickable ? { y: -1 } : undefined}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      aria-label={`${label}: ${value}`}
      {...(props as Record<string, unknown>)}
    >
      {/* Subtle background tint */}
      {accent && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Top row: icon + sparkline */}
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{
            backgroundColor: accent ? `${accent}18` : "var(--bg-secondary)",
            color: accent ?? "var(--text-secondary)",
          }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        {sparkData && sparkData.length >= 2 && (
          <SparkLine
            data={sparkData}
            color={accent ?? undefined}
            width={64}
            height={20}
          />
        )}
      </div>

      {/* Value + trend */}
      <div className="relative flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-text-primary leading-none tabular-nums">
          {value}
        </span>

        {trend && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            style={{ color: trendColor }}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {trend.percentage.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Label + sub-label */}
      <div className="relative flex flex-col">
        <span className="text-xs text-text-tertiary">{label}</span>
        {subLabel && (
          <span className="text-[10px] text-text-tertiary mt-0.5">{subLabel}</span>
        )}
      </div>

      {/* Optional progress bar */}
      {progress !== undefined && (
        <div
          className="relative h-1 w-full rounded-full bg-bg-secondary overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-fast"
            style={{
              width: `${Math.min(100, progress * 100)}%`,
              backgroundColor: accent ?? "var(--accent-primary)",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

MetricCard.displayName = "MetricCard";
