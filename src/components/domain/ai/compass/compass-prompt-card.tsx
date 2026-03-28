"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

type PromptPriority = "high" | "medium" | "low";

interface CompassPromptCardProps {
  id: string;
  /** Interrogative prompt text */
  question: string;
  /** ID of linked unit (claim/evidence this relates to) */
  linkedUnitId?: string;
  /** Preview text of linked unit */
  linkedUnitPreview?: string;
  /** Structural importance */
  priority: PromptPriority;
  /** Create a new unit to address this prompt */
  onAddress: (promptId: string) => void;
  /** Mark as already addressed */
  onDismiss: (promptId: string) => void;
  /** Mark as not relevant */
  onSkip: (promptId: string) => void;
  /** Navigate to linked unit */
  onClickUnit?: (unitId: string) => void;
  className?: string;
}

/* ─── Priority Config ─── */

const PRIORITY_CONFIG: Record<
  PromptPriority,
  { dot: string; border: string; label: string }
> = {
  high: {
    dot: "bg-accent-error",
    border: "border-l-accent-error/50",
    label: "High priority",
  },
  medium: {
    dot: "bg-amber-500",
    border: "border-l-amber-500/50",
    label: "Medium priority",
  },
  low: {
    dot: "bg-text-tertiary",
    border: "border-l-border",
    label: "Low priority",
  },
};

/* ─── Component ─── */

export function CompassPromptCard({
  id,
  question,
  linkedUnitId,
  linkedUnitPreview,
  priority,
  onAddress,
  onDismiss,
  onSkip,
  onClickUnit,
  className,
}: CompassPromptCardProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const config = PRIORITY_CONFIG[priority];

  function handleDismiss() {
    setDismissed(true);
    // Let animation finish before calling parent
    setTimeout(() => onDismiss(id), 200);
  }

  function handleSkip() {
    setDismissed(true);
    setTimeout(() => onSkip(id), 200);
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "group/prompt rounded-lg border border-border bg-bg-surface p-3",
            "border-l-[3px]",
            config.border,
            "transition-shadow duration-fast hover:shadow-resting",
            className,
          )}
        >
          {/* Priority + Question */}
          <div className="flex items-start gap-2.5">
            <SimpleTooltip content={config.label} side="left">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  config.dot,
                )}
                aria-label={config.label}
              />
            </SimpleTooltip>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary leading-relaxed">
                {question}
              </p>

              {/* Linked unit reference */}
              {linkedUnitId && linkedUnitPreview && (
                <button
                  type="button"
                  onClick={() => onClickUnit?.(linkedUnitId)}
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                    "text-[10px] font-medium leading-tight",
                    "bg-bg-secondary text-text-tertiary",
                    "hover:bg-bg-hover hover:text-text-secondary",
                    "transition-colors duration-fast",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  )}
                  aria-label={`Go to unit: ${linkedUnitPreview}`}
                >
                  <span className="max-w-[200px] truncate">
                    {linkedUnitPreview}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className={cn(
              "mt-2.5 flex items-center gap-1.5",
              "opacity-0 group-hover/prompt:opacity-100",
              "transition-opacity duration-fast",
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-accent-primary hover:bg-accent-primary/10"
              onClick={() => onAddress(id)}
            >
              <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
              Address this
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-text-tertiary hover:text-accent-success"
              onClick={handleDismiss}
            >
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
              Already done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-text-tertiary hover:text-text-secondary"
              onClick={handleSkip}
            >
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Not relevant
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

CompassPromptCard.displayName = "CompassPromptCard";
