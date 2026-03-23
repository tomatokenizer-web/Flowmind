import { create } from "zustand";

export type ViewMode = "canvas" | "graph" | "thread" | "assembly";

interface LayoutState {
  /** Currently active view mode */
  viewMode: ViewMode;
  /** Whether sidebar is expanded (true) or collapsed (false) */
  sidebarOpen: boolean;

  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  viewMode: "canvas",
  sidebarOpen: true,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
