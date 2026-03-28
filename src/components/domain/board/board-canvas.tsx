"use client";

import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";
import { useBoardState } from "~/hooks/use-board-state";
import type { CardPosition } from "~/hooks/use-board-state";
import { BoardCard, CARD_WIDTH } from "./board-card";
import { BoardRelations } from "./board-relations";
import type { BoardRelation } from "./board-relations";
import { BoardControls } from "./board-controls";
import type { BoardSettings } from "./board-controls";
import { BoardZoneComponent, ZONE_COLORS } from "./board-zone";

/* ─── Constants ─── */

const CARD_ESTIMATED_HEIGHT = 160;
const GRID_SIZE = 20;
const UNIT_LIMIT_WARNING = 40;

/* ─── Dot grid background ─── */

function DotGridPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="board-dot-grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={GRID_SIZE / 2}
            cy={GRID_SIZE / 2}
            r={0.8}
            fill="var(--text-tertiary)"
            opacity={0.2}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#board-dot-grid)" />
    </svg>
  );
}

/* ─── Props ─── */

interface BoardCanvasProps {
  className?: string;
}

/* ─── Component ─── */

export function BoardCanvas({ className }: BoardCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isPanningRef = React.useRef(false);
  const panOriginRef = React.useRef({ x: 0, y: 0, vpX: 0, vpY: 0 });

  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const setActiveUnit = useWorkspaceStore((s) => s.setActiveUnit);
  const selectionToggle = useUnitSelectionStore((s) => s.toggle);

  const board = useBoardState();

  const [settings, setSettings] = React.useState<BoardSettings>({
    showRelationLabels: false,
    showTypeIndicators: true,
    snapToGrid: false,
  });

  /* ─── Data fetching ─── */

  const unitsQuery = api.unit.list.useQuery(
    { projectId: activeProjectId!, contextId: activeContextId ?? undefined, limit: 100 },
    { enabled: !!activeProjectId },
  );

  const unitItems = unitsQuery.data?.items ?? [];
  const unitIds = React.useMemo(() => unitItems.map((u) => u.id), [unitItems]);

  const relationQueries = api.useQueries((t) =>
    unitIds.slice(0, 100).map((uid) =>
      t.relation.list({ unitId: uid }, { enabled: !!uid }),
    ),
  );

  /* ─── Build relations array ─── */

  const relations: BoardRelation[] = React.useMemo(() => {
    const seen = new Map<string, BoardRelation>();
    const unitIdSet = new Set(unitIds);

    for (const q of relationQueries) {
      for (const rel of q.data ?? []) {
        if (
          !seen.has(rel.id) &&
          unitIdSet.has(rel.sourceUnitId) &&
          unitIdSet.has(rel.targetUnitId)
        ) {
          seen.set(rel.id, {
            id: rel.id,
            sourceId: rel.sourceUnitId,
            targetId: rel.targetUnitId,
            type: rel.type,
            layer: `L${(rel as Record<string, unknown>).layer ?? 1}`,
            strength: rel.strength ?? 0.5,
            direction: rel.direction as "one_way" | "bidirectional",
          });
        }
      }
    }

    return [...seen.values()];
  }, [unitIds, relationQueries]);

  /* ─── Simple relation data for layout algorithm ─── */

  const layoutRelations = React.useMemo(
    () =>
      relations.map((r) => ({
        sourceId: r.sourceId,
        targetId: r.targetId,
        strength: r.strength,
      })),
    [relations],
  );

  /* ─── Initialize positions on data load ─── */

  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (unitItems.length === 0 || initializedRef.current) return;

    // Attempt to load from session first
    if (activeContextId && board.loadFromSession(activeContextId)) {
      initializedRef.current = true;
      return;
    }

    // Otherwise, run initial auto-layout
    board.runAutoLayout(unitIds, layoutRelations);
    initializedRef.current = true;
  }, [unitItems.length, unitIds, layoutRelations, activeContextId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when context changes
  React.useEffect(() => {
    initializedRef.current = false;
    board.clearPositions();
  }, [activeContextId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Save to session on changes ─── */

  React.useEffect(() => {
    if (!activeContextId || board.positions.size === 0) return;
    const timer = setTimeout(() => board.saveToSession(activeContextId), 500);
    return () => clearTimeout(timer);
  }, [activeContextId, board.positions, board.zones, board.viewport]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Card rects for relation line computation ─── */

  const cardRects = React.useMemo(() => {
    const rects = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const id of unitIds) {
      const pos = board.positions.get(id);
      if (pos) {
        rects.set(id, {
          x: pos.x,
          y: pos.y,
          width: CARD_WIDTH,
          height: CARD_ESTIMATED_HEIGHT,
        });
      }
    }
    return rects;
  }, [unitIds, board.positions]);

  /* ─── Viewport frustum culling ─── */

  const [containerSize, setContainerSize] = React.useState({ w: 1200, h: 800 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visibleUnitIds = React.useMemo(() => {
    const { x: vpX, y: vpY, scale } = board.viewport;
    const padding = 100;

    // Viewport bounds in canvas coordinates
    const left = -vpX / scale - padding;
    const top = -vpY / scale - padding;
    const right = (containerSize.w - vpX) / scale + padding;
    const bottom = (containerSize.h - vpY) / scale + padding;

    return unitIds.filter((id) => {
      const pos = board.positions.get(id);
      if (!pos) return false;
      return (
        pos.x + CARD_WIDTH >= left &&
        pos.x <= right &&
        pos.y + CARD_ESTIMATED_HEIGHT >= top &&
        pos.y <= bottom
      );
    });
  }, [unitIds, board.positions, board.viewport, containerSize]);

  const visibleUnitsMap = React.useMemo(() => {
    const map = new Map<string, (typeof unitItems)[number]>();
    for (const item of unitItems) {
      map.set(item.id, item);
    }
    return map;
  }, [unitItems]);

  /* ─── Pan (background drag) ─── */

  const handleCanvasPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      // Only pan on direct background click (not on cards/zones)
      if (e.target !== e.currentTarget) return;
      if (e.button !== 0) return;

      isPanningRef.current = true;
      panOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        vpX: board.viewport.x,
        vpY: board.viewport.y,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      (e.currentTarget as HTMLElement).style.cursor = "grabbing";
    },
    [board.viewport.x, board.viewport.y],
  );

  const handleCanvasPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - panOriginRef.current.x;
      const dy = e.clientY - panOriginRef.current.y;

      board.setViewport({
        x: panOriginRef.current.vpX + dx,
        y: panOriginRef.current.vpY + dy,
      });
    },
    [board],
  );

  const handleCanvasPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      (e.currentTarget as HTMLElement).style.cursor = "";
    },
    [],
  );

  /* ─── Zoom (scroll wheel) ─── */

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { x: vpX, y: vpY, scale: oldScale } = board.viewport;

      // Zoom toward cursor position
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.max(0.15, Math.min(3, oldScale * zoomFactor));

      // Adjust translation to keep cursor-point stable
      const newX = mouseX - (mouseX - vpX) * (newScale / oldScale);
      const newY = mouseY - (mouseY - vpY) * (newScale / oldScale);

      board.setViewport({ x: newX, y: newY, scale: newScale });
    },
    [board],
  );

  /* ─── Card interaction handlers ─── */

  const handleCardDragStart = React.useCallback(
    (_id: string, _e: React.PointerEvent) => {
      // No-op: actual drag is handled in BoardCard with pointer events
    },
    [],
  );

  const handleCardDragEnd = React.useCallback(
    (id: string, x: number, y: number) => {
      board.setCardPosition(id, x, y);
    },
    [board],
  );

  const handleCardSelect = React.useCallback(
    (id: string) => {
      selectionToggle(id);
    },
    [selectionToggle],
  );

  const handleCardDoubleClick = React.useCallback(
    (id: string) => {
      setActiveUnit(id);
    },
    [setActiveUnit],
  );

  /* ─── Control handlers ─── */

  const handleFitToScreen = React.useCallback(() => {
    board.fitToScreen(unitIds);
  }, [board, unitIds]);

  const handleAutoLayout = React.useCallback(() => {
    board.runAutoLayout(unitIds, layoutRelations);
  }, [board, unitIds, layoutRelations]);

  const handleSnapToRelation = React.useCallback(() => {
    board.snapToRelation(unitIds, layoutRelations);
  }, [board, unitIds, layoutRelations]);

  /* ─── Zone creation ─── */

  const handleAddZone = React.useCallback(() => {
    const { x: vpX, y: vpY, scale } = board.viewport;
    // Place zone near center of viewport
    const centerX = (containerSize.w / 2 - vpX) / scale;
    const centerY = (containerSize.h / 2 - vpY) / scale;

    const newZone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "New Zone",
      x: centerX - 150,
      y: centerY - 100,
      width: 300,
      height: 200,
      color: ZONE_COLORS[board.zones.length % ZONE_COLORS.length]!.value,
    };

    board.addZone(newZone);
  }, [board, containerSize]);

  /* ─── Loading state ─── */

  if (unitsQuery.isLoading) {
    return (
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className,
        )}
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  animation: `flowmind-dot-bounce 1.4s infinite ${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading board...
          </span>
        </div>
      </div>
    );
  }

  /* ─── Empty state ─── */

  if (unitItems.length === 0) {
    return (
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className,
        )}
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            No units to display
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Create thought units in your active context to use the board view.
          </span>
        </div>
      </div>
    );
  }

  const { x: vpX, y: vpY, scale } = board.viewport;
  const selectedIds = useUnitSelectionStore.getState().selectedUnitIds;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden cursor-grab",
        className,
      )}
      style={{ backgroundColor: "var(--bg-surface)" }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onWheel={handleWheel}
      role="application"
      aria-label="Board canvas - drag to pan, scroll to zoom"
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${vpX % (GRID_SIZE * scale)}px, ${vpY % (GRID_SIZE * scale)}px) scale(${scale})`,
        }}
        aria-hidden="true"
      >
        <DotGridPattern />
      </div>

      {/* Transformed canvas layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${vpX}px, ${vpY}px) scale(${scale})`,
          willChange: "transform",
        }}
      >
        {/* Zones (background layer) */}
        {board.zones.map((zone) => (
          <BoardZoneComponent
            key={zone.id}
            zone={zone}
            onUpdate={board.updateZone}
            onRemove={board.removeZone}
            scale={scale}
          />
        ))}

        {/* Relation lines (SVG behind cards) */}
        <BoardRelations
          relations={relations}
          cardRects={cardRects}
          showLabels={settings.showRelationLabels}
        />

        {/* Cards */}
        {visibleUnitIds.map((id) => {
          const unit = visibleUnitsMap.get(id);
          const pos = board.positions.get(id);
          if (!unit || !pos) return null;

          return (
            <BoardCard
              key={id}
              unit={unit as unknown as import("~/components/domain/unit/unit-card").UnitCardUnit}
              x={pos.x}
              y={pos.y}
              isPinned={pos.pinned}
              isSelected={selectedIds.has(id)}
              onDragStart={handleCardDragStart}
              onDragEnd={handleCardDragEnd}
              onSelect={handleCardSelect}
              onDoubleClick={handleCardDoubleClick}
              onTogglePin={board.togglePin}
              scale={scale}
            />
          );
        })}
      </div>

      {/* Over-limit warning banner */}
      {unitItems.length >= UNIT_LIMIT_WARNING && (
        <div
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30",
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "bg-yellow-500/10 border border-yellow-500/30 text-yellow-700",
            "text-xs font-medium shadow-resting",
          )}
          role="alert"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Board view is optimized for up to 40 units. Performance may degrade
          with {unitItems.length} units.
        </div>
      )}

      {/* Add zone floating button */}
      <button
        type="button"
        className={cn(
          "absolute top-3 right-3 z-20 flex items-center gap-1.5",
          "px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "bg-bg-primary/90 backdrop-blur-sm border border-border",
          "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
          "shadow-resting hover:shadow-hover transition-all duration-150",
        )}
        onClick={handleAddZone}
        aria-label="Add zone"
      >
        <Plus className="h-3.5 w-3.5" />
        Zone
      </button>

      {/* Controls toolbar */}
      <BoardControls
        onZoomIn={board.zoomIn}
        onZoomOut={board.zoomOut}
        onFitToScreen={handleFitToScreen}
        onAutoLayout={handleAutoLayout}
        onSnapToRelation={handleSnapToRelation}
        settings={settings}
        onSettingsChange={setSettings}
        scale={scale}
        unitCount={unitItems.length}
      />
    </div>
  );
}

BoardCanvas.displayName = "BoardCanvas";
