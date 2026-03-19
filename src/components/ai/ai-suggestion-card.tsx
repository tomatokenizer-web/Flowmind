"use client";

import * as React from "react";
import { Check, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────

interface AISuggestionCardProps {
  type: "type" | "relation";
  suggestion: string;
  confidence: number;
  reasoning?: string;
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function AISuggestionCard({
  type,
  suggestion,
  confidence,
  reasoning,
  onAccept,
  onDismiss,
  className,
}: AISuggestionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDismissing, setIsDismissing] = React.useState(false);

  const handleDismiss = React.useCallback(() => {
    setIsDismissing(true);
    // Delay actual dismiss for animation
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  const confidenceLabel =
    confidence >= 0.8
      ? "High"
      : confidence >= 0.5
        ? "Medium"
        : "Low";

  const confidenceColor =
    confidence >= 0.8
      ? "text-emerald-600"
      : confidence >= 0.5
        ? "text-amber-600"
        : "text-text-tertiary";

  return (
    <AnimatePresence>
      {!isDismissing && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3",
            "dark:border-blue-700 dark:bg-blue-950/20",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                AI Suggestion
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {type === "type" ? "Type" : "Relation"}
              </span>
            </div>
            <span className={cn("text-[10px] font-medium", confidenceColor)}>
              {confidenceLabel} ({Math.round(confidence * 100)}%)
            </span>
          </div>

          {/* Suggestion content */}
          <div className="mt-2">
            <p className="text-sm font-medium text-text-primary capitalize">
              {suggestion.replace(/_/g, " ")}
            </p>
            {reasoning && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-xs text-text-secondary hover:text-text-primary"
              >
                {isExpanded ? "Hide reasoning" : "Show reasoning"}
              </button>
            )}
            <AnimatePresence>
              {isExpanded && reasoning && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 text-xs text-text-secondary italic"
                >
                  {reasoning}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onAccept}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              <Check className="h-3 w-3" />
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-7 gap-1 px-2.5 text-xs text-text-secondary"
            >
              <X className="h-3 w-3" />
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AI Inference Badge ───────────────────────────────────────────────────

interface AIInferenceBadgeProps {
  className?: string;
}

export function AIInferenceBadge({ className }: AIInferenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
        "bg-blue-100 text-[10px] font-medium text-blue-700",
        "dark:bg-blue-900/50 dark:text-blue-300",
        className
      )}
      title="This value was suggested by AI"
    >
      <Sparkles className="h-2.5 w-2.5" />
      AI
    </span>
  );
}
