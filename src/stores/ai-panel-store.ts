import { create } from "zustand";

interface AIPanelState {
  /** Whether the AI Command Panel is open */
  aiPanelOpen: boolean;
  toggleAIPanel: () => void;
  setAIPanelOpen: (open: boolean) => void;
}

export const useAIPanelStore = create<AIPanelState>((set) => ({
  aiPanelOpen: false,
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
}));
