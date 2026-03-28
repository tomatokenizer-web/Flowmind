"use client";

import * as React from "react";
import { useWorkspaceStore } from "~/stores/workspace-store";
import { useViewHistoryStore } from "~/stores/view-history-store";
import type { ViewMode } from "~/stores/workspace-store";

/* ─── Hook ─── */

interface SwitchViewOptions {
  anchorUnitId?: string;
  viewState?: Record<string, unknown>;
}

interface UseViewSwitchReturn {
  switchView: (mode: ViewMode, options?: SwitchViewOptions) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function useViewSwitch(): UseViewSwitchReturn {
  const { viewMode, activeUnitId, activeContextId, setViewMode, setActiveUnit } =
    useWorkspaceStore();
  const { push, goBack: historyBack, goForward: historyForward, canGoBack, canGoForward } =
    useViewHistoryStore();

  const switchView = React.useCallback(
    (mode: ViewMode, options?: SwitchViewOptions) => {
      // Save current state before switching
      push({
        viewMode,
        anchorUnitId: activeUnitId,
        contextId: activeContextId,
        viewState: {},
        timestamp: Date.now(),
      });

      // Apply new view
      setViewMode(mode);

      // Carry over anchor unit if provided
      if (options?.anchorUnitId !== undefined) {
        setActiveUnit(options.anchorUnitId);
      }
    },
    [viewMode, activeUnitId, activeContextId, push, setViewMode, setActiveUnit],
  );

  const goBack = React.useCallback(() => {
    const entry = historyBack();
    if (!entry) return;
    setViewMode(entry.viewMode as ViewMode);
    setActiveUnit(entry.anchorUnitId);
  }, [historyBack, setViewMode, setActiveUnit]);

  const goForward = React.useCallback(() => {
    const entry = historyForward();
    if (!entry) return;
    setViewMode(entry.viewMode as ViewMode);
    setActiveUnit(entry.anchorUnitId);
  }, [historyForward, setViewMode, setActiveUnit]);

  // Keyboard: Alt+Left / Alt+Right
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.key === "ArrowLeft" && canGoBack) {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight" && canGoForward) {
        e.preventDefault();
        goForward();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoBack, canGoForward, goBack, goForward]);

  return { switchView, goBack, goForward, canGoBack, canGoForward };
}
