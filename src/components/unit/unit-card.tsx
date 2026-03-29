"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { motion } from "framer-motion";
import { GripVertical, Link2, Clock, History, ExternalLink, X, Scissors, Pin, Flag, Trash2 } from "lucide-react";
import { FlowAlertBadge } from "./FlowAlertBadge";
import { NudgeBadge } from "./NudgeBadge";
import { BranchPotentialPopover, BranchPotentialDots } from "./BranchPotentialPopover";
import { DriftIndicator } from "~/components/drift/DriftIndicator";
import { UnitAIActionsMenu } from "./UnitAIActionsMenu";
import { usePanelStore } from "~/stores/panel-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { formatDistanceToNow } from "date-fns";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { UnitTypeBadge } from "./unit-type-badge";
import { LifecycleIndicator, type LifecycleState } from "./lifecycle-indicator";
import { AILifecycleBadge } from "./lifecycle-badge";
import { AIBadge } from "./ai-badge";
import { ApproveRejectButtons } from "./approve-reject-buttons";
import { UnitSplitDialog } from "./UnitSplitDialog";
import { LinkToDialog } from "./LinkToDialog";
import type { SplitReattributionProposal } from "~/server/ai";

// ─── Types ───────────────────────────────────────────────────────────

export type UnitCardVariant = "compact" | "standard" | "expanded";

export type Stance = "support" | "oppose" | "neutral" | "exploring";

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
  importance?: number;
  pinned?: boolean;
  flagged?: boolean;
  driftScore?: number;
  /** Perspective stance within the active context */
  stance?: Stance | null;
  /** Perspective importance within the active context (0-1) */
  perspectiveImportance?: number | null;
}

