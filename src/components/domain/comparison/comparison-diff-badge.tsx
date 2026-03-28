"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { DiffStatus, RelationDiff } from "~/hooks/use-comparison";

/* ─── Types ─── */

interface ComparisonDiffBadgeProps {
  status: DiffStatus;
  /** Required when status is "relation-diff" */
  relationDiff?: RelationDiff;
  className?: string;
}

/* ─── Config ─── */

const DIFF_CONFIG: Record<
  DiffStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  "unique-a": {
    label: "Only in A",
    bgClass: "bg-amber-500/12",
    textClass: "text-amber-500",
  },
  "unique-b": {
    label: "Only in B",
    bgClass: "bg-cyan-500/12",
    textClass: "text-cyan-500",
  },
  shared: {
    label: "Shared",
    bgClass: "bg-accent-success/12",
    textClass: "text-accent-success",
  },
  "relation-diff": {
    label: "Relation diff",
    bgClass: "bg-purple-500/12",
    textClass: "text-purple-500",
  },
};

/* ─── Component ─── */

export function ComparisonDiffBadge({
  status,
  relationDiff,
  className,
}: ComparisonDiffBadgeProps) {
  const config = DIFF_CONFIG[status];

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5",
        "text-[10px] font-medium leading-tight",
        config.bgClass,
        config.textClass,
        className,
      )}
      aria-label={config.label}
    >
      {config.label}
    </span>
  );

  // For relation-diff, show tooltip with delta details
  if (status === "relation-diff" && relationDiff) {
    const tooltipLines: string[] = [];
    if (relationDiff.onlyA.length > 0) {
      tooltipLines.push(
        `Side A: ${relationDiff.onlyA.map((r) => r.type).join(", ")}`,
      );
    }
    if (relationDiff.onlyB.length > 0) {
      tooltipLines.push(
        `Side B: ${relationDiff.onlyB.map((r) => r.type).join(", ")}`,
      );
    }

    return (
      <SimpleTooltip
        content={
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium">Relation differences:</span>
            {tooltipLines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        }
        side="top"
      >
        {badge}
      </SimpleTooltip>
    );
  }

  return badge;
}

ComparisonDiffBadge.displayName = "ComparisonDiffBadge";
