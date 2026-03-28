"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/* ─── Lifecycle Config ─── */

type LifecycleStage = "draft" | "pending" | "confirmed" | "deferred" | "complete" | "archived" | "discarded";

interface LifecycleConfig {
  label: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

const LIFECYCLE_CONFIG: Record<LifecycleStage, LifecycleConfig> = {
  draft: {
    label: "AI Draft",
    borderClass: "border-dashed border-lifecycle-draft-border",
    bgClass: "bg-lifecycle-draft-bg",
    textClass: "text-text-tertiary",
    dotClass: "bg-text-tertiary",
  },
  pending: {
    label: "Pending Review",
    borderClass: "border-solid border-lifecycle-pending-border",
    bgClass: "bg-lifecycle-pending-bg",
    textClass: "text-accent-warning",
    dotClass: "bg-accent-warning",
  },
  confirmed: {
    label: "Confirmed",
    borderClass: "border-solid border-lifecycle-confirmed-border",
    bgClass: "bg-transparent",
    textClass: "text-accent-success",
    dotClass: "bg-accent-success",
  },
  deferred: {
    label: "Deferred",
    borderClass: "border-solid border-border",
    bgClass: "bg-transparent",
    textClass: "text-text-tertiary",
    dotClass: "bg-text-tertiary",
  },
  complete: {
    label: "Complete",
    borderClass: "border-solid border-accent-success",
    bgClass: "bg-transparent",
    textClass: "text-accent-success",
    dotClass: "bg-accent-success",
  },
  archived: {
    label: "Archived",
    borderClass: "border-solid border-border",
    bgClass: "bg-bg-secondary",
    textClass: "text-text-tertiary",
    dotClass: "bg-text-tertiary",
  },
  discarded: {
    label: "Discarded",
    borderClass: "border-solid border-accent-error/30",
    bgClass: "bg-transparent",
    textClass: "text-accent-error",
    dotClass: "bg-accent-error",
  },
};

export function getLifecycleConfig(lifecycle: string): LifecycleConfig {
  return (
    LIFECYCLE_CONFIG[lifecycle as LifecycleStage] ?? LIFECYCLE_CONFIG.draft
  );
}

/* ─── UnitLifecycleBadge Component ─── */

interface UnitLifecycleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  lifecycle: string;
  /** Show inline action buttons for draft units */
  showActions?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  onDiscard?: () => void;
}

export function UnitLifecycleBadge({
  lifecycle,
  showActions = false,
  onConfirm,
  onEdit,
  onDiscard,
  className,
  ...props
}: UnitLifecycleBadgeProps) {
  const config = getLifecycleConfig(lifecycle);
  const isDraft = lifecycle === "draft";
  const isPending = lifecycle === "pending";

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {/* Badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
          "text-xs font-medium",
          config.bgClass,
          config.textClass,
        )}
      >
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)}
          aria-hidden="true"
        />
        {config.label}
      </span>

      {/* Inline actions for draft / pending units */}
      {showActions && (isDraft || isPending) && (
        <span className="inline-flex items-center gap-0.5" role="group" aria-label="Quick actions">
          {onConfirm && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-accent-success hover:text-accent-success"
              onClick={onConfirm}
              aria-label="Confirm unit"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
              onClick={onEdit}
              aria-label="Edit unit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDiscard && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-accent-error hover:text-accent-error"
              onClick={onDiscard}
              aria-label="Discard unit"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </span>
      )}
    </span>
  );
}

UnitLifecycleBadge.displayName = "UnitLifecycleBadge";

export { LIFECYCLE_CONFIG };
export type { LifecycleStage };
