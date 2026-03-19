"use client";

import { useRouter } from "next/navigation";
import { Boxes, HelpCircle, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";

export interface ContextSummaryData {
  id: string;
  name: string;
  description: string | null;
  parentName: string | null;
  unitCount: number;
  unresolvedQuestionCount: number;
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
        {/* Completeness Compass placeholder */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border"
          aria-label="Completeness: not yet calculated"
          title="Completeness compass (coming soon)"
        >
          <span className="text-[10px] text-text-tertiary">0%</span>
        </div>
      </div>

      {/* Description */}
      {context.description && (
        <p className="line-clamp-2 text-sm text-text-secondary">
          {context.description}
        </p>
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
