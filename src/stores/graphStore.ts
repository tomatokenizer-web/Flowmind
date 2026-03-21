import { create } from "zustand";

export type GraphLayer = "global" | "local";

export interface MiniMapNode {
  x: number;
  y: number;
  unitType: string;
}

interface GraphState {
  layer: GraphLayer;
  selectedNodeId: string | null;
  localHubId: string | null;
  localDepth: number;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  filters: {
    unitTypes: string[];
    relationCategories: string[];
  };
  miniMapNodes: MiniMapNode[];

  setLayer: (layer: GraphLayer) => void;
  setSelectedNode: (id: string | null) => void;
  setLocalHub: (id: string | null) => void;
  setLocalDepth: (depth: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (offset: { x: number; y: number }) => void;
  toggleUnitTypeFilter: (unitType: string) => void;
  toggleRelationCategoryFilter: (category: string) => void;
  resetFilters: () => void;
  setMiniMapNodes: (nodes: MiniMapNode[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  layer: "global",
  selectedNodeId: null,
  localHubId: null,
  localDepth: 2,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  filters: {
    unitTypes: [],
    relationCategories: [],
  },
  miniMapNodes: [],

  setLayer: (layer) => set({ layer }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setLocalHub: (id) => set({ localHubId: id }),
  setLocalDepth: (depth) => set({ localDepth: Math.max(1, Math.min(3, depth)) }),
  setZoom: (zoom) => set({ zoomLevel: Math.max(0.3, Math.min(5, zoom)) }),
  setPan: (offset) => set({ panOffset: offset }),

  toggleUnitTypeFilter: (unitType) =>
    set((s) => {
      const types = s.filters.unitTypes.includes(unitType)
        ? s.filters.unitTypes.filter((t) => t !== unitType)
        : [...s.filters.unitTypes, unitType];
      return { filters: { ...s.filters, unitTypes: types } };
    }),

  toggleRelationCategoryFilter: (category) =>
    set((s) => {
      const cats = s.filters.relationCategories.includes(category)
        ? s.filters.relationCategories.filter((c) => c !== category)
        : [...s.filters.relationCategories, category];
      return { filters: { ...s.filters, relationCategories: cats } };
    }),

  resetFilters: () =>
    set({ filters: { unitTypes: [], relationCategories: [] } }),

  setMiniMapNodes: (nodes) => set({ miniMapNodes: nodes }),
}));
