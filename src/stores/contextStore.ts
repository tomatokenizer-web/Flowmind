import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ContextStore {
  activeContextId: string | null;
  setActiveContext: (id: string | null) => void;
  // Stored as array internally; exposed as Set-like API to avoid Zustand shallow-compare issues
  expandedContextIds: string[];
  toggleExpanded: (id: string) => void;
  contextPanelOpen: boolean;
  toggleContextPanel: () => void;
  setContextPanelOpen: (open: boolean) => void;
}

export const useContextStore = create<ContextStore>()(
  persist(
    (set) => ({
      activeContextId: null,
      setActiveContext: (id) => set({ activeContextId: id }),
      expandedContextIds: [],
      toggleExpanded: (id) =>
        set((state) => ({
          expandedContextIds: state.expandedContextIds.includes(id)
            ? state.expandedContextIds.filter((x) => x !== id)
            : [...state.expandedContextIds, id],
        })),
      contextPanelOpen: false,
      toggleContextPanel: () =>
        set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
      setContextPanelOpen: (open) => set({ contextPanelOpen: open }),
    }),
    {
      name: "flowmind-context",
      // Only persist activeContextId; expandedContextIds and panel state are ephemeral
      partialize: (state) => ({ activeContextId: state.activeContextId }),
    },
  ),
);
