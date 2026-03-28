"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Archive,
  GitBranch,
  Leaf,
  Link2,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { UnitTypeBadge, getUnitTypeConfig } from "./unit-type-badge";
import { UnitLifecycleBadge, getLifecycleConfig } from "./unit-lifecycle-badge";

/* ─── Types ─── */

export interface UnitCardUnit {
  id: string;
  content: string;
  primaryType: string;
  secondaryType?: string | null;
  lifecycle: string;
  aiTrustLevel?: string | null;
  isEvergreen?: boolean;
  isArchived?: boolean;
  contextDependency?: string;
  salience?: number;
  createdAt: Date;
  modifiedAt?: Date;
  tags?: { tag: { id: string; name: string } }[];
  unitTags?: { tag: { id: string; name: string; createdAt?: Date; updatedAt?: Date; projectId?: string; tagType?: string; color?: string | null } }[];
  unitContexts?: { id: string; contextId: string; unitId: string; assignedAt?: Date }[];
  _count?: { perspectives?: number; relations?: number };
}

interface UnitCardProps {
  unit: UnitCardUnit;
  variant?: "compact" | "default" | "expanded";
  showContextBadge?: boolean;
  contextName?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

/* ─── Constants ─── */

const LINE_CLAMP: Record<string, string> = {
  compact: "line-clamp-2",
  default: "line-clamp-3",
  expanded: "",
};

/* ─── Branch Potential Dots ─── */

function BranchDots({
  salience,
  className,
}: {
  salience: number;
  className?: string;
}) {
  const filled = Math.min(4, Math.max(1, Math.round(salience * 4)));
  return (
    <SimpleTooltip content={`Salience: ${Math.round(salience * 100)}%`} side="bottom">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-0.5 rounded px-1 py-0.5",
          "hover:bg-bg-hover transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          className,
        )}
        aria-label={`Branch potential: ${filled} of 4`}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-fast",
              i < filled ? "bg-accent-primary" : "bg-text-tertiary/30",
            )}
            aria-hidden="true"
          />
        ))}
      </button>
    </SimpleTooltip>
  );
}

/* ─── Selection Checkbox ─── */

