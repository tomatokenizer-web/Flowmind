"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { cn } from "~/lib/utils";

interface CollapsedBriefingIndicatorProps {
  openQuestionCount: number;
  onExpand: () => void;
  className?: string;
}

export function CollapsedBriefingIndicator({
  openQuestionCount,
  onExpand,
  className,
}: CollapsedBriefingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className={cn("flex justify-end", className)}
    >
      <button
        type="button"
        onClick={onExpand}
        className="relative inline-flex items-center gap-space-2 rounded-lg border border-border bg-bg-primary px-space-3 py-space-2 text-xs text-text-secondary shadow-resting transition-all duration-fast hover:bg-bg-hover hover:shadow-hover focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
        aria-label="View Context Briefing"
        title="View Context Briefing"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Briefing
        {openQuestionCount > 0 && (
          <span
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-warning px-1 text-[10px] font-semibold text-white"
            aria-label={`${openQuestionCount} open question${openQuestionCount === 1 ? "" : "s"}`}
          >
            {openQuestionCount}
          </span>
        )}
      </button>
    </motion.div>
  );
}
