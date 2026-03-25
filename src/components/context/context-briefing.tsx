"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Plus,
  Pencil,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { CollapsedBriefingIndicator } from "./collapsed-briefing-indicator";

// ─── Types ───────────────────────────────────────────────────────────

export interface BriefingData {
  lastVisitedAt: string | Date;
  unitsAddedCount: number;
  unitsModifiedCount: number;
  openQuestions: string[];
  aiSuggestions: string[];
  lastViewedUnitId: string | null;
}

interface ContextBriefingProps {
  briefing: BriefingData;
  onContinue: () => void;
  onStartFresh: () => void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30)
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString();
}

// ─── Component ───────────────────────────────────────────────────────

export function ContextBriefing({
  briefing,
  onContinue,
  onStartFresh,
  className,
}: ContextBriefingProps) {
  const [dismissed, setDismissed] = React.useState(false);

  const handleContinue = React.useCallback(() => {
    setDismissed(true);
    onContinue();
  }, [onContinue]);

  const handleStartFresh = React.useCallback(() => {
    setDismissed(true);
    onStartFresh();
  }, [onStartFresh]);

  const handleReExpand = React.useCallback(() => {
    setDismissed(false);
  }, []);

  const hasChanges =
    briefing.unitsAddedCount > 0 || briefing.unitsModifiedCount > 0;

  return (
    <AnimatePresence mode="wait">
      {dismissed ? (
        <CollapsedBriefingIndicator
          key="collapsed"
          openQuestionCount={briefing.openQuestions.length}
          onExpand={handleReExpand}
        />
      ) : (
        <motion.section
          key="expanded"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          aria-label="Context re-entry briefing"
          className={cn(
            "rounded-card border border-border bg-bg-primary p-space-5 space-y-space-4 shadow-resting",
            className,
          )}
        >
          {/* Session summary */}
          <div className="flex items-start gap-space-3">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                Welcome back
              </p>
              <p className="text-sm text-text-secondary">
                Last visited{" "}
                {formatRelativeTime(briefing.lastVisitedAt)}.
                {hasChanges && (
                  <>
                    {" "}
                    {briefing.unitsAddedCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Plus className="inline h-3 w-3" aria-hidden="true" />
                        {briefing.unitsAddedCount} added
                      </span>
                    )}
                    {briefing.unitsAddedCount > 0 &&
                      briefing.unitsModifiedCount > 0 &&
                      ", "}
                    {briefing.unitsModifiedCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Pencil
                          className="inline h-3 w-3"
                          aria-hidden="true"
                        />
                        {briefing.unitsModifiedCount} modified
                      </span>
                    )}
                    {" since then."}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Open questions */}
          {briefing.openQuestions.length > 0 && (
            <div className="space-y-space-2">
              <div className="flex items-center gap-space-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Open Questions
              </div>
              <ul className="list-disc list-inside space-y-1 pl-space-6" role="list">
                {briefing.openQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI suggestions placeholder */}
          {briefing.aiSuggestions.length > 0 && (
            <div className="space-y-space-2">
              <div className="flex items-center gap-space-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                Suggestions
              </div>
              <ul className="list-disc list-inside space-y-1 pl-space-6" role="list">
                {briefing.aiSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary italic"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTAs */}
          <div className="flex items-center gap-space-3 pt-space-2">
            {briefing.lastViewedUnitId && (
              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center gap-space-2 rounded-lg bg-accent-primary px-space-4 py-space-2 text-sm font-medium text-white transition-colors duration-fast hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                aria-label="Continue where you left off"
              >
                Continue where I left off
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={handleStartFresh}
              className="inline-flex items-center gap-space-2 rounded-lg px-space-4 py-space-2 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
              aria-label="Start fresh"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Start fresh
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
