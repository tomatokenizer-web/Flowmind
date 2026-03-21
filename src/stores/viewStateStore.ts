import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ViewState {
  scrollPosition: { x: number; y: number };
  selectedUnitIds: string[];
  openPanels: string[];
  filterState: Record<string, unknown>;
  zoomLevel: number;
  /** Timestamp of when this state was last saved */
  savedAt: number;
}

const DEFAULT_VIEW_STATE: ViewState = {
  scrollPosition: { x: 0, y: 0 },
  selectedUnitIds: [],
  openPanels: [],
  filterState: {},
  zoomLevel: 1,
  savedAt: 0,
};

/** Max age for a saved view state (30 minutes) */
const MAX_STATE_AGE_MS = 30 * 60 * 1000;

interface ViewStateStore {
  /** View states keyed by route/view identifier */
  viewStates: Record<string, ViewState>;
  saveViewState: (viewId: string, state: Partial<ViewState>) => void;
  restoreViewState: (viewId: string) => ViewState | null;
  clearViewState: (viewId: string) => void;
  clearAllViewStates: () => void;
}

export const useViewStateStore = create<ViewStateStore>()(
  persist(
    (set, get) => ({
      viewStates: {},

      saveViewState: (viewId, state) =>
        set((s) => ({
          viewStates: {
            ...s.viewStates,
            [viewId]: {
              ...(s.viewStates[viewId] ?? DEFAULT_VIEW_STATE),
              ...state,
              savedAt: Date.now(),
            },
          },
        })),

      restoreViewState: (viewId) => {
        const stored = get().viewStates[viewId];
        if (!stored) return null;

        // Expire stale states
        if (Date.now() - stored.savedAt > MAX_STATE_AGE_MS) {
          get().clearViewState(viewId);
          return null;
        }

        return stored;
      },

      clearViewState: (viewId) =>
        set((s) => {
          const next = { ...s.viewStates };
          delete next[viewId];
          return { viewStates: next };
        }),

      clearAllViewStates: () => set({ viewStates: {} }),
    }),
    {
      name: "flowmind-view-states",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the viewStates map, not the actions
      partialize: (state) => ({ viewStates: state.viewStates }),
    },
  ),
);
