"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  GripVertical,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import type { AssemblyItem as AssemblyItemType, AssemblyItemRole } from "~/hooks/use-assembly-editor";

/* ─── Role Config ─── */

const ROLE_OPTIONS: { value: AssemblyItemRole; label: string }[] = [
  { value: "claim", label: "Claim" },
  { value: "support", label: "Support" },
  { value: "example", label: "Example" },
  { value: "transition", label: "Transition" },
  { value: "conclusion", label: "Conclusion" },
  { value: "thesis", label: "Thesis" },
  { value: "evidence", label: "Evidence" },
  { value: "counterargument", label: "Counterargument" },
  { value: "rebuttal", label: "Rebuttal" },
  { value: "setting", label: "Setting" },
  { value: "inciting_event", label: "Inciting Event" },
  { value: "rising_action", label: "Rising Action" },
  { value: "climax", label: "Climax" },
  { value: "resolution", label: "Resolution" },
  { value: "introduction", label: "Introduction" },
  { value: "category", label: "Category" },
  { value: "cross_analysis", label: "Cross-Analysis" },
  { value: "subject_a", label: "Subject A" },
  { value: "subject_b", label: "Subject B" },
  { value: "criteria", label: "Criteria" },
  { value: "synthesis", label: "Synthesis" },
  { value: "source", label: "Source" },
  { value: "theme", label: "Theme" },
  { value: "integration", label: "Integration" },
  { value: "new_insight", label: "New Insight" },
];

function getRoleLabel(role: string): string {
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  return found?.label ?? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

/* ─── Props ─── */

interface AssemblyItemProps {
  item: AssemblyItemType;
  position: number;
  onRoleChange: (itemId: string, role: string) => void;
  onAnnotationChange: (itemId: string, annotation: string) => void;
  onRemove: (itemId: string) => void;
  onClickUnit?: (unitId: string) => void;
}

/* ─── Component ─── */

export function AssemblyItemCard({
  item,
  position,
  onRoleChange,
  onAnnotationChange,
  onRemove,
  onClickUnit,
}: AssemblyItemProps) {
  const [annotationOpen, setAnnotationOpen] = React.useState(!!item.bridgeText);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drop indicator line */}
      {isOver && (
        <div
          className="absolute -top-px left-0 right-0 h-0.5 bg-accent-primary rounded-full z-10"
          aria-hidden="true"
        />
      )}

      <motion.div
        layout
        className={cn(
          "group/item flex gap-2 rounded-lg border p-3",
          "bg-bg-primary",
          "transition-all duration-fast",
          "hover:border-border-focus/30",
          isDragging
            ? "opacity-50 shadow-elevated border-accent-primary/40"
            : "border-border",
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          className={cn(
            "flex shrink-0 items-center justify-center rounded p-0.5",
            "text-text-tertiary hover:text-text-secondary",
            "cursor-grab active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "transition-colors duration-fast",
          )}
          aria-label={`Drag to reorder item ${position + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Position number */}
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            "bg-bg-secondary text-text-tertiary text-xs font-medium",
          )}
          aria-label={`Position ${position + 1}`}
        >
          {position + 1}
        </span>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Unit preview row */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <UnitTypeBadge type={item.unit.primaryType} size="sm" />

                {/* Role dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                        "text-[10px] font-medium leading-tight",
                        "bg-accent-primary/10 text-accent-primary",
                        "hover:bg-accent-primary/20",
                        "transition-colors duration-fast",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      )}
                    >
                      {getRoleLabel(item.assemblyRole)}
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 overflow-y-auto"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <DropdownMenuItem
                        key={role.value}
                        onSelect={() => onRoleChange(item.id, role.value)}
                        className={cn(
                          item.assemblyRole === role.value && "bg-bg-hover",
                        )}
                      >
                        {role.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content preview */}
              <button
                type="button"
                className={cn(
                  "block w-full text-left",
                  "text-sm text-text-primary leading-relaxed line-clamp-2",
                  "hover:text-accent-primary transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:underline",
                )}
                onClick={() => onClickUnit?.(item.unitId)}
                aria-label={`Open unit: ${item.unit.content.slice(0, 60)}`}
              >
                {item.unit.content}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Annotation toggle */}
              <SimpleTooltip content="Add annotation" side="top">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7",
                    annotationOpen
                      ? "text-accent-primary"
                      : "text-text-tertiary opacity-0 group-hover/item:opacity-100",
                    "transition-all duration-fast",
                  )}
                  onClick={() => setAnnotationOpen((prev) => !prev)}
                  aria-label="Toggle annotation"
                  aria-expanded={annotationOpen}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </SimpleTooltip>

              {/* Remove button */}
              <SimpleTooltip content="Remove from assembly" side="top">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-text-tertiary",
                    "opacity-0 group-hover/item:opacity-100",
                    "hover:text-accent-error",
                    "transition-all duration-fast",
                  )}
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove item"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </SimpleTooltip>
            </div>
          </div>

          {/* Annotation textarea (collapsible) */}
          <AnimatePresence>
            {annotationOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <textarea
                  value={item.bridgeText}
                  onChange={(e) =>
                    onAnnotationChange(item.id, e.target.value)
                  }
                  placeholder="Add a note about this unit's role..."
                  rows={2}
                  className={cn(
                    "mt-2 w-full rounded-md border border-border bg-bg-surface",
                    "px-3 py-2 text-xs text-text-secondary",
                    "placeholder:text-text-tertiary",
                    "focus:border-border-focus focus:ring-1 focus:ring-accent-primary/20",
                    "focus:outline-none",
                    "resize-none",
                    "transition-colors duration-fast",
                  )}
                  aria-label="Item annotation"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

AssemblyItemCard.displayName = "AssemblyItemCard";
