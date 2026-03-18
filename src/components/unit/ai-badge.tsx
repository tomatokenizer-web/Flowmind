"use client";

import { cn } from "~/lib/utils";
import { Sparkles } from "lucide-react";

interface AIBadgeProps {
  className?: string;
}

/**
 * AIBadge — "AI Generated" indicator shown on draft units with AI origin.
 * Small, subtle pill with sparkle icon. Apple-like minimal design.
 */
export function AIBadge({ className }: AIBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        "bg-[--bg-secondary] border border-[--border-default]",
        "px-2 py-0.5 text-[11px] font-medium text-[--text-secondary]",
        "motion-reduce:transition-none",
        className,
      )}
      role="status"
      aria-label="AI Generated"
    >
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
      AI Generated
    </span>
  );
}
