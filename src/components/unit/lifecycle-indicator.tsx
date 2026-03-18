"use client";

import { cn } from "~/lib/utils";

export type LifecycleState = "draft" | "pending" | "confirmed" | "deferred" | "complete";

interface LifecycleIndicatorProps {
  lifecycle: LifecycleState;
  className?: string;
}

const LIFECYCLE_CONFIG: Record<
  LifecycleState,
  { label: string; dotClass: string; textClass: string }
> = {
  draft: {
    label: "Draft",
    dotClass: "border border-dashed border-text-tertiary bg-transparent",
    textClass: "text-text-tertiary",
  },
  pending: {
    label: "Pending",
    dotClass: "bg-lifecycle-pending-border",
    textClass: "text-lifecycle-pending-border",
  },
  confirmed: {
    label: "Confirmed",
    dotClass: "bg-accent-success",
    textClass: "text-accent-success",
  },
  deferred: {
    label: "Deferred",
    dotClass: "bg-text-tertiary",
    textClass: "text-text-tertiary",
  },
  complete: {
    label: "Complete",
    dotClass: "bg-accent-primary",
    textClass: "text-accent-primary",
  },
};

export function LifecycleIndicator({ lifecycle, className }: LifecycleIndicatorProps) {
  const config = LIFECYCLE_CONFIG[lifecycle];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`Lifecycle: ${config.label}`}
    >
      <span
        className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)}
        aria-hidden="true"
      />
      <span className={cn("text-xs font-medium", config.textClass)}>
        {config.label}
      </span>
    </span>
  );
}
