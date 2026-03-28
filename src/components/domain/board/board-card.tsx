"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Pin, PinOff, Pencil, Eye, Trash2, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

interface BoardCardProps {
  unit: UnitCardUnit;
  x: number;
  y: number;
  isPinned: boolean;
  isSelected: boolean;
  onDragStart: (id: string, e: React.PointerEvent) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRemoveFromBoard?: (id: string) => void;
  onAddToZone?: (id: string) => void;
  scale: number;
}

/* ─── Constants ─── */

const CARD_WIDTH = 240;

/* ─── Component ─── */

export const BoardCard = React.memo(function BoardCard({
  unit,
  x,
  y,
  isPinned,
  isSelected,
  onDragStart,
  onDragEnd,
  onSelect,
  onDoubleClick,
  onTogglePin,
  onRemoveFromBoard,
  onAddToZone,
  scale,
}: BoardCardProps) {
  const isDraggingRef = React.useRef(false);
  const dragOriginRef = React.useRef({ x: 0, y: 0, cardX: 0, cardY: 0 });
  const currentPosRef = React.useRef({ x, y });

  // Keep ref in sync with props
  React.useEffect(() => {
    if (!isDraggingRef.current) {
      currentPosRef.current = { x, y };
    }
  }, [x, y]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      isDraggingRef.current = true;
      dragOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        cardX: x,
        cardY: y,
      };

      onDragStart(unit.id, e);

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
    },
    [unit.id, x, y, onDragStart],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();

      const dx = (e.clientX - dragOriginRef.current.x) / scale;
      const dy = (e.clientY - dragOriginRef.current.y) / scale;

      currentPosRef.current = {
        x: dragOriginRef.current.cardX + dx,
        y: dragOriginRef.current.cardY + dy,
      };

      // Apply transform directly for smooth dragging
      const el = e.currentTarget as HTMLElement;
      el.style.transform = `translate(${currentPosRef.current.x}px, ${currentPosRef.current.y}px)`;
    },
    [scale],
  );

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const el = e.currentTarget as HTMLElement;
      el.releasePointerCapture(e.pointerId);

      onDragEnd(unit.id, currentPosRef.current.x, currentPosRef.current.y);
    },
    [unit.id, onDragEnd],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Only select if it wasn't a drag (small movement threshold)
      const dx = Math.abs(e.clientX - dragOriginRef.current.x);
      const dy = Math.abs(e.clientY - dragOriginRef.current.y);
      if (dx < 4 && dy < 4) {
        onSelect(unit.id);
      }
    },
    [unit.id, onSelect],
  );

  const handleDblClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(unit.id);
    },
    [unit.id, onDoubleClick],
  );

  const relationCount = unit._count?.relations ?? 0;

  const cardContent = (
    <motion.div
      role="article"
      tabIndex={0}
      aria-label={`Board card: ${unit.content.slice(0, 60)}`}
      aria-selected={isSelected}
      className={cn(
        "group/bcard absolute rounded-lg border p-2.5 cursor-grab active:cursor-grabbing",
        "bg-bg-primary select-none touch-none",
        "transition-shadow duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        "hover:shadow-hover",
        isSelected &&
          "ring-2 ring-accent-primary border-accent-primary shadow-elevated",
        !isSelected && "border-border",
        isPinned && "border-dashed",
      )}
      style={{
        width: CARD_WIDTH,
        transform: `translate(${x}px, ${y}px)`,
        willChange: "transform",
        contain: "layout style paint",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
      initial={false}
    >
      {/* Pin indicator */}
      {isPinned && (
        <SimpleTooltip content="Pinned (click to unpin)" side="top">
          <button
            type="button"
            className={cn(
              "absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center",
              "rounded-full bg-accent-primary text-white shadow-resting",
              "hover:brightness-110 transition-all duration-150",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(unit.id);
            }}
            aria-label="Unpin card"
          >
            <Pin className="h-2.5 w-2.5" />
          </button>
        </SimpleTooltip>
      )}

      {/* Header: type badge + relation count */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <UnitTypeBadge type={unit.primaryType} secondaryType={unit.secondaryType} size="sm" />
        {relationCount > 0 && (
          <span className="text-[10px] text-text-tertiary tabular-nums">
            {relationCount} rel
          </span>
        )}
      </div>

      {/* Content preview: 4-5 lines */}
      <p
        className={cn(
          "text-xs text-text-primary leading-relaxed line-clamp-5",
          unit.lifecycle === "draft" && "text-text-secondary italic",
        )}
      >
        {unit.content}
      </p>

      {/* Tags (compact) */}
      {(unit.tags ?? []).length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
          {(unit.tags ?? []).slice(0, 2).map(({ tag }) => (
            <span
              key={tag.id}
              className="inline-block truncate rounded px-1 py-0.5 text-[9px] font-medium bg-bg-secondary text-text-tertiary"
            >
              {tag.name}
            </span>
          ))}
          {(unit.tags ?? []).length > 2 && (
            <span className="text-[9px] text-text-tertiary">
              +{(unit.tags ?? []).length - 2}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onTogglePin(unit.id)}>
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4 text-text-tertiary" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4 text-text-tertiary" />
              Pin
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onDoubleClick(unit.id)}>
          <Pencil className="mr-2 h-4 w-4 text-text-tertiary" />
          Open Detail
        </ContextMenuItem>
        {onAddToZone && (
          <ContextMenuItem onSelect={() => onAddToZone(unit.id)}>
            <Plus className="mr-2 h-4 w-4 text-text-tertiary" />
            Add to Zone
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {onRemoveFromBoard && (
          <ContextMenuItem
            className="text-accent-error focus:text-accent-error"
            onSelect={() => onRemoveFromBoard(unit.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove from Board
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

BoardCard.displayName = "BoardCard";

export { CARD_WIDTH };
export type { BoardCardProps };
