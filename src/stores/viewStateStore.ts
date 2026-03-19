import { create } from "zustand";

export interface ViewState {
  scrollPosition: { x: number; y: number };
  selectedUnitIds: string[];
  openPanels: string[];
  filterState: Record<string, unknown>;
  zoomLevel: number;
}

const DEFAULT_VIEW_STATE: ViewState = {
  scrollPosition: { x: 0, y: 0 },
  selectedUnitIds: [],
  openPanels: [],
  filterState: {},
  zoomLevel: 1,
};

interface ViewStateStore {
  /** View states keyed by route/view identifier */
  viewStates: Record<string, ViewState>;
  saveViewState: (viewId: string, state: Partial<ViewState>) => void;
  restoreViewState: (viewId: string) => ViewState | null;
  clearViewState: (viewId: string) => void;
}

export const useViewStateStore = create<ViewStateStore>((set, get) => ({
  viewStates: {},

  saveViewState: (viewId, state) =>
    set((s) => ({
      viewStates: {
        ...s.viewStates,
        [viewId]: {
          ...(s.viewStates[viewId] ?? DEFAULT_VIEW_STATE),
          ...state,
        },
      },
    })),

  restoreViewState: (viewId) => {
    return get().viewStates[viewId] ?? null;
  },

  clearViewState: (viewId) =>
    set((s) => {
      const next = { ...s.viewStates };
      delete next[viewId];
      return { viewStates: next };
    }),
}));
