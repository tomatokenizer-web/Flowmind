import { create } from "zustand";

export type SidebarWidth = 260 | 60 | 0;

interface SidebarState {
  /** Sidebar width: 260 expanded, 60 collapsed (icon-only), 0 hidden */
  sidebarWidth: SidebarWidth;
  /**
   * Currently active context ID, null = "All Units" (no filter).
   *
   * NOTE: This is app-level routing state (which context the user has selected),
   * not sidebar UI state. Ideally this belongs in a dedicated navigation/routing
   * store (e.g. projectStore). It lives here for historical reasons and because
   * it is co-located with the sidebar's expandedNodes tree state. Consider
   * extracting to projectStore or a new navigationStore in a future refactor.
   */
  activeContextId: string | null;
  /** Set of expanded tree node IDs */
  expandedNodes: Set<string>;

  toggleSidebar: () => void;
  setSidebarWidth: (width: SidebarWidth) => void;
  setActiveContext: (id: string | null) => void;
  toggleNode: (id: string) => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
}

const SIDEBAR_WIDTH_CYCLE: Record<SidebarWidth, SidebarWidth> = {
  260: 60,
  60: 0,
  0: 260,
};

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarWidth: 260,
  activeContextId: null,
  expandedNodes: new Set<string>(),

  toggleSidebar: () =>
    set((s) => ({ sidebarWidth: SIDEBAR_WIDTH_CYCLE[s.sidebarWidth] })),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  setActiveContext: (id) => set({ activeContextId: id }),

  toggleNode: (id) =>
    set((s) => {
      const next = new Set(s.expandedNodes);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedNodes: next };
    }),

  expandNode: (id) =>
    set((s) => {
      const next = new Set(s.expandedNodes);
      next.add(id);
      return { expandedNodes: next };
    }),

  collapseNode: (id) =>
    set((s) => {
      const next = new Set(s.expandedNodes);
      next.delete(id);
      return { expandedNodes: next };
    }),
}));
