import { create } from "zustand";

interface FocusModeState {
  /** Whether focus mode is active — hides sidebar, detail panel, minimal toolbar */
  focusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (value: boolean) => void;
}

export const useFocusModeStore = create<FocusModeState>((set) => ({
  focusMode: false,
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setFocusMode: (value) => set({ focusMode: value }),
}));

/** Selector hook for focus mode boolean */
export function useFocusMode(): boolean {
  return useFocusModeStore((s) => s.focusMode);
}
