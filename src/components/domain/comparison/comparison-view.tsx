"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { useComparison } from "~/hooks/use-comparison";
import { Skeleton } from "~/components/shared/skeleton";
import { ComparisonToolbar } from "./comparison-toolbar";
import { ComparisonPanel } from "./comparison-panel";

/* ─── Types ─── */

interface ComparisonViewProps {
  /** Unit IDs for side A */
  sideAIds: string[];
  /** Unit IDs for side B */
  sideBIds: string[];
  /** Display label for side A (e.g. thread name, path, "Selection") */
  sideALabel?: string;
  /** Display label for side B */
  sideBLabel?: string;
  /** Close the comparison view */
  onClose: () => void;
  /** Click handler for a unit (e.g. open detail) */
  onUnitClick?: (id: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function ComparisonView({
  sideAIds,
  sideBIds,
  sideALabel = "Side A",
  sideBLabel = "Side B",
  onClose,
  onUnitClick,
  className,
}: ComparisonViewProps) {
  const {
    sideA,
    sideB,
    shared,
    uniqueA,
    uniqueB,
    relationDiffs,
    highlightedId,
    setHighlighted,
    isLoading,
    swap,
  } = useComparison(sideAIds, sideBIds);

  /* ─── Loading state ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <Skeleton height="40px" className="m-2" />
        <div className="flex flex-1 gap-px bg-border">
          <div className="flex-1 bg-bg-primary p-3 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="80px" />
            ))}
          </div>
          <div className="flex-1 bg-bg-primary p-3 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="80px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col h-full", className)}
      role="region"
      aria-label="Comparison view"
    >
      {/* Shared toolbar */}
      <ComparisonToolbar
        sideALabel={sideALabel}
        sideBLabel={sideBLabel}
        sharedCount={shared.size}
        uniqueACount={uniqueA.size}
        uniqueBCount={uniqueB.size}
        onSwap={swap}
        onClose={onClose}
      />

      {/* Split panels */}
      <div className="flex flex-1 min-h-0">
        {/* Side A */}
        <div className="flex-1 min-w-0 border-r border-border">
          <ComparisonPanel
            side="a"
            units={sideA}
            shared={shared}
            unique={uniqueA}
            relationDiffs={relationDiffs}
            highlightedId={highlightedId}
            onHighlight={setHighlighted}
            onClick={onUnitClick}
          />
        </div>

        {/* Side B */}
        <div className="flex-1 min-w-0">
          <ComparisonPanel
            side="b"
            units={sideB}
            shared={shared}
            unique={uniqueB}
            relationDiffs={relationDiffs}
            highlightedId={highlightedId}
            onHighlight={setHighlighted}
            onClick={onUnitClick}
          />
        </div>
      </div>
    </div>
  );
}

ComparisonView.displayName = "ComparisonView";
