import { create } from "zustand";

export type ViewMode = "canvas" | "focus" | "graph";

interface LayoutState {
  /** Currently active view mode */
  viewMode: ViewMode;
  /** Whether sidebar is expanded (true) or collapsed (false) */
  sidebarOpen: boolean;
  /** Whether detail panel is visible */
  detailPanelOpen: boolean;

  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  viewMode: "canvas",
  sidebarOpen: true,
  detailPanelOpen: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleDetailPanel: () => set((s) => ({ detailPanelOpen: !s.detailPanelOpen })),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
}));
