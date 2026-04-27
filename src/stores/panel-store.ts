import { create } from "zustand";

export type DetailTab = "content" | "connections" | "metadata";

interface PanelState {
  /** Whether the detail panel is open */
  isOpen: boolean;
  /** ID of the currently selected unit */
  selectedUnitId: string | null;
  /** Currently active tab */
  activeTab: DetailTab;
  /** ID of unit shown in spotlight card overlay (null = closed) */
  spotlightUnitId: string | null;
  /** Width of the detail panel in pixels */
  panelWidth: number;

  openPanel: (unitId: string) => void;
  /** Select a unit without opening the detail panel overlay */
  selectUnit: (unitId: string) => void;
  closePanel: () => void;
  /** Close the panel and clear the selected unit ID. */
  clearSelection: () => void;
  /** Toggle open/closed. If a different unitId is passed while open, switches to that unit. */
  togglePanel: (unitId: string) => void;
  setActiveTab: (tab: DetailTab) => void;
  /** Open a unit in the centered card spotlight overlay */
  openSpotlight: (unitId: string) => void;
  closeSpotlight: () => void;
  setPanelWidth: (width: number) => void;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  isOpen: false,
  selectedUnitId: null,
  activeTab: "content",
  spotlightUnitId: null,
  panelWidth: 420,

  openPanel: (unitId) =>
    set({ isOpen: true, selectedUnitId: unitId }),

  selectUnit: (unitId) =>
    set({ selectedUnitId: unitId }),

  closePanel: () =>
    set({ isOpen: false }),

  clearSelection: () =>
    set({ isOpen: false, selectedUnitId: null }),

  togglePanel: (unitId) => {
    const { isOpen, selectedUnitId } = get();
    if (isOpen && selectedUnitId === unitId) {
      set({ isOpen: false });
    } else {
      set({ isOpen: true, selectedUnitId: unitId });
    }
  },

  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  openSpotlight: (unitId) =>
    set({ spotlightUnitId: unitId }),

  closeSpotlight: () =>
    set({ spotlightUnitId: null }),

  setPanelWidth: (width) =>
    set({ panelWidth: Math.min(640, Math.max(320, width)) }),
}));
