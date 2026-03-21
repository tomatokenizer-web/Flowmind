"use client";

import { useEffect, useRef, useCallback } from "react";
import { useViewStateStore, type ViewState } from "~/stores/viewStateStore";

/**
 * Return type for the view state preservation hook.
 * Provides the restored state plus helpers to update individual pieces.
 */
export interface ViewStatePreservationResult {
  /** The restored view state, or null if none was saved */
  restored: ViewState | null;
  /** Ref to attach to the scrollable container for automatic scroll tracking */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Manually update the selected unit IDs in the saved state */
  saveSelectedUnitIds: (ids: string[]) => void;
  /** Manually update the zoom level in the saved state */
  saveZoomLevel: (zoom: number) => void;
  /** Manually update the filter state */
  saveFilterState: (filters: Record<string, unknown>) => void;
  /** Manually update the open panels list */
  saveOpenPanels: (panels: string[]) => void;
}

/**
 * Saves view state on unmount and restores it on mount.
 *
 * Preserves:
 * - Scroll position (x, y)
 * - Selected unit IDs
 * - Zoom level
 * - Open panel IDs
 * - Filter state (arbitrary key-value)
 *
 * State is persisted to sessionStorage via the viewStateStore (Zustand + persist).
 * States expire after 30 minutes of inactivity.
 */
export function useViewStatePreservation(
  viewId: string,
): ViewStatePreservationResult {
  const saveViewState = useViewStateStore((s) => s.saveViewState);
  const restoreViewState = useViewStateStore((s) => s.restoreViewState);

  // Store a ref to the scroll container so we can save/restore scroll position
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Keep a ref of the latest partial state so we can save on unmount
  const liveStateRef = useRef<Partial<ViewState>>({});

  // Restore on mount
  const restored = restoreViewState(viewId);

  // Restore scroll position after paint
  useEffect(() => {
    if (!restored) return;

    requestAnimationFrame(() => {
      const container =
        scrollContainerRef.current ??
        document.getElementById("main-content");
      if (container) {
        container.scrollLeft = restored.scrollPosition.x;
        container.scrollTop = restored.scrollPosition.y;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  // Save on unmount — captures scroll position + any live state updates
  useEffect(() => {
    return () => {
      const container =
        scrollContainerRef.current ??
        document.getElementById("main-content");
      const scrollPosition = container
        ? { x: container.scrollLeft, y: container.scrollTop }
        : { x: 0, y: 0 };

      saveViewState(viewId, {
        scrollPosition,
        ...liveStateRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  // Incremental save helpers — update both the live ref and the store

  const saveSelectedUnitIds = useCallback(
    (ids: string[]) => {
      liveStateRef.current.selectedUnitIds = ids;
      saveViewState(viewId, { selectedUnitIds: ids });
    },
    [viewId, saveViewState],
  );

  const saveZoomLevel = useCallback(
    (zoom: number) => {
      liveStateRef.current.zoomLevel = zoom;
      saveViewState(viewId, { zoomLevel: zoom });
    },
    [viewId, saveViewState],
  );

  const saveFilterState = useCallback(
    (filters: Record<string, unknown>) => {
      liveStateRef.current.filterState = filters;
      saveViewState(viewId, { filterState: filters });
    },
    [viewId, saveViewState],
  );

  const saveOpenPanels = useCallback(
    (panels: string[]) => {
      liveStateRef.current.openPanels = panels;
      saveViewState(viewId, { openPanels: panels });
    },
    [viewId, saveViewState],
  );

  return {
    restored,
    scrollContainerRef,
    saveSelectedUnitIds,
    saveZoomLevel,
    saveFilterState,
    saveOpenPanels,
  };
}
