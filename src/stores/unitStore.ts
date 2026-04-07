import { create } from "zustand";

type SortBy = "createdAt" | "modifiedAt" | "importance";
type SortOrder = "asc" | "desc";

interface UnitStore {
  selectedUnitId: string | null;
  setSelectedUnit: (id: string | null) => void;
  editingUnitId: string | null;
  setEditingUnit: (id: string | null) => void;
  filterLifecycle: string | null;
  setFilterLifecycle: (lifecycle: string | null) => void;
  filterUnitType: string | null;
  setFilterUnitType: (type: string | null) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  clearFilters: () => void;
}

export const useUnitStore = create<UnitStore>()((set) => ({
  selectedUnitId: null,
  setSelectedUnit: (id) => set({ selectedUnitId: id }),
  editingUnitId: null,
  setEditingUnit: (id) => set({ editingUnitId: id }),
  filterLifecycle: null,
  setFilterLifecycle: (lifecycle) => set({ filterLifecycle: lifecycle }),
  filterUnitType: null,
  setFilterUnitType: (type) => set({ filterUnitType: type }),
  sortBy: "createdAt",
  setSortBy: (sort) => set({ sortBy: sort }),
  sortOrder: "desc",
  setSortOrder: (order) => set({ sortOrder: order }),
  clearFilters: () =>
    set({
      filterLifecycle: null,
      filterUnitType: null,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
}));
