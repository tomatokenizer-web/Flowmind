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
  setActiveTab: (tab: DetailTab) => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  selectedUnitId: null,
  activeTab: "content",

  openPanel: (unitId) =>
    set({ isOpen: true, selectedUnitId: unitId }),

  closePanel: () =>
    set({ isOpen: false }),

  setActiveTab: (tab) =>
    set({ activeTab: tab }),
}));
