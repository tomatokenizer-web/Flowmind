import { create } from "zustand";
import type { UndoAction, UndoEntry } from "~/lib/undo-actions";
import { getUndoDescription, getRedoDescription } from "~/lib/undo-actions";
import { toast } from "~/lib/toast";

const MAX_HISTORY = 50;

let entryCounter = 0;

function createEntry(action: UndoAction): UndoEntry {
  return {
    id: `undo-${++entryCounter}-${Date.now()}`,
    action,
    timestamp: Date.now(),
  };
}

// ─── Store interface ────────────────────────────────────────────────

interface UndoState {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  /** Push an action onto the undo stack (clears redo stack) */
  pushAction: (action: UndoAction) => void;

  /** Pop and return the most recent undoable action */
  undo: () => UndoEntry | undefined;

  /** Pop and return the most recent redoable action */
  redo: () => UndoEntry | undefined;

  /** Whether undo is available */
  canUndo: () => boolean;

  /** Whether redo is available */
  canRedo: () => boolean;

  /** Clear all history */
  clear: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  pushAction: (action) => {
    const entry = createEntry(action);
    set((state) => ({
      undoStack: [entry, ...state.undoStack].slice(0, MAX_HISTORY),
      // New action invalidates redo history
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;

    const [entry, ...rest] = undoStack;
    set((state) => ({
      undoStack: rest,
      redoStack: [entry!, ...state.redoStack],
    }));

    // Show toast with redo action
    toast.info(getUndoDescription(entry!.action), {
      undoAction: () => get().redo(),
    });

    return entry;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;

    const [entry, ...rest] = redoStack;
    set((state) => ({
      redoStack: rest,
      undoStack: [entry!, ...state.undoStack].slice(0, MAX_HISTORY),
    }));

    toast.info(getRedoDescription(entry!.action));

    return entry;
  },

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
