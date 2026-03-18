import { create } from "zustand";

export type CaptureMode = "capture" | "organize";

interface CaptureState {
  /** Whether capture overlay is open */
  isOpen: boolean;
  /** Current mode: "capture" (no AI) or "organize" (AI-assisted) */
  mode: CaptureMode;
  /** Text currently being typed */
  pendingText: string;

  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleMode: () => void;
  setMode: (mode: CaptureMode) => void;
  setText: (text: string) => void;
  clearText: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  isOpen: false,
  mode: "capture",
  pendingText: "",

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, pendingText: "" }),
  toggle: () =>
    set((s) => (s.isOpen ? { isOpen: false, pendingText: "" } : { isOpen: true })),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === "capture" ? "organize" : "capture" })),
  setMode: (mode) => set({ mode }),
  setText: (text) => set({ pendingText: text }),
  clearText: () => set({ pendingText: "" }),
}));
