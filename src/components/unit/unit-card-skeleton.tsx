"use client";

import { cn } from "~/lib/utils";

interface UnitCardSkeletonProps {
  variant?: "compact" | "standard" | "expanded";
  className?: string;
}

export function UnitCardSkeleton({
  variant = "standard",
  className,
}: UnitCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-bg-primary p-4",
        "border-l-4 border-l-border",
        className,
      )}
      role="article"
      aria-busy="true"
      aria-label="Loading thought unit"
    >
      <div className="animate-pulse space-y-3">
        {/* Type badge */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 rounded-full bg-bg-secondary" />
          {variant !== "compact" && (
            <div className="h-4 w-12 rounded bg-bg-secondary" />
          )}
        </div>

        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-bg-secondary" />
          {variant !== "compact" && (
            <>
              <div className="h-4 w-5/6 rounded bg-bg-secondary" />
              <div className="h-4 w-2/3 rounded bg-bg-secondary" />
            </>
          )}
        </div>

        {/* Metadata row (standard + expanded) */}
        {variant !== "compact" && (
          <div className="flex items-center gap-3 pt-1">
            <div className="h-3 w-16 rounded bg-bg-secondary" />
            <div className="h-3 w-12 rounded bg-bg-secondary" />
            <div className="h-3 w-10 rounded bg-bg-secondary" />
          </div>
        )}

        {/* Expanded extras */}
        {variant === "expanded" && (
          <>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="h-4 w-full rounded bg-bg-secondary" />
              <div className="h-4 w-4/5 rounded bg-bg-secondary" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-3 w-24 rounded bg-bg-secondary" />
              <div className="h-3 w-20 rounded bg-bg-secondary" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
