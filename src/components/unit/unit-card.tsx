"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { motion } from "framer-motion";
import { GripVertical, Link2, Clock, History, ExternalLink, X } from "lucide-react";
import { useSelectionStore } from "~/stores/selectionStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "./unit-type-badge";
import { LifecycleIndicator, type LifecycleState } from "./lifecycle-indicator";
import { AILifecycleBadge } from "./lifecycle-badge";
import { AIBadge } from "./ai-badge";
import { ApproveRejectButtons } from "./approve-reject-buttons";

// ─── Types ───────────────────────────────────────────────────────────

export type UnitCardVariant = "compact" | "standard" | "expanded";

export interface UnitCardUnit {
  id: string;
  content: string;
  unitType: UnitType;
  lifecycle: LifecycleState;
  createdAt: Date;
  branchPotential?: number;
  relationCount?: number;
  originType?: string;
  sourceSpan?: string | null;
  contexts?: string[];
}

export interface UnitCardProps {
  unit: UnitCardUnit;
  variant?: UnitCardVariant;
  selected?: boolean;
  onClick?: (unit: UnitCardUnit) => void;
  onLifecycleAction?: (unitId: string, action: "approve" | "reject" | "reset") => void;
  /** When provided, shows "Remove from Context" in the context menu */
  onRemoveFromContext?: () => void;
  className?: string;
}

// ─── Unit type → Tailwind border-left color class ─────────────────

const TYPE_BORDER_COLORS: Record<UnitType, string> = {
  claim:           "border-l-unit-claim-accent",
  question:        "border-l-unit-question-accent",
  evidence:        "border-l-unit-evidence-accent",
  counterargument: "border-l-unit-counterargument-accent",
  observation:     "border-l-unit-observation-accent",
  idea:            "border-l-unit-idea-accent",
  definition:      "border-l-unit-definition-accent",
  assumption:      "border-l-unit-assumption-accent",
  action:          "border-l-unit-action-accent",
};

// ─── Branch Potential Indicator ──────────────────────────────────────

function BranchPotentialDots({ score }: { score: number }) {
  // score 0-1 mapped to 0-4 filled dots
  const filled = Math.round(score * 4);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Branch potential: ${filled} of 4`}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-xs leading-none",
            i < filled ? "text-text-primary" : "text-text-tertiary",
          )}
          aria-hidden="true"
        >
          {i < filled ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

// ─── UnitCard ────────────────────────────────────────────────────────

export function UnitCard({
  unit,
  variant = "standard",
  selected = false,
  onClick,
  onLifecycleAction,
  onRemoveFromContext,
  className,
}: UnitCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);
  const isSelected = selectedUnitId === unit.id;

  const isDraft = unit.lifecycle === "draft";
  const isPending = unit.lifecycle === "pending";

  // Truncated content for compact (1 line) and standard (3 lines)
  const contentPreview = unit.content.length > 200
    ? unit.content.slice(0, 200) + "…"
    : unit.content;

  const ariaLabel = `${unit.unitType} unit: ${unit.content.slice(0, 60)}${unit.content.length > 60 ? "…" : ""}`;

  return (
    <motion.article
      className={cn(
        // Base card styles
        "group relative rounded-card bg-bg-primary border border-border",
        "shadow-resting p-4 cursor-pointer",
        "border-l-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        "motion-reduce:transition-none motion-reduce:transform-none",

        // Type-colored left border
        TYPE_BORDER_COLORS[unit.unitType],

        // Lifecycle states
        isDraft && "border-dashed opacity-80 bg-lifecycle-draft-bg",
        isPending && "border-l-lifecycle-pending-border bg-lifecycle-pending-bg/30",

        // Selected state (from prop or global selection store)
        (selected || isSelected) && "ring-2 ring-accent-primary",

        className,
      )}
      role="article"
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={() => { setSelectedUnit(unit.id); onClick?.(unit); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(unit);
        }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        y: -1,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
      }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Drag grip handle — visible on hover */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0 pl-0.5",
          "transition-opacity duration-fast",
          isHovered ? "opacity-40" : "opacity-0",
        )}
        aria-hidden="true"
      >
        <GripVertical className="h-5 w-5 text-text-tertiary cursor-grab" />
      </div>

      {/* Card content */}
      <div className="space-y-2">
        {/* Header: type badge + AI badge + relation count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UnitTypeBadge unitType={unit.unitType} />
            {isDraft && unit.originType === "ai_generated" && <AIBadge />}
          </div>
          <div className="flex items-center gap-2">
            {variant !== "compact" && (unit.relationCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs text-text-secondary"
                aria-label={`${unit.relationCount} relations`}
              >
                <Link2 className="h-3 w-3" aria-hidden="true" />
                {unit.relationCount}
              </span>
            )}
            {/* Remove from context — shown when onRemoveFromContext is provided */}
            {onRemoveFromContext && (
              <button
                type="button"
                aria-label="Remove from context"
                title="Remove from context"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromContext();
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded p-0.5",
                  "text-text-tertiary hover:text-accent-danger hover:bg-bg-hover",
                  "transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger",
                  "opacity-0 group-hover:opacity-100",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p
          className={cn(
            "text-sm text-text-primary leading-relaxed",
            variant === "compact" && "line-clamp-1",
            variant === "standard" && "line-clamp-3",
            // expanded: no truncation
          )}
        >
          {variant === "expanded" ? unit.content : contentPreview}
        </p>

        {/* Metadata row — standard + expanded */}
        {variant !== "compact" && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Created date */}
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDistanceToNow(unit.createdAt, { addSuffix: true })}
            </span>

            {/* Lifecycle badge — new AILifecycleBadge for draft/pending/confirmed */}
            <AILifecycleBadge lifecycle={unit.lifecycle} size="sm" />

            {/* Branch potential */}
            <BranchPotentialDots score={unit.branchPotential ?? 0} />

            {/* Context tags — placeholder */}
            {unit.contexts?.map((ctx) => (
              <span
                key={ctx}
                className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-text-secondary"
              >
                {ctx}
              </span>
            ))}
          </div>
        )}

        {/* Lifecycle action buttons — draft & pending units */}
        {variant !== "compact" && (isDraft || isPending || unit.lifecycle === "confirmed") && onLifecycleAction && (
          <div className="pt-1">
            <ApproveRejectButtons
              lifecycle={unit.lifecycle as "draft" | "pending" | "confirmed"}
              onApprove={() =>
                onLifecycleAction(
                  unit.id,
                  "approve",
                )
              }
              onReject={() =>
                onLifecycleAction(unit.id, "reject")
              }
              onReset={() =>
                onLifecycleAction(unit.id, "reset")
              }
            />
          </div>
        )}

        {/* Expanded-only sections */}
        {variant === "expanded" && (
          <>
            {/* Provenance */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                {unit.originType && (
                  <span className="inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {unit.originType.replace(/_/g, " ")}
                  </span>
                )}
                {unit.sourceSpan && (
                  <span className="truncate max-w-[200px]">
                    {unit.sourceSpan}
                  </span>
                )}
              </div>
            </div>

            {/* Version history link placeholder */}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                // Placeholder — wired in Story 2.7
              }}
            >
              <History className="h-3 w-3" aria-hidden="true" />
              Version history
            </button>

            {/* Relation list preview placeholder */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-text-tertiary">
                {(unit.relationCount ?? 0) > 0
                  ? `${unit.relationCount} relation${unit.relationCount === 1 ? "" : "s"} — expand to view`
                  : "No relations yet"}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.article>
  );
}
