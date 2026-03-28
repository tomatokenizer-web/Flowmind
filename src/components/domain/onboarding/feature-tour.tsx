"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/* ─── Types ─── */

interface TourStep {
  /** CSS selector or element ID to highlight */
  targetSelector: string;
  title: string;
  description: string;
  /** Which side to show the tooltip on */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

interface FeatureTourProps {
  steps: TourStep[];
  /** Unique key for persisting completion state */
  tourId: string;
  /** Whether to auto-start the tour */
  autoStart?: boolean;
  /** Callback when tour completes or is skipped */
  onComplete?: () => void;
}

const STORAGE_KEY_PREFIX = "flowmind-tour-complete-";

/* ─── Component ─── */

export function FeatureTour({
  steps,
  tourId,
  autoStart = false,
  onComplete,
}: FeatureTourProps) {
  const [active, setActive] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  const storageKey = `${STORAGE_KEY_PREFIX}${tourId}`;

  // Check if tour has already been completed
  React.useEffect(() => {
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed && autoStart) {
        const timer = setTimeout(() => setActive(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, [autoStart, storageKey]);

  // Find and measure target element
  React.useEffect(() => {
    if (!active || !steps[currentIndex]) return;

    const step = steps[currentIndex];
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }

    // Re-measure on resize
    function handleResize() {
      const el = document.querySelector(step.targetSelector);
      if (el) setTargetRect(el.getBoundingClientRect());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, currentIndex, steps]);

  function goNext() {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      completeTour();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function completeTour() {
    setActive(false);
    setCurrentIndex(0);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // localStorage unavailable
    }
    onComplete?.();
  }

  function skipTour() {
    completeTour();
  }

  /** Start the tour programmatically */
  function start() {
    setCurrentIndex(0);
    setActive(true);
  }

  if (!active) return null;

  const step = steps[currentIndex];
  if (!step) return null;

  const side = step.tooltipSide ?? "bottom";
  const padding = 8;

  // Calculate tooltip position based on target
  function getTooltipStyle(): React.CSSProperties {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const base: React.CSSProperties = { position: "fixed" };

    switch (side) {
      case "top":
        base.bottom = `${window.innerHeight - targetRect.top + padding + 12}px`;
        base.left = `${targetRect.left + targetRect.width / 2}px`;
        base.transform = "translateX(-50%)";
        break;
      case "bottom":
        base.top = `${targetRect.bottom + padding + 12}px`;
        base.left = `${targetRect.left + targetRect.width / 2}px`;
        base.transform = "translateX(-50%)";
        break;
      case "left":
        base.top = `${targetRect.top + targetRect.height / 2}px`;
        base.right = `${window.innerWidth - targetRect.left + padding + 12}px`;
        base.transform = "translateY(-50%)";
        break;
      case "right":
        base.top = `${targetRect.top + targetRect.height / 2}px`;
        base.left = `${targetRect.right + padding + 12}px`;
        base.transform = "translateY(-50%)";
        break;
    }

    return base;
  }

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Dark overlay with cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ pointerEvents: "none" }}
          >
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="tour-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - padding}
                      y={targetRect.top - padding}
                      width={targetRect.width + padding * 2}
                      height={targetRect.height + padding * 2}
                      rx={8}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.5)"
                mask="url(#tour-mask)"
              />
            </svg>
          </motion.div>

          {/* Highlight border around target */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[101] rounded-lg border-2 border-accent-primary pointer-events-none"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed z-[102] w-72"
            style={getTooltipStyle()}
          >
            <div className="rounded-card border border-border bg-bg-surface p-4 shadow-elevated">
              {/* Skip all */}
              <button
                onClick={skipTour}
                className="absolute right-3 top-3 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Step counter */}
              <span className="text-[10px] font-medium text-accent-primary uppercase tracking-wider">
                Step {currentIndex + 1} of {steps.length}
              </span>

              <h4 className="text-sm font-semibold text-text-primary mt-1.5 pr-5">
                {step.title}
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="gap-0.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </Button>

                {/* Dots */}
                <div className="flex items-center gap-1">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-fast",
                        i === currentIndex
                          ? "w-4 bg-accent-primary"
                          : i < currentIndex
                            ? "w-1.5 bg-accent-primary/50"
                            : "w-1.5 bg-text-tertiary/30",
                      )}
                    />
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={goNext}
                  className="gap-0.5"
                >
                  {currentIndex === steps.length - 1 ? "Done" : "Next"}
                  {currentIndex < steps.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Skip all button (floating) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-[102]"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-white/70 hover:text-white bg-black/30 hover:bg-black/50"
            >
              Skip tour
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Default app tour steps ─── */

export const APP_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "[data-tour='sidebar']",
    title: "Sidebar Navigation",
    description:
      "Browse your projects, inquiries, and contexts. This is the home for your knowledge structure.",
    tooltipSide: "right",
  },
  {
    targetSelector: "#main-content",
    title: "Main Content Area",
    description:
      "View and edit your thinking units. Switch between list, graph, board, reading, and thread views using the toolbar.",
    tooltipSide: "bottom",
  },
  {
    targetSelector: "[data-tour='right-panel']",
    title: "Inspector & Tools",
    description:
      "Inspect unit details, view local relation graphs, and access the dialectical compass for deeper analysis.",
    tooltipSide: "left",
  },
  {
    targetSelector: "[data-tour='view-modes']",
    title: "View Modes",
    description:
      "Switch perspectives on your knowledge: list for browsing, graph for connections, board for organizing, and more.",
    tooltipSide: "bottom",
  },
  {
    targetSelector: "[data-tour='command-palette']",
    title: "Command Palette",
    description:
      "Press Ctrl+K (or Cmd+K) to quickly navigate, create units, search, and access any action in FlowMind.",
    tooltipSide: "bottom",
  },
];