function SelectionCheckbox({
  checked,
  anySelected,
  onToggle,
}: {
  checked: boolean;
  anySelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
        "transition-all duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        checked
          ? "border-accent-primary bg-accent-primary"
          : "border-border bg-transparent hover:border-text-tertiary",
        /* Visibility: always show when any selected, else only on group hover */
        anySelected ? "opacity-100" : "opacity-0 group-hover/card:opacity-100",
      )}
    >
      {checked && (
        <svg
          className="h-3 w-3 text-white"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

/* ─── UnitCard Component ─── */

export const UnitCard = React.forwardRef<HTMLDivElement, UnitCardProps>(
  (
    {
      unit,
      variant = "default",
      showContextBadge = false,
      contextName,
      isSelected = false,
      onSelect,
      onClick,
      className,
    },
    ref,
  ) => {
    const lifecycleConfig = getLifecycleConfig(unit.lifecycle);
    const typeConfig = getUnitTypeConfig(unit.primaryType);
    const isDraft = unit.lifecycle === "draft";
    const isPending = unit.lifecycle === "pending";
    const isAiGenerated = unit.aiTrustLevel === "inferred";
    const relationCount = unit._count?.relations ?? 0;
    const hasAnySelected = isSelected || (onSelect !== undefined);

    /* Keyboard handler */
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onClick?.(unit.id);
        } else if (e.key === " ") {
          e.preventDefault();
          onSelect?.(unit.id);
        } else if (e.key === "Delete") {
          // Handled upstream — the card itself doesn't archive
        }
      },
      [onClick, onSelect, unit.id],
    );

    const cardContent = (
      <motion.div
        ref={ref}
        role="article"
        tabIndex={0}
        aria-label={`${typeConfig.label} unit: ${unit.content.slice(0, 60)}`}
        aria-selected={isSelected}
        onClick={() => onClick?.(unit.id)}
        onKeyDown={handleKeyDown}
        className={cn(
          "group/card relative rounded-card border p-3",
          "bg-bg-primary",
          "cursor-pointer select-none",
          "transition-all duration-fast ease-default",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          /* Lifecycle border styles */
          isDraft && "border-dashed border-lifecycle-draft-border opacity-80",
          isPending && "border-lifecycle-pending-border",
          !isDraft && !isPending && "border-border",
          /* Hover elevation */
          "hover:shadow-hover hover:border-border-focus/30",
          /* Selected state */
          isSelected && "ring-2 ring-accent-primary ring-offset-1 border-accent-primary",
          /* Archived / discarded dimming */
          unit.isArchived && "opacity-50",
          className,
        )}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Top row: checkbox + type badge + meta */}
        <div className="flex items-start gap-2">
          {onSelect && (
            <SelectionCheckbox
              checked={isSelected}
              anySelected={hasAnySelected}
              onToggle={() => onSelect(unit.id)}
            />
          )}

          <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <UnitTypeBadge
                type={unit.primaryType}
                secondaryType={unit.secondaryType}
                size={variant === "compact" ? "sm" : "md"}
              />

              {/* AI-generated badge */}
              {isAiGenerated && (
                <SimpleTooltip content="AI-generated content" side="top">
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                      "text-[10px] font-medium leading-tight",
                      "bg-accent-primary/10 text-accent-primary",
                    )}
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    AI
                  </span>
                </SimpleTooltip>
              )}

              {/* Evergreen indicator */}
              {unit.isEvergreen && (
                <SimpleTooltip content="Evergreen unit" side="top">
                  <Leaf
                    className="h-3.5 w-3.5 text-accent-success shrink-0"
                    aria-label="Evergreen"
                  />
                </SimpleTooltip>
              )}
            </div>

            {/* Right side meta: branch dots, relation count on hover */}
            <div className="flex items-center gap-1.5 shrink-0">
              {variant !== "compact" && (
                <BranchDots salience={unit.salience ?? 0} />
              )}
            </div>
          </div>
        </div>

        {/* Content preview */}
        <p
          className={cn(
            "mt-2 text-sm text-text-primary leading-relaxed",
            LINE_CLAMP[variant],
            isDraft && "text-text-secondary italic",
          )}
        >
          {unit.content}
        </p>

        {/* Bottom row: tags + context badge + relation count (on hover) */}
        <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
          {/* Tags */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {(unit.tags ?? []).slice(0, 3).map(({ tag }) => (
              <span
                key={tag.id}
                className={cn(
                  "inline-block truncate rounded px-1.5 py-0.5",
                  "text-[10px] font-medium leading-tight",
                  "bg-bg-secondary text-text-tertiary",
                )}
              >
                {tag.name}
              </span>
            ))}
            {(unit.tags ?? []).length > 3 && (
              <span className="text-[10px] text-text-tertiary shrink-0">
                +{(unit.tags ?? []).length - 3}
              </span>
            )}
          </div>

          {/* Relation count — visible on hover */}
          {relationCount > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] text-text-tertiary shrink-0",
                "opacity-0 group-hover/card:opacity-100 transition-opacity duration-fast",
              )}
            >
              <Link2 className="h-3 w-3" aria-hidden="true" />
              {relationCount}
            </span>
          )}

          {/* Context badge */}
          {showContextBadge && contextName && (
            <span
              className={cn(
                "inline-block truncate rounded px-1.5 py-0.5",
                "text-[10px] font-medium leading-tight",
                "bg-bg-hover text-text-tertiary",
                "max-w-[120px]",
              )}
            >
              {contextName}
            </span>
          )}
        </div>

        {/* Draft lifecycle inline actions */}
        {isDraft && variant !== "compact" && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <UnitLifecycleBadge lifecycle={unit.lifecycle} />
          </div>
        )}
      </motion.div>
    );

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => onClick?.(unit.id)}
          >
            <Pencil className="mr-2 h-4 w-4 text-text-tertiary" />
            Edit
          </ContextMenuItem>
          <ContextMenuItem>
            <Scissors className="mr-2 h-4 w-4 text-text-tertiary" />
            Split
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>
            <Plus className="mr-2 h-4 w-4 text-text-tertiary" />
            Add to Assembly
          </ContextMenuItem>
          <ContextMenuItem>
            <GitBranch className="mr-2 h-4 w-4 text-text-tertiary" />
            Open in Context
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>
            <Archive className="mr-2 h-4 w-4 text-text-tertiary" />
            Archive
            <span className="ml-auto text-xs text-text-tertiary">Del</span>
          </ContextMenuItem>
          <ContextMenuItem className="text-accent-error focus:text-accent-error">
            <Trash2 className="mr-2 h-4 w-4" />
            Discard
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
);

UnitCard.displayName = "UnitCard";
