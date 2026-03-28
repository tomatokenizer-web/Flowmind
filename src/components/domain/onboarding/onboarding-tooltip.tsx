"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/* ─── Types ─── */

interface OnboardingTooltipProps {
  /** Unique identifier for tracking dismissal */
  id: string;
  /** Content to display */
  title: string;
  description: string;
  /** Side relative to the anchor */
  side?: "top" | "right" | "bottom" | "left";
  /** Callback when "Show me more" is clicked */
  onLearnMore?: () => void;
  /** Additional class for positioning */
  className?: string;
  children: React.ReactNode;
}

const STORAGE_KEY = "flowmind-seen-tooltips";

function getSeenTooltips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markTooltipSeen(id: string) {
  try {
    const seen = getSeenTooltips();
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // localStorage unavailable
  }
}

/* ─── Arrow positioning ─── */

const ARROW_CLASSES: Record<string, string> = {
  top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-[var(--bg-surface)]",
  bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-[var(--bg-surface)]",
  left: "right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--bg-surface)]",
  right: "left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--bg-surface)]",
};

const TOOLTIP_POSITION: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
  left: "right-full top-1/2 -translate-y-1/2 mr-3",
  right: "left-full top-1/2 -translate-y-1/2 ml-3",
};

/* ─── Component ─── */

export function OnboardingTooltip({
  id,
  title,
  description,
  side = "bottom",
  onLearnMore,
  className,
  children,
}: OnboardingTooltipProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const seen = getSeenTooltips();
    if (!seen.has(id)) {
      // Delay to let the UI settle before showing
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [id]);

  function dismiss() {
    setVisible(false);
    markTooltipSeen(id);
  }

  function handleLearnMore() {
    dismiss();
    onLearnMore?.();
  }

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "absolute z-50 w-64",
              TOOLTIP_POSITION[side],
            )}
            role="tooltip"
          >
            <div className="rounded-card border border-border bg-bg-surface p-3 shadow-elevated">
              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute right-2 top-2 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Dismiss tooltip"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <h4 className="text-sm font-semibold text-text-primary pr-5">
                {title}
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                {description}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={dismiss}>
                  Got it
                </Button>
                {onLearnMore && (
                  <Button variant="primary" size="sm" onClick={handleLearnMore}>
                    Show me more
                  </Button>
                )}
              </div>

              {/* Arrow */}
              <div
                className={cn(
                  "absolute w-0 h-0 border-[6px]",
                  ARROW_CLASSES[side],
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
