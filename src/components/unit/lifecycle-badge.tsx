"use client";

import { cn } from "~/lib/utils";
import { FileEdit, Clock, CheckCircle2 } from "lucide-react";

export type LifecycleState = "draft" | "pending" | "confirmed" | "deferred" | "complete";

export type LifecycleBadgeSize = "sm" | "md";

interface AILifecycleBadgeProps {
  lifecycle: LifecycleState;
  size?: LifecycleBadgeSize;
  className?: string;
}

const LIFECYCLE_CONFIG: Record<
  "draft" | "pending" | "confirmed",
  {
    label: string;
    description: string;
    Icon: typeof FileEdit;
    containerClass: string;
    iconClass: string;
    textClass: string;
  }
> = {
  draft: {
    label: "Draft",
    description: "AI-generated, awaiting review",
    Icon: FileEdit,
    containerClass: "border-dashed border-[--text-tertiary] bg-[--bg-secondary]",
    iconClass: "text-[--text-tertiary]",
    textClass: "text-[--text-tertiary]",
  },
  pending: {
    label: "Pending",
    description: "Under review",
    Icon: Clock,
    containerClass: "border-solid border-[--accent-warning] bg-[--accent-warning]/10",
    iconClass: "text-[--accent-warning]",
    textClass: "text-[--accent-warning]",
  },
  confirmed: {
    label: "Confirmed",
    description: "Approved and active",
    Icon: CheckCircle2,
    containerClass: "border-solid border-[--accent-success] bg-[--accent-success]/10",
    iconClass: "text-[--accent-success]",
    textClass: "text-[--accent-success]",
  },
};

/**
 * AILifecycleBadge — visual badge showing Draft/Pending/Confirmed lifecycle state.
 *
 * - Small (sm): inline pill — icon + label, 20px height
 * - Medium (md): card badge — icon + label + description, 32px height
 */
export function AILifecycleBadge({
  lifecycle,
  size = "sm",
  className,
}: AILifecycleBadgeProps) {
  // Only show badge for draft/pending/confirmed states
  if (!(lifecycle in LIFECYCLE_CONFIG)) return null;

  const config = LIFECYCLE_CONFIG[lifecycle as keyof typeof LIFECYCLE_CONFIG];
  const { Icon } = config;

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 h-5",
          "text-[11px] font-medium leading-none",
          "motion-reduce:transition-none",
          config.containerClass,
          className,
        )}
        role="status"
        aria-label={`Lifecycle: ${config.label}`}
      >
        <Icon className={cn("h-3 w-3 shrink-0", config.iconClass)} aria-hidden="true" />
        <span className={config.textClass}>{config.label}</span>
      </span>
    );
  }

  // Medium variant
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 h-8",
        "text-xs font-medium leading-none",
        "motion-reduce:transition-none",
        config.containerClass,
        className,
      )}
      role="status"
      aria-label={`Lifecycle: ${config.label} — ${config.description}`}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconClass)} aria-hidden="true" />
      <span className={config.textClass}>{config.label}</span>
      <span className={cn("text-[11px] opacity-70", config.textClass)}>
        — {config.description}
      </span>
    </span>
  );
}
