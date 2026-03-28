"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/shared/empty-state";
import { useFlowReading } from "~/hooks/use-flow-reading";
import type { PathUnit, PathRelation } from "~/lib/card-boundary-algorithm";
import type { ExpertiseLevel } from "~/stores/theme-store";
import type { PathNode } from "~/hooks/use-navigator";
import { FlowCard } from "./flow-card";
import { FlowProgress } from "./flow-progress";
import { FlowNavigation } from "./flow-navigation";
import { api } from "~/trpc/react";

/* ─── Types ─── */

interface FlowReadingViewProps {
  path: PathNode[];
  expertiseLevel: ExpertiseLevel;
  className?: string;
}

/* ─── Component ─── */

export function FlowReadingView({
  path,
  expertiseLevel,
  className,
}: FlowReadingViewProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const [tocOpen, setTocOpen] = React.useState(false);

  // Convert path nodes to PathUnits for the card boundary algorithm
  const pathUnits: PathUnit[] = React.useMemo(
    () =>
      path.map((node) => ({
        id: node.unitId,
        primaryType: "claim", // Will be enriched from actual data
        contextId: null,
        nucleusId: null,
        satelliteIds: [],
      })),
    [path],
  );

  const pathRelations: PathRelation[] = React.useMemo(
    () =>
      path
        .filter((node, i) => i > 0 && node.relationFromPrevious)
        .map((node, i) => ({
          sourceUnitId: path[i]!.unitId,
          targetUnitId: node.unitId,
          type: node.relationFromPrevious!,
          layer: node.relationLayer,
        })),
    [path],
  );

  const flowReading = useFlowReading(pathUnits, pathRelations, expertiseLevel);

  const {
    cards,
    currentCardIndex,
    totalCards,
    progress,
    bookmarks,
    isCardBookmarked,
    goToCard,
    goToNextCard,
    goToPreviousCard,
    toggleBookmark,
  } = flowReading;

  // Scroll to current card
  React.useEffect(() => {
    const el = cardRefs.current.get(currentCardIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentCardIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          goToNextCard();
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          goToPreviousCard();
          break;
        case "b":
          e.preventDefault();
          toggleBookmark(currentCardIndex);
          break;
        case "t":
          e.preventDefault();
          setTocOpen((prev) => !prev);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentCardIndex, goToNextCard, goToPreviousCard, toggleBookmark]);

  // Intersection observer to track which card is visible
  React.useEffect(() => {
    if (!scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-card-index"));
            if (!isNaN(index)) {
              goToCard(index);
            }
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.6,
      },
    );

    for (const [, el] of cardRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [cards, goToCard]);

  if (cards.length === 0) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <EmptyState
          icon={BookOpen}
          headline="No cards to display"
          description="Start a navigation path to see the reading view."
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex h-full flex-col bg-bg-primary", className)}
      role="region"
      aria-label="Flow reading view"
    >
      {/* Progress bar */}
      <FlowProgress
        progress={progress}
        totalCards={totalCards}
        currentCardIndex={currentCardIndex}
        bookmarks={bookmarks}
        onJumpToCard={goToCard}
      />

      {/* Card counter */}
      <div className="flex items-center justify-center py-2">
        <span className="text-xs text-text-tertiary tabular-nums">
          Card {currentCardIndex + 1} of {totalCards}
        </span>
      </div>

      {/* Card scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div className="mx-auto max-w-[720px] px-4 pb-24 pt-4">
          {cards.map((card, i) => (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
                else cardRefs.current.delete(i);
              }}
              data-card-index={i}
              style={{ scrollSnapAlign: "start" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                  delay: i * 0.05,
                }}
                className="mb-8"
              >
                <FlowCard
                  card={card}
                  isCurrent={i === currentCardIndex}
                  isBookmarked={isCardBookmarked(i)}
                  onToggleBookmark={() => toggleBookmark(i)}
                  allCards={cards}
                  onJumpToCard={goToCard}
                />
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation controls */}
      <FlowNavigation
        currentCardIndex={currentCardIndex}
        totalCards={totalCards}
        cards={cards}
        bookmarks={bookmarks}
        tocOpen={tocOpen}
        onToggleToc={() => setTocOpen((prev) => !prev)}
        onGoToCard={goToCard}
        onGoToNext={goToNextCard}
        onGoToPrevious={goToPreviousCard}
      />
    </div>
  );
}
