"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";

/* ─── Types ─── */

interface BranchPreview {
  id: string;
  content: string;
  primaryType: string;
}

interface ThreadForkIndicatorProps {
  /** Number of branches at this fork */
  branchCount: number;
  /** Preview data for each branch */
  branches: BranchPreview[];
  /** Currently selected branch ID */
  selectedBranchId?: string;
  /** Callback when a branch is selected */
  onSelectBranch: (branchId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function ThreadForkIndicator({
  branchCount,
  branches,
  selectedBranchId,
  onSelectBranch,
  className,
}: ThreadForkIndicatorProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center py-1",
        className,
      )}
    >
      {/* Connector line top */}
      <div className="w-px h-2 bg-border" aria-hidden="true" />

      {/* Fork button */}
      <SimpleTooltip
        content={`${branchCount} branches diverge here`}
        side="right"
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={`Fork point: ${branchCount} branches. ${expanded ? "Collapse" : "Expand"} branch list`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
            "border border-border bg-bg-secondary",
            "text-xs font-medium text-text-secondary",
            "transition-all duration-fast ease-default",
            "hover:bg-bg-hover hover:border-border-focus/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          )}
        >
          <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{branchCount} branches</span>
        </button>
      </SimpleTooltip>

      {/* Expanded branch list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden w-full max-w-sm"
          >
            <div
              className={cn(
                "mt-1.5 flex flex-col gap-1 rounded-card border border-border",
                "bg-bg-primary p-2 shadow-resting",
              )}
              role="listbox"
              aria-label="Select a branch to follow"
            >
              {branches.map((branch) => {
                const isSelected = branch.id === selectedBranchId;
                return (
                  <button
                    key={branch.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectBranch(branch.id);
                      setExpanded(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-left",
                      "transition-colors duration-fast",
                      "hover:bg-bg-hover",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      isSelected && "bg-accent-primary/5 border border-accent-primary/20",
                      !isSelected && "border border-transparent",
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected ? "text-accent-primary" : "text-text-tertiary",
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary line-clamp-1">
                        {branch.content}
                      </p>
                      <span
                        className="inline-block mt-0.5 text-[10px] font-medium capitalize rounded px-1 py-0.5 bg-bg-secondary text-text-tertiary"
                      >
                        {branch.primaryType}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-medium text-accent-primary shrink-0">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector line bottom */}
      <div className="w-px h-2 bg-border" aria-hidden="true" />
    </div>
  );
}

ThreadForkIndicator.displayName = "ThreadForkIndicator";
