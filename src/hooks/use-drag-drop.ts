"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Modifier } from "@dnd-kit/core";

export { DndContext, SortableContext, arrayMove };
export { verticalListSortingStrategy };

/** Restricts drag movement to the vertical axis only */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

export { restrictToVerticalAxis };

// ─── Screen-reader announcements ────────────────────────────────────

const announcements = {
  onDragStart({ active }: DragStartEvent) {
    return `Picked up unit ${active.id}. Use arrow keys to move, Space to drop, Escape to cancel.`;
  },
  onDragOver({ active, over }: DragOverEvent) {
    if (over) {
      return `Unit ${active.id} is over position ${over.id}.`;
    }
    return `Unit ${active.id} is no longer over a droppable area.`;
  },
  onDragEnd({ active, over }: DragEndEvent) {
    if (over) {
      return `Unit ${active.id} was dropped at position ${over.id}.`;
    }
    return `Unit ${active.id} was dropped.`;
  },
  onDragCancel({ active }: { active: { id: string | number } }) {
    return `Dragging was cancelled. Unit ${active.id} was returned to its original position.`;
  },
};

// ─── Hook ───────────────────────────────────────────────────────────

interface UseDragDropOptions<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[], activeId: string, fromIndex: number, toIndex: number) => void;
}

interface UseDragDropReturn<T extends { id: string }> {
  /** Configured sensors (pointer + keyboard) */
  sensors: ReturnType<typeof useSensors>;
  /** The ID of the currently dragged item, or null */
  activeId: string | null;
  /** The currently dragged item, or null */
  activeItem: T | null;
  /** Optimistically reordered items — reflects drag result immediately before server confirms */
  optimisticItems: T[];
  /** Props to spread on DndContext */
  dndContextProps: {
    sensors: ReturnType<typeof useSensors>;
    collisionDetection: typeof closestCenter;
    modifiers: Modifier[];
    accessibility: { announcements: typeof announcements };
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onDragCancel: () => void;
  };
  /** Item IDs for SortableContext */
  itemIds: string[];
}

export function useDragDrop<T extends { id: string }>({
  items,
  onReorder,
}: UseDragDropOptions<T>): UseDragDropReturn<T> {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic local order — immediately reflects drag results
  const [optimisticItems, setOptimisticItems] = useState<T[]>(items);

  // Keep optimistic items in sync when items prop changes (e.g. after server invalidation)
  React.useEffect(() => {
    if (activeId === null) {
      setOptimisticItems(items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 5px movement before drag starts (prevents accidental drags)
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const fromIndex = optimisticItems.findIndex((item) => item.id === active.id);
      const toIndex = optimisticItems.findIndex((item) => item.id === over.id);

      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = arrayMove(optimisticItems, fromIndex, toIndex);
      // Apply optimistic UI immediately — server mutation runs in parallel
      setOptimisticItems(reordered);
      onReorder(reordered, String(active.id), fromIndex, toIndex);
    },
    [optimisticItems, onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeItem = activeId
    ? optimisticItems.find((item) => item.id === activeId) ?? null
    : null;

  const itemIds = optimisticItems.map((item) => item.id);

  return {
    sensors,
    activeId,
    activeItem,
    optimisticItems,
    dndContextProps: {
      sensors,
      collisionDetection: closestCenter,
      modifiers: [restrictToVerticalAxis] as const,
      accessibility: { announcements },
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragCancel: handleDragCancel,
    },
    itemIds,
  };
}
