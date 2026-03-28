"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Unlink,
  AlertTriangle,
  HelpCircle,
  Swords,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";

/* ─── Types ─── */

interface HealthMetric {
  label: string;
  description: string;
  count: number;
  icon: React.ElementType;
  accent: string;
  actionLabel: string;
}

interface HealthOverviewProps {
  orphanCount: number;
  unsupportedClaimsCount: number;
  openQuestionsCount: number;
  contradictionsCount: number;
  /** Navigate to a filtered search for the metric */
  onNavigate?: (filter: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function HealthOverview({
  orphanCount,
  unsupportedClaimsCount,
  openQuestionsCount,
  contradictionsCount,
  onNavigate,
  className,
}: HealthOverviewProps) {
  const metrics: HealthMetric[] = [
    {
      label: "Orphan Units",
      description: "Units with no connections",
      count: orphanCount,
      icon: Unlink,
      accent: "var(--accent-warning)",
      actionLabel: "Fix",
    },
    {
      label: "Unsupported Claims",
      description: "Claims without evidence",
      count: unsupportedClaimsCount,
      icon: AlertTriangle,
      accent: "var(--accent-error)",
      actionLabel: "Review",
    },
    {
      label: "Open Questions",
      description: "Questions without answers",
      count: openQuestionsCount,
      icon: HelpCircle,
      accent: "var(--info)",
      actionLabel: "Explore",
    },
    {
      label: "Contradictions",
      description: "Confirmed conflicting units",
      count: contradictionsCount,
      icon: Swords,
      accent: "var(--accent-error)",
      actionLabel: "Resolve",
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const hasIssues = metric.count > 0;
        const filterQuery =
          metric.label === "Orphan Units"
            ? "is:orphan"
            : metric.label === "Unsupported Claims"
              ? "type:claim has:unsupported"
              : metric.label === "Open Questions"
                ? "type:question status:pending"
                : "has:contradicts status:confirmed";

        return (
          <motion.button
            key={metric.label}
            onClick={() => onNavigate?.(filterQuery)}
            disabled={!onNavigate}
            className={cn(
              "group/health flex items-start gap-3 rounded-card border p-3 text-left",
              "bg-bg-surface",
              "transition-all duration-fast",
              hasIssues ? "border-border" : "border-border/50 opacity-60",
              onNavigate && [
                "cursor-pointer",
                "hover:shadow-hover hover:border-border-focus/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
              ],
              !onNavigate && "cursor-default",
            )}
            whileHover={onNavigate ? { y: -1 } : undefined}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            aria-label={`${metric.label}: ${metric.count}. ${metric.actionLabel}`}
          >
            {/* Icon */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{
                backgroundColor: hasIssues ? `${metric.accent}18` : "var(--bg-secondary)",
                color: hasIssues ? metric.accent : "var(--text-tertiary)",
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-text-primary leading-none tabular-nums">
                  {metric.count}
                </span>
                <span className="text-xs text-text-tertiary">{metric.label}</span>
              </div>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                {metric.description}
              </p>
            </div>

            {/* Action indicator */}
            {hasIssues && onNavigate && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium shrink-0 mt-0.5",
                  "opacity-0 group-hover/health:opacity-100 transition-opacity duration-fast",
                )}
                style={{ color: metric.accent }}
              >
                {metric.actionLabel}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

HealthOverview.displayName = "HealthOverview";
