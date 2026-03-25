"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UnitCard, type UnitCardUnit, type UnitCardProps } from "./unit-card";

// ─── Types ───────────────────────────────────────────────────────────

export interface UnitCardListProps {
  units: UnitCardUnit[];
  /** Container height in px. Defaults to filling available space via CSS. */
  height?: number;
  /** Estimated row height in px used by the virtualizer for initial sizing. Default: 120. */
  estimatedRowHeight?: number;
  /** Gap between cards in px. Default: 12. */
  gap?: number;
  /** Passed through to each UnitCard */
  selectedUnitIds?: Set<string>;
  onUnitClick?: (unit: UnitCardUnit, event?: React.MouseEvent) => void;
  onLifecycleAction?: UnitCardProps["onLifecycleAction"];
  getOnRemoveFromContext?: (unit: UnitCardUnit) => (() => void) | undefined;
  getOnDelete?: (unit: UnitCardUnit) => (() => void) | undefined;
  projectId?: string;
  /** aria-label for the scroll container */
  listLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────

/**
 * Virtualized unit card list using @tanstack/react-virtual.
 *
 * Renders only the cards currently in the viewport, keeping the DOM lean
 * even when a project contains hundreds of units.
 *
 * Dynamic heights: each row is measured after mount via the
 * `measureElement` API — the virtualizer refines estimates automatically.
 */
export function UnitCardList({
  units,
  height,
  estimatedRowHeight = 120,
  gap = 12,
  selectedUnitIds,
  onUnitClick,
  onLifecycleAction,
  getOnRemoveFromContext,
  getOnDelete,
  projectId,
  listLabel = "Unit list",
}: UnitCardListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: units.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    // Overscan: keep extra rows rendered above/below viewport for smoother scroll
    overscan: 5,
    // Gap between items (measured as part of item height)
    gap,
    // Use dynamic measurement after initial paint
    measureElement:
      typeof window !== "undefined"
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label={listLabel}
      style={{
        height: height ?? "clamp(300px, calc(100vh - 16rem), calc(100vh - 8rem))",
        overflowY: "auto",
        contain: "content",
      }}
    >
      {/* Spacer div that occupies the full virtual height */}
      <div
        style={{
          height: totalSize,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const unit = units[virtualRow.index];
          if (!unit) return null;

          return (
            <div
              key={unit.id}
              data-index={virtualRow.index}
              // ref callback lets the virtualizer measure the real DOM height
              ref={virtualizer.measureElement}
              role="listitem"
              id={`unit-${unit.id}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={(e) => onUnitClick?.(unit, e)}
            >
              <UnitCard
                unit={unit}
                selected={selectedUnitIds?.has(unit.id) ?? false}
                onClick={() => {
                  /* handled by parent div for event access */
                }}
                onLifecycleAction={onLifecycleAction}
                projectId={projectId}
                onRemoveFromContext={getOnRemoveFromContext?.(unit)}
                onDelete={getOnDelete?.(unit)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
