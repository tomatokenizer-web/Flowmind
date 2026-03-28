"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { ExpertiseLevel } from "@/stores/theme-store";

/* ─── Config ─── */

const LEVEL_CONFIG: Record<
  ExpertiseLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
    aiChanges: string;
  }
> = {
  novice: {
    label: "Novice",
    color: "text-green-400",
    bgColor: "bg-green-500/12",
    description: "New to research and structured thinking",
    aiChanges:
      "Verbose prompts with definitions. Guided compass. Step-by-step amplification.",
  },
  intermediate: {
    label: "Intermediate",
    color: "text-blue-400",
    bgColor: "bg-blue-500/12",
    description: "Familiar with research workflows",
    aiChanges:
      "Concise prompts. Standard compass detail. Balanced amplification.",
  },
  expert: {
    label: "Expert",
    color: "text-amber-400",
    bgColor: "bg-amber-500/12",
    description: "Experienced researcher or writer",
    aiChanges:
      "Rare, high-value prompts only. Minimal compass detail. Advanced amplification surfaces.",
  },
};

/* ─── Props ─── */

interface ExpertiseIndicatorProps {
  /** Render as a compact badge (status bar) or full selector */
  variant?: "badge" | "selector";
  className?: string;
}

/* ─── Component ─── */

export function ExpertiseIndicator({
  variant = "badge",
  className,
}: ExpertiseIndicatorProps) {
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const setExpertiseLevel = useThemeStore((s) => s.setExpertiseLevel);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const config = LEVEL_CONFIG[expertiseLevel];

  if (variant === "badge") {
    return (
      <SimpleTooltip
        content={
          <div className="flex flex-col gap-1 text-xs max-w-[220px]">
            <span className="font-medium">{config.description}</span>
            <span className="text-text-tertiary">{config.aiChanges}</span>
          </div>
        }
        side="top"
      >
        <button
          type="button"
          onClick={() => setSelectorOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5",
            "text-[10px] font-medium leading-tight",
            config.bgColor,
            config.color,
            "hover:opacity-80 transition-opacity duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "relative",
            className,
          )}
          aria-label={`Expertise level: ${config.label}. Click to change.`}
        >
          {config.label}
        </button>
      </SimpleTooltip>
    );
  }

  // Selector variant — full controls
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Expertise Level
      </span>
      <div className="flex flex-col gap-1.5">
        {(Object.entries(LEVEL_CONFIG) as [ExpertiseLevel, typeof config][]).map(
          ([level, levelConfig]) => (
            <button
              key={level}
              type="button"
              onClick={() => setExpertiseLevel(level)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                "text-left",
                "transition-all duration-fast",
                level === expertiseLevel
                  ? cn(
                      "border-accent-primary/40 bg-accent-primary/5",
                      "shadow-resting",
                    )
                  : "border-border bg-bg-surface hover:border-border-focus/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
              aria-pressed={level === expertiseLevel}
            >
              <span
                className={cn(
                  "mt-0.5 h-3 w-3 rounded-full border-2 shrink-0",
                  "transition-colors duration-fast",
                  level === expertiseLevel
                    ? "border-accent-primary bg-accent-primary"
                    : "border-text-tertiary/40 bg-transparent",
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium block",
                    level === expertiseLevel
                      ? "text-text-primary"
                      : "text-text-secondary",
                  )}
                >
                  {levelConfig.label}
                </span>
                <span className="text-[11px] text-text-tertiary block mt-0.5">
                  {levelConfig.description}
                </span>
                <span className="text-[10px] text-text-tertiary/80 block mt-1 leading-relaxed">
                  AI behavior: {levelConfig.aiChanges}
                </span>
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

ExpertiseIndicator.displayName = "ExpertiseIndicator";
