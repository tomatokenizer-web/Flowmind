import { create } from "zustand";

export type DetailTab = "content" | "relations" | "metadata" | "ai" | "provenance";

interface PanelState {
  /** Whether the detail panel is open */
  isOpen: boolean;
  /** ID of the currently selected unit */
  selectedUnitId: string | null;
  /** Currently active tab */
  activeTab: DetailTab;

  openPanel: (unitId: string) => void;
  closePanel: () => void;
  /** Toggle open/closed. If a different unitId is passed while open, switches to that unit. */
  togglePanel: (unitId: string) => void;
  setActiveTab: (tab: DetailTab) => void;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  isOpen: false,
  selectedUnitId: null,
  activeTab: "content",

  openPanel: (unitId) =>
    set({ isOpen: true, selectedUnitId: unitId }),

  closePanel: () =>
    set({ isOpen: false }),

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
}));
