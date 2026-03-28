"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import { UnitLifecycleBadge } from "~/components/domain/unit/unit-lifecycle-badge";
import { ComparisonDiffBadge } from "./comparison-diff-badge";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";
import type { DiffStatus, RelationDiff } from "~/hooks/use-comparison";

/* ─── Types ─── */

type PanelSide = "a" | "b";

interface ComparisonPanelProps {
  side: PanelSide;
  units: UnitCardUnit[];
  /** Which units are shared between both sides */
  shared: Set<string>;
  /** Which units are unique to this side */
  unique: Set<string>;
  /** Relation diffs for shared units */
  relationDiffs: Map<string, RelationDiff>;
  /** Currently highlighted unit (synced across panels) */
  highlightedId: string | null;
  /** Set highlighted unit */
  onHighlight: (id: string | null) => void;
  /** Click to select a unit */
  onClick?: (id: string) => void;
  className?: string;
}

/* ─── Helpers ─── */

function getDiffStatus(
  unitId: string,
  shared: Set<string>,
  unique: Set<string>,
  relationDiffs: Map<string, RelationDiff>,
): DiffStatus {
  if (unique.has(unitId)) return "unique-a"; // caller determines actual side label
  if (shared.has(unitId) && relationDiffs.has(unitId)) return "relation-diff";
  if (shared.has(unitId)) return "shared";
  return "shared";
}

/* ─── Comparison Item ─── */

function ComparisonItem({
  unit,
  side,
  diffStatus,
  relationDiff,
  isHighlighted,
  onHighlight,
  onClick,
}: {
  unit: UnitCardUnit;
  side: PanelSide;
  diffStatus: DiffStatus;
  relationDiff?: RelationDiff;
  isHighlighted: boolean;
  onHighlight: (id: string | null) => void;
  onClick?: (id: string) => void;
}) {
  // Remap diff status label for the actual side
  const displayStatus: DiffStatus =
    diffStatus === "unique-a"
      ? side === "a"
        ? "unique-a"
        : "unique-b"
      : diffStatus;

  const handleClick = React.useCallback(() => {
    if (diffStatus === "shared" || diffStatus === "relation-diff") {
      // Highlight counterpart in other panel
      onHighlight(unit.id);
    }
    onClick?.(unit.id);
  }, [diffStatus, unit.id, onHighlight, onClick]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const isUnique = displayStatus === "unique-a" || displayStatus === "unique-b";

  return (
    <motion.div
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        if (!isUnique) onHighlight(unit.id);
      }}
      onMouseLeave={() => onHighlight(null)}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-card border p-3",
        "cursor-pointer select-none",
        "transition-all duration-fast ease-default",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        "hover:shadow-hover",
        /* Diff-status background */
        displayStatus === "unique-a" && "bg-amber-500/[0.04] border-amber-500/20",
        displayStatus === "unique-b" && "bg-cyan-500/[0.04] border-cyan-500/20",
        displayStatus === "relation-diff" && "bg-purple-500/[0.04] border-purple-500/20",
        displayStatus === "shared" && "bg-bg-primary border-border",
        /* Highlighted state (synced highlight from other panel) */
        isHighlighted && "ring-2 ring-accent-primary ring-offset-1 shadow-hover",
      )}
      animate={isHighlighted ? { scale: 1.01 } : { scale: 1 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Top row: type + diff badge */}
      <div className="flex items-center gap-2">
        <UnitTypeBadge
          type={unit.primaryType}
          secondaryType={unit.secondaryType}
          size="sm"
        />
        <UnitLifecycleBadge lifecycle={unit.lifecycle} />
        <div className="ml-auto shrink-0">
          <ComparisonDiffBadge
            status={displayStatus}
            relationDiff={relationDiff}
          />
        </div>
      </div>

      {/* Content */}
      <p
        className={cn(
          "text-sm text-text-primary leading-relaxed line-clamp-3",
          unit.lifecycle === "draft" && "text-text-secondary italic",
        )}
      >
        {unit.content}
      </p>
    </motion.div>
  );
}

/* ─── Main Panel Component ─── */

export function ComparisonPanel({
  side,
  units,
  shared,
  unique,
  relationDiffs,
  highlightedId,
  onHighlight,
  onClick,
  className,
}: ComparisonPanelProps) {
  const uniqueCount = units.filter((u) => unique.has(u.id)).length;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Panel content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {units.map((unit) => {
            const diffStatus = getDiffStatus(unit.id, shared, unique, relationDiffs);
            return (
              <ComparisonItem
                key={unit.id}
                unit={unit}
                side={side}
                diffStatus={diffStatus}
                relationDiff={relationDiffs.get(unit.id)}
                isHighlighted={highlightedId === unit.id}
                onHighlight={onHighlight}
                onClick={onClick}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer: counts */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-xs text-text-tertiary tabular-nums shrink-0">
        <span>{units.length} unit{units.length !== 1 ? "s" : ""}</span>
        <span>
          {uniqueCount} unique
        </span>
      </div>
    </div>
  );
}

ComparisonPanel.displayName = "ComparisonPanel";
