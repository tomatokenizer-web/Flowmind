import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────

interface DeepDiveEntry {
  question: string;
  answer: string;
  units: Array<{ id: string; content: string; unitType: string }>;
  suggestContext: boolean;
  contextName?: string;
}

interface ClassificationResult {
  unitType: string;
  confidence: number;
  reasoning: string;
}

interface RefinementResult {
  original: string;
  refined: string;
}

interface KnowledgeResult {
  title: string;
  description: string;
  relevance: string;
  url?: string;
}

interface UnitAICache {
  deepDiveHistory: DeepDiveEntry[];
  deepDivePrompt: string;
  classification: ClassificationResult | null;
  refinement: RefinementResult | null;
  knowledgeResults: KnowledgeResult[];
  knowledgeQuery: string;
}

// ─── Store ──────────────────────────────────────────────────────────

interface AITabCacheState {
  cache: Record<string, UnitAICache>;

  getCache: (unitId: string) => UnitAICache;
  setDeepDiveHistory: (unitId: string, history: DeepDiveEntry[]) => void;
  addDeepDiveEntry: (unitId: string, entry: DeepDiveEntry) => void;
  setDeepDivePrompt: (unitId: string, prompt: string) => void;
  setClassification: (unitId: string, result: ClassificationResult | null) => void;
  setRefinement: (unitId: string, result: RefinementResult | null) => void;
  setKnowledgeResults: (unitId: string, results: KnowledgeResult[], query: string) => void;
  clearUnit: (unitId: string) => void;
}

const EMPTY_CACHE: UnitAICache = {
  deepDiveHistory: [],
  deepDivePrompt: "",
  classification: null,
  refinement: null,
  knowledgeResults: [],
  knowledgeQuery: "",
};

export const useAITabCacheStore = create<AITabCacheState>((set, get) => ({
  cache: {},

  getCache: (unitId) => get().cache[unitId] ?? EMPTY_CACHE,

  setDeepDiveHistory: (unitId, history) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [unitId]: { ...(s.cache[unitId] ?? EMPTY_CACHE), deepDiveHistory: history },
      },
    })),

  addDeepDiveEntry: (unitId, entry) =>
    set((s) => {
      const prev = s.cache[unitId] ?? EMPTY_CACHE;
      return {
        cache: {
          ...s.cache,
          [unitId]: { ...prev, deepDiveHistory: [...prev.deepDiveHistory, entry] },
        },
      };
    }),

  setDeepDivePrompt: (unitId, prompt) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [unitId]: { ...(s.cache[unitId] ?? EMPTY_CACHE), deepDivePrompt: prompt },
      },
    })),

  setClassification: (unitId, result) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [unitId]: { ...(s.cache[unitId] ?? EMPTY_CACHE), classification: result },
      },
    })),

  setRefinement: (unitId, result) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [unitId]: { ...(s.cache[unitId] ?? EMPTY_CACHE), refinement: result },
      },
    })),

  setKnowledgeResults: (unitId, results, query) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [unitId]: { ...(s.cache[unitId] ?? EMPTY_CACHE), knowledgeResults: results, knowledgeQuery: query },
      },
    })),

  clearUnit: (unitId) =>
    set((s) => {
      const { [unitId]: _, ...rest } = s.cache;
      return { cache: rest };
    }),
}));
