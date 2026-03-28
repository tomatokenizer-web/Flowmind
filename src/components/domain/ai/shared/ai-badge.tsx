"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

/* ─── Props ─── */

interface AIBadgeProps {
  /** Show full "AI" text or just the icon */
  compact?: boolean;
  className?: string;
}

/* ─── Component ─── */

export function AIBadge({ compact = false, className }: AIBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "text-[10px] font-medium leading-tight",
        "bg-purple-500/12 text-purple-400",
        "select-none",
        className,
      )}
      aria-label="AI generated"
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {!compact && <span>AI</span>}
    </span>
  );
}

AIBadge.displayName = "AIBadge";
