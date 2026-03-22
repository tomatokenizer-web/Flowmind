"use client";

import { Boxes, HelpCircle, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import type { UnitTypeCounts } from "~/server/services/dashboardService";

export interface ContextSummaryData {
  id: string;
  name: string;
  description: string | null;
  parentName: string | null;
  unitCount: number;
  unresolvedQuestionCount: number;
  unitTypeCounts: UnitTypeCounts;
  updatedAt: Date;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Completeness Compass ─────────────────────────────────────────────
//
// Completeness is calculated as:
//   1 point for each dimension that has at least one unit
//   Dimensions: claim, evidence, counterargument, question, assumption
//   Score = (dimensions covered / total dimensions) * 100

const COMPASS_DIMENSIONS: Array<{
  key: keyof UnitTypeCounts;
  label: string;
  color: string;
}> = [
  { key: "claim", label: "Claims", color: "bg-accent-primary" },
  { key: "evidence", label: "Evidence", color: "bg-lifecycle-confirmed-text" },
  {
    key: "counterargument",
    label: "Counter\u2011args",
    color: "bg-accent-danger",
  },
  { key: "question", label: "Questions", color: "bg-accent-warning" },
  { key: "assumption", label: "Assumptions", color: "bg-text-tertiary" },
];

function calculateCompleteness(counts: UnitTypeCounts): number {
  const covered = COMPASS_DIMENSIONS.filter((d) => counts[d.key] > 0).length;
  return Math.round((covered / COMPASS_DIMENSIONS.length) * 100);
}

interface CompletenessCompassProps {
  counts: UnitTypeCounts;
  totalUnits: number;
}

function CompletenessCompass({ counts, totalUnits }: CompletenessCompassProps) {
  const pct = calculateCompleteness(counts);

  // Ring color based on completeness
  const ringColor =
    pct === 0
      ? "border-border"
      : pct < 40
        ? "border-accent-danger"
        : pct < 80
          ? "border-accent-warning"
          : "border-lifecycle-confirmed-text";

  const label =
    totalUnits === 0
      ? "No units yet"
      : `Completeness: ${pct}% — ${COMPASS_DIMENSIONS.filter((d) => counts[d.key] > 0)
          .map((d) => d.label)
          .join(", ")} covered`;

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
        ringColor,
      )}
      aria-label={label}
      title={label}
    >
      <span className="text-[10px] font-medium text-text-secondary">
        {pct}%
      </span>
    </div>
  );
}

// ─── Compass Detail Bar ───────────────────────────────────────────────

interface CompassDetailProps {
  counts: UnitTypeCounts;
  totalUnits: number;
}

function CompassDetail({ counts, totalUnits }: CompassDetailProps) {
  if (totalUnits === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {COMPASS_DIMENSIONS.map((dim) => {
        const count = counts[dim.key];
        const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0;
        const hasCoverage = count > 0;

        return (
          <div key={dim.key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] text-text-tertiary">
              {dim.label}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  hasCoverage ? dim.color : "bg-bg-hover",
                )}
                style={{ width: hasCoverage ? `${Math.max(pct, 4)}%` : "4%" }}
                aria-label={`${dim.label}: ${count}`}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[10px] text-text-tertiary">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────

interface ContextSummaryCardProps {
  context: ContextSummaryData;
}

export function ContextSummaryCard({ context }: ContextSummaryCardProps) {
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full flex-col gap-3 rounded-xl border border-border bg-white p-4 text-left",
        "shadow-resting transition-all duration-150 ease-default",
        "hover:-translate-y-px hover:shadow-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        "motion-reduce:transform-none motion-reduce:transition-none",
      )}
      onClick={() => {
        setActiveContext(context.id);
        setViewMode("canvas"); // switch to main view
      }}
      aria-label={`Open context: ${context.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-text-primary">
            {context.name}
          </h3>
          {context.parentName && (
            <p className="mt-0.5 truncate text-xs text-text-tertiary">
              in {context.parentName}
            </p>
          )}
        </div>
        <CompletenessCompass
          counts={context.unitTypeCounts}
          totalUnits={context.unitCount}
        />
      </div>

      {/* Description */}
      {context.description && (
        <p className="line-clamp-2 text-sm text-text-secondary">
          {context.description}
        </p>
      )}

      {/* Completeness detail — shown when there are units */}
      {context.unitCount > 0 && (
        <CompassDetail
          counts={context.unitTypeCounts}
          totalUnits={context.unitCount}
        />
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1">
          <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
          {context.unitCount} {context.unitCount === 1 ? "unit" : "units"}
        </span>
        {context.unresolvedQuestionCount > 0 && (
          <span className="inline-flex items-center gap-1 text-accent-warning">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {context.unresolvedQuestionCount} open
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-text-tertiary">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatRelativeTime(context.updatedAt)}
        </span>
      </div>
    </button>
  );
}
