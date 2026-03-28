"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  List,
  BookmarkCheck,
  X,
  Bookmark,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { CardGroup } from "~/lib/card-boundary-algorithm";
import type { Bookmark as BookmarkType } from "~/hooks/use-flow-reading";

/* ─── Types ─── */

interface FlowNavigationProps {
  currentCardIndex: number;
  totalCards: number;
  cards: CardGroup[];
  bookmarks: BookmarkType[];
  tocOpen: boolean;
  onToggleToc: () => void;
  onGoToCard: (index: number) => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  className?: string;
}

/* ─── Component ─── */

export function FlowNavigation({
  currentCardIndex,
  totalCards,
  cards,
  bookmarks,
  tocOpen,
  onToggleToc,
  onGoToCard,
  onGoToNext,
  onGoToPrevious,
  className,
}: FlowNavigationProps) {
  const bookmarkIndices = React.useMemo(
    () => new Set(bookmarks.map((b) => b.cardIndex)),
    [bookmarks],
  );

  const canGoUp = currentCardIndex > 0;
  const canGoDown = currentCardIndex < totalCards - 1;

  return (
    <>
      {/* Table of Contents sidebar */}
      <AnimatePresence>
        {tocOpen && (
          <motion.div
            initial={{ opacity: 0, x: -240 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -240 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "absolute left-0 top-0 bottom-0 z-20 w-60",
              "border-r border-border bg-bg-primary shadow-hover",
            )}
            role="navigation"
            aria-label="Table of contents"
          >
            {/* TOC header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <h3 className="text-xs font-semibold text-text-primary">
                Table of Contents
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleToc}
                aria-label="Close table of contents"
                className="h-6 w-6"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* TOC list */}
            <ScrollArea className="h-[calc(100%-41px)]">
              <div className="py-1">
                {cards.map((card, i) => {
                  const isActive = i === currentCardIndex;
                  const hasBookmark = bookmarkIndices.has(i);

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        onGoToCard(i);
                        onToggleToc();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left",
                        "transition-colors duration-fast",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary",
                        isActive
                          ? "bg-accent-primary/8 text-accent-primary"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                      )}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {/* Card number */}
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                          isActive
                            ? "bg-accent-primary text-white"
                            : "bg-bg-secondary text-text-tertiary",
                        )}
                      >
                        {i + 1}
                      </span>

                      {/* Card theme */}
                      <span className="min-w-0 truncate text-xs">
                        {card.theme}
                      </span>

                      {/* Unit count */}
                      <span className="ml-auto shrink-0 text-[10px] text-text-tertiary">
                        {card.unitIds.length}
                      </span>

                      {/* Bookmark indicator */}
                      {hasBookmark && (
                        <Bookmark
                          className="h-3 w-3 shrink-0 text-accent-primary"
                          aria-label="Bookmarked"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <div
        className={cn(
          "flex items-center justify-between border-t border-border bg-bg-primary px-4 py-2",
          className,
        )}
      >
        {/* Left: TOC toggle + bookmark jump */}
        <div className="flex items-center gap-1">
          <SimpleTooltip content="Table of contents (T)">
            <Button
              size="icon"
              variant={tocOpen ? "secondary" : "ghost"}
              onClick={onToggleToc}
              aria-label="Toggle table of contents"
              aria-expanded={tocOpen}
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          {bookmarks.length > 0 && (
            <SimpleTooltip content="Jump to next bookmark">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  // Find the next bookmark after current position
                  const next = bookmarks.find(
                    (b) => b.cardIndex > currentCardIndex,
                  );
                  if (next) {
                    onGoToCard(next.cardIndex);
                  } else if (bookmarks[0]) {
                    // Wrap around to first bookmark
                    onGoToCard(bookmarks[0].cardIndex);
                  }
                }}
                aria-label="Jump to next bookmark"
                className="h-8 w-8"
              >
                <BookmarkCheck className="h-4 w-4 text-accent-primary" />
              </Button>
            </SimpleTooltip>
          )}
        </div>

        {/* Center: keyboard hint */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-text-tertiary">
          <span>
            <kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5 font-mono text-[9px]">
              J
            </kbd>
            {" / "}
            <kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5 font-mono text-[9px]">
              K
            </kbd>
            {" navigate"}
          </span>
          <span>
            <kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5 font-mono text-[9px]">
              B
            </kbd>
            {" bookmark"}
          </span>
          <span>
            <kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5 font-mono text-[9px]">
              T
            </kbd>
            {" contents"}
          </span>
        </div>

        {/* Right: Up/Down navigation */}
        <div className="flex items-center gap-1">
          <SimpleTooltip content="Previous card">
            <Button
              size="icon"
              variant="ghost"
              disabled={!canGoUp}
              onClick={onGoToPrevious}
              aria-label="Previous card"
              className="h-8 w-8"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          <span className="text-xs text-text-tertiary tabular-nums min-w-[4ch] text-center">
            {currentCardIndex + 1}/{totalCards}
          </span>

          <SimpleTooltip content="Next card">
            <Button
              size="icon"
              variant="ghost"
              disabled={!canGoDown}
              onClick={onGoToNext}
              aria-label="Next card"
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </>
  );
}
