"use client";

import * as React from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/* ─── Types ─── */

interface ComparisonToolbarProps {
  sideALabel: string;
  sideBLabel: string;
  sharedCount: number;
  uniqueACount: number;
  uniqueBCount: number;
  onSwap: () => void;
  onClose: () => void;
  className?: string;
}

/* ─── Component ─── */

export function ComparisonToolbar({
  sideALabel,
  sideBLabel,
  sharedCount,
  uniqueACount,
  uniqueBCount,
  onSwap,
  onClose,
  className,
}: ComparisonToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 border-b border-border bg-bg-primary shrink-0",
        className,
      )}
      role="toolbar"
      aria-label="Comparison toolbar"
    >
      {/* Side A label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-text-primary truncate max-w-[140px]">
          {sideALabel}
        </span>
      </div>

      {/* Swap button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0"
        onClick={onSwap}
        aria-label="Swap sides"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </Button>

      {/* Side B label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="h-2 w-2 rounded-full bg-cyan-500 shrink-0"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-text-primary truncate max-w-[140px]">
          {sideBLabel}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-text-tertiary tabular-nums shrink-0">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-success" aria-hidden="true" />
          {sharedCount} shared
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          {uniqueACount} unique to A
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
          {uniqueBCount} unique to B
        </span>
      </div>

      {/* Close */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0"
        onClick={onClose}
        aria-label="Close comparison"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

ComparisonToolbar.displayName = "ComparisonToolbar";
