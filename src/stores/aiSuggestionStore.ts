import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SuggestionType = "type" | "relation" | "refinement" | "alert";

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  unitId: string;
  unitPreview: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface AISuggestionState {
  suggestions: AISuggestion[];
  addSuggestion: (s: Omit<AISuggestion, "id" | "createdAt">) => void;
  removeSuggestion: (id: string) => void;
  clearAll: () => void;
  pendingCount: number;
}

export const useAISuggestionStore = create<AISuggestionState>()(
  persist(
    (set, _get) => ({
      suggestions: [],
      pendingCount: 0,
      addSuggestion: (s) => {
        const suggestion: AISuggestion = {
          ...s,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          suggestions: [suggestion, ...state.suggestions].slice(0, 50),
          pendingCount: state.suggestions.length + 1,
        }));
      },
      removeSuggestion: (id) =>
        set((state) => {
          const filtered = state.suggestions.filter((s) => s.id !== id);
          return { suggestions: filtered, pendingCount: filtered.length };
        }),
      clearAll: () => set({ suggestions: [], pendingCount: 0 }),
    }),
    { name: "flowmind-ai-suggestions" },
  ),
);
