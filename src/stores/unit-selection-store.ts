import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UnitSelectionState {
  selectedUnitIds: Set<string>;
  lastSelectedId: string | null;

  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectRange: (ids: string[]) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useUnitSelectionStore = create<UnitSelectionState>()(
  devtools(
    (set, get) => ({
      selectedUnitIds: new Set<string>(),
      lastSelectedId: null,

      select: (id) =>
        set(
          (state) => {
            const next = new Set(state.selectedUnitIds);
            next.add(id);
            return { selectedUnitIds: next, lastSelectedId: id };
          },
          false,
          "select",
        ),

      deselect: (id) =>
        set(
          (state) => {
            const next = new Set(state.selectedUnitIds);
            next.delete(id);
            return {
              selectedUnitIds: next,
              lastSelectedId: state.lastSelectedId === id ? null : state.lastSelectedId,
            };
          },
          false,
          "deselect",
        ),

      toggle: (id) =>
        set(
          (state) => {
            const next = new Set(state.selectedUnitIds);
            if (next.has(id)) {
              next.delete(id);
              return {
                selectedUnitIds: next,
                lastSelectedId: state.lastSelectedId === id ? null : state.lastSelectedId,
              };
            }
            next.add(id);
            return { selectedUnitIds: next, lastSelectedId: id };
          },
          false,
          "toggle",
        ),

      selectRange: (ids) =>
        set(
          (state) => {
            const next = new Set(state.selectedUnitIds);
            for (const id of ids) {
              next.add(id);
            }
            return {
              selectedUnitIds: next,
              lastSelectedId: ids[ids.length - 1] ?? state.lastSelectedId,
            };
          },
          false,
          "selectRange",
        ),

      selectAll: (ids) =>
        set(
          {
            selectedUnitIds: new Set(ids),
            lastSelectedId: ids[ids.length - 1] ?? null,
          },
          false,
          "selectAll",
        ),

      clearSelection: () =>
        set(
          { selectedUnitIds: new Set<string>(), lastSelectedId: null },
          false,
          "clearSelection",
        ),

      isSelected: (id) => get().selectedUnitIds.has(id),
    }),
    { name: "UnitSelectionStore" },
  ),
);

export type { UnitSelectionState };
