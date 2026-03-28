"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import type { AssemblyItem } from "~/hooks/use-assembly-editor";

/* ─── Types ─── */

interface AssemblyDiffProps {
  leftTitle: string;
  rightTitle: string;
  leftItems: AssemblyItem[];
  rightItems: AssemblyItem[];
  className?: string;
}

type DiffStatus = "shared" | "unique" | "reordered";

interface DiffItem {
  item: AssemblyItem;
  status: DiffStatus;
  /** Position in the other assembly (if reordered) */
  otherPosition?: number;
}

/* ─── Diff Computation ─── */

function computeDiff(
  sourceItems: AssemblyItem[],
  compareItems: AssemblyItem[],
): DiffItem[] {
  const compareUnitIds = new Map(
    compareItems.map((item, index) => [item.unitId, index]),
  );

  return sourceItems.map((item) => {
    const otherIndex = compareUnitIds.get(item.unitId);

    if (otherIndex === undefined) {
      return { item, status: "unique" };
    }

    if (otherIndex !== item.position) {
      return { item, status: "reordered", otherPosition: otherIndex };
    }

    return { item, status: "shared" };
  });
}

/* ─── Status Colors ─── */

const STATUS_STYLES: Record<DiffStatus, { bg: string; border: string; label: string }> = {
  shared: {
    bg: "bg-accent-success/5",
    border: "border-accent-success/30",
    label: "Shared",
  },
  unique: {
    bg: "bg-accent-warning/5",
    border: "border-accent-warning/30",
    label: "Unique",
  },
  reordered: {
    bg: "bg-accent-primary/5",
    border: "border-accent-primary/30",
    label: "Reordered",
  },
};

/* ─── Diff Item Row ─── */

function DiffItemRow({ diffItem }: { diffItem: DiffItem }) {
  const { item, status, otherPosition } = diffItem;
  const styles = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5",
        styles.bg,
        styles.border,
        "transition-colors duration-fast",
      )}
    >
      {/* Position */}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          "bg-bg-secondary text-text-tertiary text-[10px] font-medium",
        )}
      >
        {item.position + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <UnitTypeBadge type={item.unit.primaryType} size="sm" />
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              status === "shared" && "bg-accent-success/10 text-accent-success",
              status === "unique" && "bg-accent-warning/10 text-accent-warning",
              status === "reordered" && "bg-accent-primary/10 text-accent-primary",
            )}
          >
            {styles.label}
            {status === "reordered" && otherPosition !== undefined && (
              <span className="ml-1 opacity-70">
                (#{otherPosition + 1} in other)
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-text-primary leading-relaxed line-clamp-2">
          {item.unit.content}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function AssemblyDiff({
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
  className,
}: AssemblyDiffProps) {
  const leftDiff = React.useMemo(
    () => computeDiff(leftItems, rightItems),
    [leftItems, rightItems],
  );
  const rightDiff = React.useMemo(
    () => computeDiff(rightItems, leftItems),
    [rightItems, leftItems],
  );

  /* Summary stats */
  const sharedCount = leftDiff.filter((d) => d.status === "shared").length;
  const leftUnique = leftDiff.filter((d) => d.status === "unique").length;
  const rightUnique = rightDiff.filter((d) => d.status === "unique").length;
  const reorderedCount = leftDiff.filter((d) => d.status === "reordered").length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Summary bar */}
      <div
        className={cn(
          "flex items-center justify-center gap-4 rounded-lg border border-border",
          "bg-bg-surface px-4 py-2",
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-success" aria-hidden="true" />
          <span className="text-text-secondary">{sharedCount} shared</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-warning" aria-hidden="true" />
          <span className="text-text-secondary">
            {leftUnique + rightUnique} unique
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-primary" aria-hidden="true" />
          <span className="text-text-secondary">{reorderedCount} reordered</span>
        </span>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left */}
        <div className="flex flex-col rounded-lg border border-border overflow-hidden">
          <div className="bg-bg-secondary px-3 py-2 border-b border-border">
            <h4 className="text-xs font-semibold text-text-primary truncate">
              {leftTitle}
            </h4>
            <span className="text-[10px] text-text-tertiary">
              {leftItems.length} items
            </span>
          </div>
          <ScrollArea className="flex-1 max-h-[500px]">
            <div className="p-2 space-y-1.5">
              {leftDiff.map((diffItem) => (
                <DiffItemRow key={diffItem.item.id} diffItem={diffItem} />
              ))}
              {leftDiff.length === 0 && (
                <p className="text-xs text-text-tertiary text-center py-6">
                  No items
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right */}
        <div className="flex flex-col rounded-lg border border-border overflow-hidden">
          <div className="bg-bg-secondary px-3 py-2 border-b border-border">
            <h4 className="text-xs font-semibold text-text-primary truncate">
              {rightTitle}
            </h4>
            <span className="text-[10px] text-text-tertiary">
              {rightItems.length} items
            </span>
          </div>
          <ScrollArea className="flex-1 max-h-[500px]">
            <div className="p-2 space-y-1.5">
              {rightDiff.map((diffItem) => (
                <DiffItemRow key={diffItem.item.id} diffItem={diffItem} />
              ))}
              {rightDiff.length === 0 && (
                <p className="text-xs text-text-tertiary text-center py-6">
                  No items
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

AssemblyDiff.displayName = "AssemblyDiff";
