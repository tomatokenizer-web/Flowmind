"use client";

import * as React from "react";
import { X, GripHorizontal, Palette } from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { BoardZone as BoardZoneType } from "~/hooks/use-board-state";

/* ─── Types ─── */

interface BoardZoneProps {
  zone: BoardZoneType;
  onUpdate: (id: string, updates: Partial<Omit<BoardZoneType, "id">>) => void;
  onRemove: (id: string) => void;
  scale: number;
}

/* ─── Preset colors ─── */

const ZONE_COLORS = [
  { label: "Blue", value: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" },
  { label: "Green", value: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
  { label: "Orange", value: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
  { label: "Purple", value: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)" },
  { label: "Teal", value: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.25)" },
  { label: "Pink", value: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)" },
  { label: "Yellow", value: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  { label: "Gray", value: "rgba(128,128,128,0.06)", border: "rgba(128,128,128,0.20)" },
];

function getBorderColor(bgColor: string): string {
  const preset = ZONE_COLORS.find((c) => c.value === bgColor);
  return preset?.border ?? "rgba(128,128,128,0.20)";
}

/* ─── Component ─── */

export const BoardZoneComponent = React.memo(function BoardZoneComponent({
  zone,
  onUpdate,
  onRemove,
  scale,
}: BoardZoneProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const isDraggingRef = React.useRef(false);
  const isResizingRef = React.useRef(false);
  const dragOriginRef = React.useRef({ x: 0, y: 0, zoneX: 0, zoneY: 0 });
  const resizeOriginRef = React.useRef({ x: 0, y: 0, w: 0, h: 0 });

  const borderColor = getBorderColor(zone.color);

  /* ─── Name editing ─── */

  const handleNameDoubleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  }, []);

  const handleNameBlur = React.useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleNameKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditing(false);
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [],
  );

  const handleNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(zone.id, { name: e.target.value });
    },
    [zone.id, onUpdate],
  );

  /* ─── Zone dragging (via grip handle) ─── */

  const handleDragPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      isDraggingRef.current = true;
      dragOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        zoneX: zone.x,
        zoneY: zone.y,
      };

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
    },
    [zone.x, zone.y],
  );

  const handleDragPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();

      const dx = (e.clientX - dragOriginRef.current.x) / scale;
      const dy = (e.clientY - dragOriginRef.current.y) / scale;

      onUpdate(zone.id, {
        x: dragOriginRef.current.zoneX + dx,
        y: dragOriginRef.current.zoneY + dy,
      });
    },
    [zone.id, scale, onUpdate],
  );

  const handleDragPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = false;
      const el = e.currentTarget as HTMLElement;
      el.releasePointerCapture(e.pointerId);
    },
    [],
  );

  /* ─── Zone resizing (bottom-right corner) ─── */

  const handleResizePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      isResizingRef.current = true;
      resizeOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: zone.width,
        h: zone.height,
      };

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
    },
    [zone.width, zone.height],
  );

  const handleResizePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isResizingRef.current) return;
      e.stopPropagation();

      const dx = (e.clientX - resizeOriginRef.current.x) / scale;
      const dy = (e.clientY - resizeOriginRef.current.y) / scale;

      const newW = Math.max(120, resizeOriginRef.current.w + dx);
      const newH = Math.max(80, resizeOriginRef.current.h + dy);

      onUpdate(zone.id, { width: newW, height: newH });
    },
    [zone.id, scale, onUpdate],
  );

  const handleResizePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      isResizingRef.current = false;
      const el = e.currentTarget as HTMLElement;
      el.releasePointerCapture(e.pointerId);
    },
    [],
  );

  return (
    <div
      className="absolute rounded-xl"
      style={{
        left: 0,
        top: 0,
        width: zone.width,
        height: zone.height,
        transform: `translate(${zone.x}px, ${zone.y}px)`,
        backgroundColor: zone.color,
        border: `1.5px dashed ${borderColor}`,
        contain: "layout style",
        zIndex: -1,
      }}
      aria-label={`Zone: ${zone.name}`}
    >
      {/* Header bar */}
      <div
        className={cn(
          "absolute -top-0.5 left-2 right-2 flex items-center gap-1",
          "transform -translate-y-full pb-0.5",
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded",
            "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/50",
            "cursor-grab active:cursor-grabbing touch-none",
            "transition-colors duration-150",
          )}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          aria-label="Drag zone"
        >
          <GripHorizontal className="h-3 w-3" />
        </button>

        {/* Zone name */}
        {isEditing ? (
          <input
            ref={nameInputRef}
            type="text"
            value={zone.name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className={cn(
              "flex-1 min-w-0 px-1 py-0 text-xs font-medium rounded",
              "bg-bg-primary border border-border-focus",
              "text-text-primary outline-none",
            )}
            aria-label="Zone name"
          />
        ) : (
          <span
            className="flex-1 min-w-0 truncate text-xs font-medium text-text-secondary cursor-text select-none"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to rename"
          >
            {zone.name}
          </span>
        )}

        {/* Color picker toggle */}
        <SimpleTooltip content="Change color" side="top">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center h-5 w-5 rounded",
              "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/50",
              "transition-colors duration-150",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
            }}
            aria-label="Change zone color"
          >
            <Palette className="h-3 w-3" />
          </button>
        </SimpleTooltip>

        {/* Remove zone */}
        <SimpleTooltip content="Remove zone" side="top">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center h-5 w-5 rounded",
              "text-text-tertiary hover:text-accent-error hover:bg-accent-error/10",
              "transition-colors duration-150",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(zone.id);
            }}
            aria-label="Remove zone"
          >
            <X className="h-3 w-3" />
          </button>
        </SimpleTooltip>
      </div>

      {/* Color picker popup */}
      {showColorPicker && (
        <div
          className={cn(
            "absolute top-1 left-2 z-30 flex gap-1 p-1.5 rounded-lg",
            "bg-bg-primary border border-border shadow-elevated",
          )}
        >
          {ZONE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-all duration-150",
                zone.color === c.value
                  ? "border-text-primary scale-110"
                  : "border-transparent hover:scale-110",
              )}
              style={{ backgroundColor: c.border }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(zone.id, { color: c.value });
                setShowColorPicker(false);
              }}
              aria-label={`Set zone color to ${c.label}`}
            />
          ))}
        </div>
      )}

      {/* Resize handle (bottom-right) */}
      <div
        className={cn(
          "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize touch-none",
          "opacity-0 hover:opacity-100 transition-opacity duration-150",
        )}
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${borderColor} 50%)`,
          borderRadius: "0 0 10px 0",
        }}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        aria-label="Resize zone"
      />
    </div>
  );
});

BoardZoneComponent.displayName = "BoardZoneComponent";

export { ZONE_COLORS };
