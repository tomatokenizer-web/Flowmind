import { create } from "zustand";

interface AssemblyState {
  activeAssemblyId: string | null;
  setActiveAssembly: (id: string | null) => void;
  /** Bridge texts keyed by "unitId" — text shown after that unit in the assembly */
  bridgeTexts: Record<string, string>;
  setBridgeText: (afterUnitId: string, text: string) => void;
  clearBridgeTexts: () => void;
  /** Bulk-initialise bridgeTexts from server data (replaces current state) */
  initBridgeTexts: (texts: Record<string, string>) => void;
}

export const useAssemblyStore = create<AssemblyState>((set) => ({
  activeAssemblyId: null,
  setActiveAssembly: (id) => set({ activeAssemblyId: id, bridgeTexts: {} }),
  bridgeTexts: {},
  setBridgeText: (afterUnitId, text) =>
    set((s) => ({ bridgeTexts: { ...s.bridgeTexts, [afterUnitId]: text } })),
  clearBridgeTexts: () => set({ bridgeTexts: {} }),
  initBridgeTexts: (texts) => set({ bridgeTexts: texts }),
}));