export interface UnitCardProps {
  unit: UnitCardUnit;
  variant?: UnitCardVariant;
  selected?: boolean;
  onClick?: (unit: UnitCardUnit) => void;
  onLifecycleAction?: (unitId: string, action: "approve" | "reject" | "reset") => void;
  /** When provided, shows "Remove from Context" in the context menu */
  onRemoveFromContext?: () => void;
  /** When provided, shows a delete button on hover */
  onDelete?: () => void;
  /** Project ID for split functionality - required to create new units */
  projectId?: string;
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

// ─── Stance Badge ────────────────────────────────────────────────────

const STANCE_CONFIG: Record<Stance, { label: string; className: string }> = {
  support:   { label: "Support",   className: "bg-[--accent-success]/15 text-[--accent-success]" },
  oppose:    { label: "Oppose",    className: "bg-[--accent-error]/15 text-[--accent-error]" },
  neutral:   { label: "Neutral",   className: "bg-[--bg-secondary] text-[--text-secondary]" },
  exploring: { label: "Exploring", className: "bg-[--accent-warning]/15 text-[--accent-warning]" },
};

function StanceBadge({ stance }: { stance: Stance }) {
  const config = STANCE_CONFIG[stance];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        config.className,
      )}
      aria-label={`Stance: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

// ─── Perspective Importance Badge ────────────────────────────────────

function PerspectiveImportanceBadge({ value }: { value: number }) {
  // Map 0-1 to 1-5 filled stars
  const filled = Math.round(value * 5);
  if (filled === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-px text-[10px] leading-none text-accent-warning"
      aria-label={`Perspective importance: ${filled} of 5`}
      title={`Importance: ${Math.round(value * 100)}%`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < filled ? "text-accent-warning" : "text-text-tertiary/40"}
          aria-hidden="true"
        >
          {i < filled ? "\u2605" : "\u2606"}
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
  onDelete,
  projectId,
  className,
}: UnitCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = React.useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const openPanel = usePanelStore((s) => s.openPanel);
  const openSpotlight = usePanelStore((s) => s.openSpotlight);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const isSelected = selectedUnitId === unit.id;

  const utils = api.useUtils();

  // Pin/flag mutations
  const updateMutation = api.unit.update.useMutation({
    onSuccess: () => void utils.unit.list.invalidate(),
  });

  // Mutations for split functionality
  const createUnit = api.unit.create.useMutation({
    onSuccess: () => void utils.unit.list.invalidate(),
  });
  const lifecycleTransition = api.unit.lifecycleTransition.useMutation({
    onSuccess: () => void utils.unit.list.invalidate(),
  });

  // Handle split confirmation - creates two new units and archives the original
  const handleSplitConfirm = React.useCallback(
    async (params: {
      contentA: string;
      contentB: string;
      proposals: SplitReattributionProposal[];
    }) => {
      if (!projectId) return;

      // Create first split unit (using ai_refined as it's derived from existing content)
      await createUnit.mutateAsync({
        content: params.contentA,
        unitType: unit.unitType,
        lifecycle: "draft",
        originType: "ai_refined",
        sourceSpan: { splitFrom: unit.id, part: "A" },
        projectId,
      });

      // Create second split unit
      await createUnit.mutateAsync({
        content: params.contentB,
        unitType: unit.unitType,
        lifecycle: "draft",
        originType: "ai_refined",
        sourceSpan: { splitFrom: unit.id, part: "B" },
        projectId,
      });

      // Archive the original unit
      await lifecycleTransition.mutateAsync({
        id: unit.id,
        targetState: "archived",
      });
    },
    [createUnit, lifecycleTransition, unit.id, unit.unitType, projectId]
  );

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
      onClick={() => { openPanel(unit.id); onClick?.(unit); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openPanel(unit.id);
          onClick?.(unit);
        } else if (e.key === " ") {
          e.preventDefault();
          openSpotlight(unit.id);
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
            {unit.stance && unit.stance !== "neutral" && (
              <StanceBadge stance={unit.stance} />
            )}
            {unit.perspectiveImportance != null && unit.perspectiveImportance > 0.1 && (
              <PerspectiveImportanceBadge value={unit.perspectiveImportance} />
            )}
          </div>
          {/* Hover-only actions — standard variant hides until hover */}
          <div className={cn(
            "flex items-center gap-2",
            variant === "standard" && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150",
          )}>
            {variant !== "compact" && (unit.relationCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs text-text-secondary"
                aria-label={`${unit.relationCount} relations`}
              >
                <Link2 className="h-3 w-3" aria-hidden="true" />
                {unit.relationCount}
              </span>
            )}
            {/* AI actions menu */}
            {variant !== "compact" && (
              <span onClick={(e) => e.stopPropagation()}>
                <UnitAIActionsMenu
                  unit={{ id: unit.id, content: unit.content, unitType: unit.unitType }}
                  contextId={activeContextId ?? undefined}
                  onCreateUnit={(content, type) => {
                    if (!projectId) return;
                    createUnit.mutate({
                      content,
                      unitType: type as UnitType,
                      lifecycle: "draft",
                      originType: "ai_refined",
                      sourceSpan: { derivedFrom: unit.id },
                      projectId,
                    }, {
                      onSuccess: () => toast.success("Unit created from AI suggestion"),
                    });
                  }}
                  onUpdateUnit={(id, updates) => {
                    updateMutation.mutate({
                      id,
                      ...(updates.content && { content: updates.content }),
                      ...(updates.unitType && { unitType: updates.unitType as UnitType }),
                    }, {
                      onSuccess: () => toast.success("Unit updated"),
                    });
                  }}
                />
              </span>
            )}

            {/* Link to... button — opens manual relation dialog */}
            {variant !== "compact" && (
              <button
                type="button"
                aria-label="Link to another unit"
                title="Link to..."
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkDialogOpen(true);
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded p-0.5",
                  "text-text-tertiary hover:text-accent-primary hover:bg-bg-hover",
                  "transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Pin button */}
            <button
              type="button"
              aria-label={unit.pinned ? "Unpin unit" : "Pin unit"}
              onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: unit.id, pinned: !unit.pinned }); }}
              className={cn(
                "inline-flex items-center justify-center rounded p-0.5 transition-colors",
                unit.pinned ? "text-accent-primary" : "text-text-tertiary hover:text-accent-primary",
              )}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>

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
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Delete unit */}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete unit"
                title="Delete unit"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded p-0.5",
                  "text-text-tertiary hover:text-accent-danger hover:bg-bg-hover",
                  "transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger",
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
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
            {/* Created date — always visible */}
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDistanceToNow(unit.createdAt, { addSuffix: true })}
            </span>

            {/* Lifecycle badge — always visible */}
            <AILifecycleBadge lifecycle={unit.lifecycle} size="sm" />

            {/* Hover-only metadata — standard variant fades in on hover */}
            <div className={cn(
              "contents",
              variant === "standard" && "[&>*]:opacity-0 [&>*]:group-hover:opacity-100 [&>*]:group-focus-within:opacity-100 [&>*]:transition-opacity [&>*]:duration-150",
            )}>
              {/* Branch potential — clickable popover with live computed score */}
              <BranchPotentialPopover unitId={unit.id}>
                {(score, reasons) => (
                  <button
                    type="button"
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
                  >
                    <BranchPotentialDots score={score} reasons={reasons} />
                  </button>
                )}
              </BranchPotentialPopover>

              {/* Flow alert */}
              <FlowAlertBadge unitType={unit.unitType} relationCount={unit.relationCount ?? 0} />

              {/* Inline nudge hints (client-side pattern matching, no AI) */}
              <NudgeBadge
                unitType={unit.unitType}
                content={unit.content}
                lifecycle={unit.lifecycle}
                relationCount={unit.relationCount ?? 0}
              />

              {/* Drift indicator */}
              <DriftIndicator driftScore={unit.driftScore ?? 0} />

              {/* ThoughtRank importance bar */}
              {(unit.importance ?? 0) > 0.1 && (
                <div className="h-0.5 w-12 rounded-full bg-bg-secondary overflow-hidden" title={`Importance: ${Math.round((unit.importance ?? 0) * 100)}%`}>
                  <div className="h-full bg-accent-primary rounded-full" style={{ width: `${(unit.importance ?? 0) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Context tags — always visible */}
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

            {/* Action buttons row */}
            <div className="flex items-center gap-3">
              {/* Version history — opens detail panel on history tab */}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  openPanel(unit.id);
                }}
              >
                <History className="h-3 w-3" aria-hidden="true" />
                Version history
              </button>

              {/* Split unit button - only shown when projectId is available */}
              {projectId && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSplitDialogOpen(true);
                  }}
                >
                  <Scissors className="h-3 w-3" aria-hidden="true" />
                  Split
                </button>
              )}
            </div>

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

      {/* Importance score bar — subtle indicator at bottom of card */}
      {(unit.importance ?? 0) > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-bg-secondary overflow-hidden rounded-b-card"
          aria-label={`Importance: ${Math.round((unit.importance ?? 0) * 100)}%`}
        >
          <div
            className="h-full bg-accent-primary/60 transition-all duration-300"
            style={{ width: `${(unit.importance ?? 0) * 100}%` }}
          />
        </div>
      )}

      {/* Split dialog */}
      <UnitSplitDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        unit={{
          id: unit.id,
          content: unit.content,
          unitType: unit.unitType,
        }}
        onConfirm={handleSplitConfirm}
      />

      {/* Link to dialog */}
      <LinkToDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        sourceUnit={{ id: unit.id, content: unit.content }}
        projectId={projectId}
      />
    </motion.article>
  );
}
