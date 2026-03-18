"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { Check, X, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkApprovalBarProps {
  selectedCount: number;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
  onDismiss?: () => void;
  disabled?: boolean;
  className?: string;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 motion-reduce:transition-none disabled:opacity-50 disabled:pointer-events-none";

/**
 * BulkApprovalBar — fixed bottom bar for bulk approve/reject of multiple draft units.
 * Appears when 2+ units are selected. Apple-like minimal design with count indicator.
 */
export function BulkApprovalBar({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onDismiss,
  disabled = false,
  className,
}: BulkApprovalBarProps) {
  return (
    <AnimatePresence>
      {selectedCount >= 2 && (
        <motion.div
          className={cn(
            "fixed bottom-6 left-1/2 z-50",
            "flex items-center gap-3 rounded-2xl",
            "bg-[--bg-primary] border border-[--border-default]",
            "shadow-modal px-5 py-3",
            "motion-reduce:transition-none",
            className,
          )}
          style={{ x: "-50%" }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          role="toolbar"
          aria-label={`Bulk actions for ${selectedCount} selected units`}
        >
          {/* Count indicator */}
          <span className="text-sm font-medium text-[--text-primary] tabular-nums">
            {selectedCount} selected
          </span>

          {/* Divider */}
          <span className="h-5 w-px bg-[--border-default]" aria-hidden="true" />

          {/* Approve all */}
          <button
            type="button"
            className={cn(
              BUTTON_BASE,
              "bg-[--accent-success]/10 text-[#065F46] hover:bg-[--accent-success]/20",
            )}
            onClick={onApproveAll}
            disabled={disabled}
            aria-label={`Approve all ${selectedCount} selected units`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Approve All
          </button>

          {/* Reject all */}
          <button
            type="button"
            className={cn(
              BUTTON_BASE,
              "text-[--text-secondary] hover:bg-[--accent-error]/10 hover:text-[--accent-error]",
            )}
            onClick={onRejectAll}
            disabled={disabled}
            aria-label={`Reject all ${selectedCount} selected units`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Reject All
          </button>

          {/* Dismiss bar */}
          <button
            type="button"
            className="ml-1 rounded-full p-1 text-[--text-tertiary] hover:bg-[--bg-hover] transition-colors duration-fast"
            onClick={onDismiss}
            aria-label="Dismiss selection"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
