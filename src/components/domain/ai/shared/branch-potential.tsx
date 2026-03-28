"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  MessageSquare,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

interface BranchDirection {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface BranchPotentialProps {
  /** Potential score 0-4 (number of filled dots) */
  potential: number;
  /** Explorable directions specific to this unit */
  directions?: BranchDirection[];
  /** Called when a direction is selected — creates a new draft unit */
  onExplore: (directionId: string) => void;
  className?: string;
}

/* ─── Default Directions ─── */

const DEFAULT_DIRECTIONS: BranchDirection[] = [
  {
    id: "support",
    label: "Add supporting evidence",
    icon: FileText,
    description: "Create a new evidence unit to support this claim",
  },
  {
    id: "counter",
    label: "Explore counterarguments",
    icon: MessageSquare,
    description: "Investigate opposing viewpoints or limitations",
  },
  {
    id: "define",
    label: "Define key terms",
    icon: BookOpen,
    description: "Clarify terminology used in this unit",
  },
];

/* ─── Component ─── */

export function BranchPotential({
  potential,
  directions = DEFAULT_DIRECTIONS,
  onExplore,
  className,
}: BranchPotentialProps) {
  const [expanded, setExpanded] = React.useState(false);
  const clampedPotential = Math.max(0, Math.min(4, Math.round(potential)));

  return (
    <div className={cn("relative inline-flex flex-col", className)}>
      {/* Dot indicator */}
      <SimpleTooltip
        content={`Derivation potential: ${clampedPotential}/4`}
        side="top"
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-1",
            "hover:bg-bg-hover",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          )}
          aria-label={`Derivation potential ${clampedPotential} out of 4. Click to explore directions.`}
          aria-expanded={expanded}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                "transition-colors duration-fast",
                i < clampedPotential
                  ? "bg-accent-primary"
                  : "bg-text-tertiary/25",
              )}
              aria-hidden="true"
            />
          ))}
        </button>
      </SimpleTooltip>

      {/* Expanded directions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-bg-surface p-2",
                "shadow-resting",
              )}
            >
              {directions.map((dir) => {
                const DirIcon = dir.icon;
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => {
                      onExplore(dir.id);
                      setExpanded(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2",
                      "text-left",
                      "hover:bg-bg-hover",
                      "transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    )}
                  >
                    <DirIcon
                      className="h-3.5 w-3.5 text-text-tertiary shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-text-primary block">
                        {dir.label}
                      </span>
                      <span className="text-[10px] text-text-tertiary block leading-tight">
                        {dir.description}
                      </span>
                    </div>
                    <ChevronRight
                      className="h-3 w-3 text-text-tertiary shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

BranchPotential.displayName = "BranchPotential";
