"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { Check, X, RotateCcw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LifecycleAction = "approve" | "reject" | "reset";

interface ApproveRejectButtonsProps {
  lifecycle: "draft" | "pending" | "confirmed";
  onApprove?: () => void;
  onReject?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  className?: string;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 motion-reduce:transition-none disabled:opacity-50 disabled:pointer-events-none min-h-[32px] min-w-[32px]";

/**
 * ApproveRejectButtons — action buttons for lifecycle transitions.
 *
 * - Draft units: "Review" (→ pending) + "Reject" (→ discard)
 * - Pending units: "Confirm" (→ confirmed) + "Reject" (→ draft)
 * - Confirmed units: "Reset to Draft" (overflow-style, subtle)
 */
export function ApproveRejectButtons({
  lifecycle,
  onApprove,
  onReject,
  onReset,
  disabled = false,
  className,
}: ApproveRejectButtonsProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lifecycle}
        className={cn("inline-flex items-center gap-2", className)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {lifecycle === "draft" && (
          <>
            <button
              type="button"
              className={cn(
                BUTTON_BASE,
                "bg-[--accent-warning]/10 text-[#92400E] hover:bg-[--accent-warning]/20",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onApprove?.();
                }
              }}
              disabled={disabled}
              aria-label="Review this unit"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Review
            </button>
            <button
              type="button"
              className={cn(
                BUTTON_BASE,
                "text-[--text-tertiary] hover:bg-[--accent-error]/10 hover:text-[--accent-error]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onReject?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onReject?.();
                }
              }}
              disabled={disabled}
              aria-label="Reject this unit"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}

        {lifecycle === "pending" && (
          <>
            <button
              type="button"
              className={cn(
                BUTTON_BASE,
                "bg-[--accent-success]/10 text-[#065F46] hover:bg-[--accent-success]/20",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onApprove?.();
                }
              }}
              disabled={disabled}
              aria-label="Confirm this unit"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Confirm
            </button>
            <button
              type="button"
              className={cn(
                BUTTON_BASE,
                "text-[--text-tertiary] hover:bg-[--accent-error]/10 hover:text-[--accent-error]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onReject?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onReject?.();
                }
              }}
              disabled={disabled}
              aria-label="Reject this unit back to draft"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}

        {lifecycle === "confirmed" && (
          <button
            type="button"
            className={cn(
              BUTTON_BASE,
              "text-[--text-tertiary] hover:bg-[--bg-hover]",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onReset?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onReset?.();
              }
            }}
            disabled={disabled}
            aria-label="Reset to draft"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
