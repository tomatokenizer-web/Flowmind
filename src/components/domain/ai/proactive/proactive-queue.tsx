"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { ProactiveCard } from "./proactive-card";

/* ─── Types ─── */

type TriggerType =
  | "cluster"
  | "question_answered"
  | "completeness"
  | "dormant"
  | "contradiction";

interface ProactiveSuggestion {
  id: string;
  trigger: TriggerType;
  message: string;
  detail?: string;
  priority: number;
}

interface ProactiveQueueProps {
  suggestions: ProactiveSuggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function ProactiveQueue({
  suggestions,
  onAccept,
  onDismiss,
  onSnooze,
  className,
}: ProactiveQueueProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Sort by priority (higher = more important, shown first)
  const sorted = React.useMemo(
    () => [...suggestions].sort((a, b) => b.priority - a.priority),
    [suggestions],
  );

  // Clamp index when suggestions change
  React.useEffect(() => {
    if (currentIndex >= sorted.length) {
      setCurrentIndex(Math.max(0, sorted.length - 1));
    }
  }, [sorted.length, currentIndex]);

  const currentSuggestion = sorted[currentIndex];
  const queueSize = sorted.length;

  if (queueSize === 0 || !currentSuggestion) return null;

  function handleAccept(id: string) {
    onAccept(id);
    advanceQueue();
  }

  function handleDismiss(id: string) {
    onDismiss(id);
    advanceQueue();
  }

  function handleSnooze(id: string) {
    onSnooze(id);
    advanceQueue();
  }

  function advanceQueue() {
    setCurrentIndex((prev) =>
      prev >= sorted.length - 1 ? 0 : prev,
    );
  }

  function cyclePrev() {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sorted.length - 1));
  }

  function cycleNext() {
    setCurrentIndex((prev) => (prev < sorted.length - 1 ? prev + 1 : 0));
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex flex-col items-end gap-2",
        className,
      )}
    >
      {/* Queue indicator */}
      <AnimatePresence>
        {queueSize > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "bg-bg-secondary border border-border shadow-resting",
            )}
          >
            <button
              type="button"
              onClick={cyclePrev}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                "text-text-tertiary hover:text-text-primary",
                "hover:bg-bg-hover transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
              aria-label="Previous suggestion"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <span className="text-[11px] text-text-tertiary tabular-nums">
              {currentIndex + 1} / {queueSize}
            </span>

            <button
              type="button"
              onClick={cycleNext}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                "text-text-tertiary hover:text-text-primary",
                "hover:bg-bg-hover transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
              aria-label="Next suggestion"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current card — max 1 visible */}
      <AnimatePresence mode="wait">
        <ProactiveCard
          key={currentSuggestion.id}
          id={currentSuggestion.id}
          trigger={currentSuggestion.trigger}
          message={currentSuggestion.message}
          detail={currentSuggestion.detail}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      </AnimatePresence>
    </div>
  );
}

ProactiveQueue.displayName = "ProactiveQueue";
