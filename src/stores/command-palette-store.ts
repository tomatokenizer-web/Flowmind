import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface CommandPaletteState {
  open: boolean;
  search: string;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  setSearch: (search: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>()(
  devtools(
    (set) => ({
      open: false,
      search: "",

      setOpen: (open) =>
        set(
          { open, search: open ? "" : "" },
          false,
          "setOpen",
        ),

      toggle: () =>
        set(
          (state) => ({ open: !state.open, search: "" }),
          false,
          "toggle",
        ),

      setSearch: (search) =>
        set({ search }, false, "setSearch"),
    }),
    { name: "CommandPaletteStore" },
  ),
);

export type { CommandPaletteState };
