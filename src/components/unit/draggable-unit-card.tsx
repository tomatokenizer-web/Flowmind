"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "~/lib/utils";
import { UnitCard, type UnitCardProps } from "./unit-card";

// ─── Types ──────────────────────────────────────────────────────────

export interface DraggableUnitCardProps extends UnitCardProps {
  /** Unique ID for dnd-kit (defaults to unit.id) */
  sortableId?: string;
  /** Whether drag is disabled for this card */
  dragDisabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function DraggableUnitCard({
  sortableId,
  dragDisabled = false,
  unit,
  className,
  ...cardProps
}: DraggableUnitCardProps) {
  const id = sortableId ?? unit.id;
  const [isHovered, setIsHovered] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: dragDisabled,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", // spring-like
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        // Dragging state: reduced opacity, dashed placeholder
        isDragging && "opacity-50 z-50",
        // Reduce motion: disable transform animations
        "motion-reduce:!transform-none motion-reduce:!transition-none",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag grip handle — visible on hover, acts as drag activator */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
          "flex items-center justify-center",
          "w-6 h-8 rounded-md",
          "transition-opacity duration-fast",
          "hover:bg-bg-hover active:bg-bg-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          "motion-reduce:transition-none",
          isHovered || isDragging ? "opacity-60" : "opacity-0",
          dragDisabled && "hidden",
        )}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        aria-roledescription="sortable"
      >
        <GripVertical className="h-4 w-4 text-text-tertiary cursor-grab active:cursor-grabbing" />
      </button>

      <UnitCard
        unit={unit}
        className={cn(
          // When being dragged, show dashed border
          isDragging && "border-dashed border-accent-primary/40",
          className,
        )}
        {...cardProps}
      />
    </div>
  );
}

// ─── Drag overlay variant (shown while dragging) ────────────────────

export function DragOverlayCard({ unit, ...cardProps }: UnitCardProps) {
  return (
    <div
      className="opacity-80 shadow-modal rounded-card rotate-[1deg] scale-[1.02] pointer-events-none"
      aria-hidden="true"
    >
      <UnitCard unit={unit} {...cardProps} />
    </div>
  );
}
