import { create } from "zustand";

interface SelectionState {
  /** Currently selected unit ID — synced across all views */
  selectedUnitId: string | null;
  setSelectedUnit: (id: string) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedUnitId: null,
  setSelectedUnit: (id) => set({ selectedUnitId: id }),
  clearSelection: () => set({ selectedUnitId: null }),
}));
