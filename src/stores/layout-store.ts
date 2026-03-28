import { create } from "zustand";

export type ViewMode = "canvas" | "graph" | "thread" | "assembly" | "navigate" | "attention";

interface LayoutState {
  /** Currently active view mode */
  viewMode: ViewMode;

  setViewMode: (mode: ViewMode) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  viewMode: "canvas",

  setViewMode: (mode) => set({ viewMode: mode }),
}));
