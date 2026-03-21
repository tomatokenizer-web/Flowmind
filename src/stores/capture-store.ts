import { create } from "zustand";
import type {
  UnitProposal,
  DecompositionRelationProposal,
  UserPurpose,
} from "~/server/ai";

export type CaptureMode = "capture" | "organize";
export type CapturePhase = "input" | "decomposing" | "reviewing";

export interface DecompositionData {
  originalText: string;
  purpose: UserPurpose;
  proposals: UnitProposal[];
  relationProposals: DecompositionRelationProposal[];
}

interface CaptureState {
  /** Whether capture overlay is open */
  isOpen: boolean;
  /** Current mode: "capture" (no AI) or "organize" (AI-assisted) */
  mode: CaptureMode;
  /** Current phase within organize mode */
  phase: CapturePhase;
  /** Text currently being typed */
  pendingText: string;
  /** Decomposition result when in reviewing phase */
  decompositionData: DecompositionData | null;
  /** Whether audio recording mode should be shown */
  showAudioRecorder: boolean;
  /** Error message to display to user */
  errorMessage: string | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleMode: () => void;
  setMode: (mode: CaptureMode) => void;
  setText: (text: string) => void;
  clearText: () => void;
  setPhase: (phase: CapturePhase) => void;
  setDecompositionData: (data: DecompositionData | null) => void;
  resetToInput: () => void;
  openWithAudio: () => void;
  hideAudioRecorder: () => void;
  setErrorMessage: (msg: string | null) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  isOpen: false,
  mode: "capture",
  phase: "input",
  pendingText: "",
  decompositionData: null,
  showAudioRecorder: false,
  errorMessage: null,

  open: () => set({ isOpen: true, phase: "input", showAudioRecorder: false, errorMessage: null }),
  close: () => set({ isOpen: false, pendingText: "", phase: "input", decompositionData: null, showAudioRecorder: false, errorMessage: null }),
  toggle: () =>
    set((s) =>
      s.isOpen
        ? { isOpen: false, pendingText: "", phase: "input", decompositionData: null, showAudioRecorder: false, errorMessage: null }
        : { isOpen: true, phase: "input", errorMessage: null }
    ),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === "capture" ? "organize" : "capture", errorMessage: null })),
  setMode: (mode) => set({ mode }),
  setText: (text) => set({ pendingText: text, errorMessage: null }),
  clearText: () => set({ pendingText: "" }),
  setPhase: (phase) => set({ phase }),
  setDecompositionData: (data) => set({ decompositionData: data }),
  resetToInput: () => set({ phase: "input", decompositionData: null, pendingText: "", errorMessage: null }),
  openWithAudio: () => set({ isOpen: true, phase: "input", showAudioRecorder: true, errorMessage: null }),
  hideAudioRecorder: () => set({ showAudioRecorder: false }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
}));
