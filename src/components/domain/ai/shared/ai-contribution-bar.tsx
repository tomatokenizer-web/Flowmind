"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

interface AIContributionBarProps {
  /** Percentage directly written by user (0-100) */
  directlyWritten: number;
  /** Percentage AI-generated and approved (0-100) */
  aiApproved: number;
  /** Percentage AI-drafted (not yet approved) (0-100) */
  aiDraft: number;
  /** Warning threshold for AI ratio — defaults to 40 */
  warningThreshold?: number;
  className?: string;
}

/* ─── Segment Config ─── */

const SEGMENT_CONFIG = {
  directlyWritten: {
    label: "Directly written",
    color: "bg-accent-primary",
    textColor: "text-accent-primary",
  },
  aiApproved: {
    label: "AI-generated (approved)",
    color: "bg-purple-500",
    textColor: "text-purple-400",
  },
  aiDraft: {
    label: "AI draft",
    color: "bg-purple-500/40",
    textColor: "text-purple-400/60",
  },
} as const;

/* ─── Component ─── */

export function AIContributionBar({
  directlyWritten,
  aiApproved,
  aiDraft,
  warningThreshold = 40,
  className,
}: AIContributionBarProps) {
  const total = directlyWritten + aiApproved + aiDraft;
  const aiRatio = total > 0 ? ((aiApproved + aiDraft) / total) * 100 : 0;
  const showWarning = aiRatio > warningThreshold;

  // Normalize to percentages of total
  const normalize = (val: number) => (total > 0 ? (val / total) * 100 : 0);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Bar */}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-bg-secondary"
        role="meter"
        aria-valuenow={Math.round(aiRatio)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`AI contribution: ${Math.round(aiRatio)}%`}
      >
        {directlyWritten > 0 && (
          <SimpleTooltip
            content={`${SEGMENT_CONFIG.directlyWritten.label}: ${Math.round(normalize(directlyWritten))}%`}
            side="top"
          >
            <motion.div
              className={cn("h-full", SEGMENT_CONFIG.directlyWritten.color)}
              initial={{ width: 0 }}
              animate={{ width: `${normalize(directlyWritten)}%` }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            />
          </SimpleTooltip>
        )}
        {aiApproved > 0 && (
          <SimpleTooltip
            content={`${SEGMENT_CONFIG.aiApproved.label}: ${Math.round(normalize(aiApproved))}%`}
            side="top"
          >
            <motion.div
              className={cn("h-full", SEGMENT_CONFIG.aiApproved.color)}
              initial={{ width: 0 }}
              animate={{ width: `${normalize(aiApproved)}%` }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            />
          </SimpleTooltip>
        )}
        {aiDraft > 0 && (
          <SimpleTooltip
            content={`${SEGMENT_CONFIG.aiDraft.label}: ${Math.round(normalize(aiDraft))}%`}
            side="top"
          >
            <motion.div
              className={cn("h-full", SEGMENT_CONFIG.aiDraft.color)}
              initial={{ width: 0 }}
              animate={{ width: `${normalize(aiDraft)}%` }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            />
          </SimpleTooltip>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {([
          ["directlyWritten", directlyWritten],
          ["aiApproved", aiApproved],
          ["aiDraft", aiDraft],
        ] as const)
          .filter(([, val]) => val > 0)
          .map(([key, val]) => {
            const config = SEGMENT_CONFIG[key];
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className={cn("h-2 w-2 rounded-full", config.color)}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-text-tertiary">
                  {config.label}: {Math.round(normalize(val))}%
                </span>
              </div>
            );
          })}
      </div>

      {/* Warning */}
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2",
            "bg-amber-500/10 border border-amber-500/20",
          )}
          role="alert"
        >
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-500 shrink-0"
            aria-hidden="true"
          />
          <span className="text-[11px] text-amber-500">
            AI contribution exceeds {warningThreshold}%. Consider adding more
            original content to maintain authorship balance.
          </span>
        </motion.div>
      )}
    </div>
  );
}

AIContributionBar.displayName = "AIContributionBar";
