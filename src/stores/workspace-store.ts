import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type RightPanelContent = "inspector" | "graph" | "compass" | null;
type ViewMode = "list" | "graph" | "reading" | "board" | "thread" | "comparison";

interface WorkspaceState {
  // Current active entities
  activeProjectId: string | null;
  activeInquiryId: string | null;
  activeContextId: string | null;
  activeUnitId: string | null;

  // UI state
  sidebarOpen: boolean;
  sidebarWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  rightPanelContent: RightPanelContent;

  // View mode
  viewMode: ViewMode;

  // Split panel
  splitPanelOpen: boolean;
  splitPanelHighlightId: string | null;

  // Actions
  setActiveProject: (id: string | null) => void;
  setActiveInquiry: (id: string | null) => void;
  setActiveContext: (id: string | null) => void;
  setActiveUnit: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  toggleRightPanel: () => void;
  setRightPanelContent: (content: RightPanelContent) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSplitPanel: () => void;
  setSplitPanelHighlight: (id: string | null) => void;
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 260;
const RIGHT_PANEL_MIN = 240;
const RIGHT_PANEL_MAX = 560;
const RIGHT_PANEL_DEFAULT = 320;

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set) => ({
        // State
        activeProjectId: null,
        activeInquiryId: null,
        activeContextId: null,
        activeUnitId: null,
        sidebarOpen: true,
        sidebarWidth: SIDEBAR_DEFAULT,
        rightPanelOpen: false,
        rightPanelWidth: RIGHT_PANEL_DEFAULT,
        rightPanelContent: null,
        viewMode: "list",
        splitPanelOpen: false,
        splitPanelHighlightId: null,

        // Actions
        setActiveProject: (id) =>
          set(
            { activeProjectId: id, activeInquiryId: null, activeContextId: null, activeUnitId: null },
            false,
            "setActiveProject",
          ),

        setActiveInquiry: (id) =>
          set(
            { activeInquiryId: id, activeContextId: null, activeUnitId: null },
            false,
            "setActiveInquiry",
          ),

        setActiveContext: (id) =>
          set({ activeContextId: id, activeUnitId: null }, false, "setActiveContext"),

        setActiveUnit: (id) =>
          set({ activeUnitId: id }, false, "setActiveUnit"),

        toggleSidebar: () =>
          set(
            (state) => ({ sidebarOpen: !state.sidebarOpen }),
            false,
            "toggleSidebar",
          ),

        setSidebarWidth: (w) =>
          set(
            { sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)) },
            false,
            "setSidebarWidth",
          ),

        toggleRightPanel: () =>
          set(
            (state) => ({ rightPanelOpen: !state.rightPanelOpen }),
            false,
            "toggleRightPanel",
          ),

        setRightPanelContent: (content) =>
          set(
            {
              rightPanelContent: content,
              rightPanelOpen: content !== null,
            },
            false,
            "setRightPanelContent",
          ),

        setViewMode: (mode) =>
          set({ viewMode: mode }, false, "setViewMode"),

        toggleSplitPanel: () =>
          set(
            (state) => ({ splitPanelOpen: !state.splitPanelOpen }),
            false,
            "toggleSplitPanel",
          ),

        setSplitPanelHighlight: (id) =>
          set({ splitPanelHighlightId: id }, false, "setSplitPanelHighlight"),
      }),
      {
        name: "flowmind-workspace",
        partialize: (state) => ({
          activeProjectId: state.activeProjectId,
          sidebarOpen: state.sidebarOpen,
          sidebarWidth: state.sidebarWidth,
          rightPanelWidth: state.rightPanelWidth,
          viewMode: state.viewMode,
        }),
      },
    ),
    { name: "WorkspaceStore" },
  ),
);

export {
  SIDEBAR_MIN,
  SIDEBAR_MAX,
  SIDEBAR_DEFAULT,
  RIGHT_PANEL_MIN,
  RIGHT_PANEL_MAX,
  RIGHT_PANEL_DEFAULT,
};
export type { WorkspaceState, RightPanelContent, ViewMode };
