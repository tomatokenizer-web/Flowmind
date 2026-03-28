"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { Bookmark } from "~/hooks/use-flow-reading";

/* ─── Types ─── */

interface FlowProgressProps {
  /** 0 to 1 */
  progress: number;
  totalCards: number;
  currentCardIndex: number;
  bookmarks: Bookmark[];
  onJumpToCard: (index: number) => void;
  className?: string;
}

/* ─── Component ─── */

export function FlowProgress({
  progress,
  totalCards,
  currentCardIndex,
  bookmarks,
  onJumpToCard,
  className,
}: FlowProgressProps) {
  if (totalCards === 0) return null;

  const segments = Array.from({ length: totalCards }, (_, i) => i);
  const bookmarkIndices = new Set(bookmarks.map((b) => b.cardIndex));

  return (
    <div
      className={cn("relative px-4 pt-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Reading progress: ${Math.round(progress * 100)}%`}
    >
      {/* Thin progress track */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-bg-secondary">
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent-primary transition-all duration-slow ease-default"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Clickable segments */}
        <div className="absolute inset-0 flex">
          {segments.map((i) => {
            const left = (i / totalCards) * 100;
            const width = (1 / totalCards) * 100;
            const isCurrent = i === currentCardIndex;
            const hasBookmark = bookmarkIndices.has(i);

            return (
              <SimpleTooltip
                key={i}
                content={`Card ${i + 1}${hasBookmark ? " (bookmarked)" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onJumpToCard(i)}
                  className={cn(
                    "absolute inset-y-0 cursor-pointer",
                    "transition-opacity duration-fast",
                    "hover:bg-accent-primary/20",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary",
                  )}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  aria-label={`Jump to card ${i + 1}`}
                >
                  {/* Current card indicator */}
                  {isCurrent && (
                    <span
                      className="absolute inset-y-0 left-0 w-full bg-accent-primary/30"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>

      {/* Bookmark indicators */}
      {bookmarks.length > 0 && (
        <div className="relative h-1.5 w-full" aria-hidden="true">
          {bookmarks.map((bookmark) => {
            const left = (bookmark.cardIndex / totalCards) * 100;
            return (
              <button
                key={bookmark.cardId}
                type="button"
                onClick={() => onJumpToCard(bookmark.cardIndex)}
                className={cn(
                  "absolute top-0 -translate-x-1/2",
                  "h-1.5 w-1.5 rounded-full",
                  "bg-accent-primary",
                  "cursor-pointer",
                  "hover:scale-150 transition-transform duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
                style={{ left: `${left}%` }}
                aria-label={`Bookmark at card ${bookmark.cardIndex + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
