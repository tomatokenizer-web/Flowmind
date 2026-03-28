"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import { UnitLifecycleBadge } from "~/components/domain/unit/unit-lifecycle-badge";
import { ThreadRelationSidebar } from "./thread-relation-sidebar";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

interface ThreadItemProps {
  unit: UnitCardUnit;
  /** Whether this item is the active/focused unit */
  isActive?: boolean;
  /** Number of cross-thread relations for this unit */
  crossRelationCount: number;
  /** Set of all unit IDs in the current thread */
  threadUnitIds: Set<string>;
  /** Click handler — select the unit */
  onClick?: (id: string) => void;
  /** Double-click handler — open editor */
  onDoubleClick?: (id: string) => void;
  /** Navigate to a related unit */
  onNavigateToUnit?: (unitId: string) => void;
  /** Open unit in graph view */
  onOpenInGraph?: (unitId: string) => void;
  className?: string;
}

/* ─── Helpers ─── */

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── Component ─── */

export const ThreadItem = React.forwardRef<HTMLDivElement, ThreadItemProps>(
  (
    {
      unit,
      isActive = false,
      crossRelationCount,
      threadUnitIds,
      onClick,
      onDoubleClick,
      onNavigateToUnit,
      onOpenInGraph,
      className,
    },
    ref,
  ) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onClick?.(unit.id);
        }
      },
      [onClick, unit.id],
    );

    const handleClick = React.useCallback(() => {
      onClick?.(unit.id);
    }, [onClick, unit.id]);

    const handleDoubleClick = React.useCallback(() => {
      onDoubleClick?.(unit.id);
    }, [onDoubleClick, unit.id]);

    return (
      <motion.div
        ref={ref}
        role="article"
        tabIndex={0}
        aria-label={`Thread item: ${unit.content.slice(0, 60)}`}
        aria-current={isActive ? "true" : undefined}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group/thread-item relative flex gap-3 rounded-card border p-3",
          "bg-bg-primary cursor-pointer select-none",
          "transition-all duration-fast ease-default",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          "hover:shadow-hover hover:border-border-focus/30",
          /* Active state */
          isActive
            ? "border-accent-primary bg-accent-primary/[0.03] shadow-hover"
            : "border-border",
          /* Archived dimming */
          unit.isArchived && "opacity-50",
          className,
        )}
        initial={false}
        animate={isActive ? { x: 2 } : { x: 0 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Left: active indicator bar */}
        {isActive && (
          <div
            className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-accent-primary"
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top row: type badge + lifecycle + timestamp */}
          <div className="flex items-center gap-2 mb-1.5">
            <UnitTypeBadge
              type={unit.primaryType}
              secondaryType={unit.secondaryType}
              size="sm"
            />
            <UnitLifecycleBadge lifecycle={unit.lifecycle} />
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-text-tertiary shrink-0">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <time dateTime={new Date(unit.createdAt).toISOString()}>
                {formatTimestamp(unit.createdAt)}
              </time>
            </span>
          </div>

          {/* Content preview */}
          <p
            className={cn(
              "text-sm text-text-primary leading-relaxed line-clamp-3",
              unit.lifecycle === "draft" && "text-text-secondary italic",
            )}
          >
            {unit.content}
          </p>

          {/* Tags row */}
          {(unit.tags ?? []).length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
              {(unit.tags ?? []).slice(0, 3).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-bg-secondary text-text-tertiary"
                >
                  {tag.name}
                </span>
              ))}
              {(unit.tags ?? []).length > 3 && (
                <span className="text-[10px] text-text-tertiary shrink-0">
                  +{(unit.tags ?? []).length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: cross-thread relation badge */}
        <div className="flex flex-col items-end justify-start shrink-0">
          <ThreadRelationSidebar
            unitId={unit.id}
            threadUnitIds={threadUnitIds}
            crossRelationCount={crossRelationCount}
            onNavigateToUnit={onNavigateToUnit}
            onOpenInGraph={onOpenInGraph}
          />
        </div>
      </motion.div>
    );
  },
);

ThreadItem.displayName = "ThreadItem";
