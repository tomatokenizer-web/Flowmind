import { create } from "zustand";
import { devtools } from "zustand/middleware";

/* ─── Types ─── */

export interface ViewHistoryEntry {
  viewMode: "list" | "graph" | "reading" | "board" | "thread" | "comparison";
  anchorUnitId: string | null;
  contextId: string | null;
  /** View-specific state to restore */
  viewState: Record<string, unknown>;
  timestamp: number;
}

interface ViewHistoryState {
  history: ViewHistoryEntry[];
  currentIndex: number;

  push(entry: ViewHistoryEntry): void;
  goBack(): ViewHistoryEntry | null;
  goForward(): ViewHistoryEntry | null;
  canGoBack: boolean;
  canGoForward: boolean;
  current(): ViewHistoryEntry | null;
}

/* ─── Constants ─── */

const MAX_HISTORY = 50;

/* ─── Store ─── */

export const useViewHistoryStore = create<ViewHistoryState>()(
  devtools(
    (set, get) => ({
      history: [],
      currentIndex: -1,

      push: (entry) =>
        set(
          (state) => {
            // Truncate forward history when branching from a non-tail position
            const truncated = state.history.slice(0, state.currentIndex + 1);
            const next = [...truncated, entry];

            // Drop oldest entries beyond max
            const capped = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;

            return {
              history: capped,
              currentIndex: capped.length - 1,
              canGoBack: capped.length > 1,
              canGoForward: false,
            };
          },
          false,
          "push",
        ),

      goBack: () => {
        const state = get();
        if (state.currentIndex <= 0) return null;
        const nextIndex = state.currentIndex - 1;
        const entry = state.history[nextIndex];
        if (!entry) return null;
        set(
          { currentIndex: nextIndex, canGoBack: nextIndex > 0, canGoForward: true },
          false,
          "goBack",
        );
        return entry;
      },

      goForward: () => {
        const state = get();
        if (state.currentIndex >= state.history.length - 1) return null;
        const nextIndex = state.currentIndex + 1;
        const entry = state.history[nextIndex];
        if (!entry) return null;
        set(
          {
            currentIndex: nextIndex,
            canGoBack: true,
            canGoForward: nextIndex < state.history.length - 1,
          },
          false,
          "goForward",
        );
        return entry;
      },

      canGoBack: false,
      canGoForward: false,

      current: () => {
        const state = get();
        return state.history[state.currentIndex] ?? null;
      },
    }),
    { name: "ViewHistoryStore" },
  ),
);
