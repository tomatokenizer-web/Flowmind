"use client";

import { useEffect, useRef } from "react";
import { useViewStateStore, type ViewState } from "~/stores/viewStateStore";

/**
 * Saves view state on unmount and restores it on mount.
 * Returns the saved state so the caller can apply it (scroll, filters, etc.)
 */
export function useViewStatePreservation(viewId: string): ViewState | null {
  const saveViewState = useViewStateStore((s) => s.saveViewState);
  const restoreViewState = useViewStateStore((s) => s.restoreViewState);

  // Store a ref to the scroll container so we can save/restore scroll position
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Restore on mount
  const restored = restoreViewState(viewId);

  useEffect(() => {
    if (!restored) return;

    // Restore scroll position after paint
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

  // Save on unmount
  useEffect(() => {
    return () => {
      const container =
        scrollContainerRef.current ??
        document.getElementById("main-content");
      const scrollPosition = container
        ? { x: container.scrollLeft, y: container.scrollTop }
        : { x: 0, y: 0 };

      saveViewState(viewId, { scrollPosition });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  return restored;
}
