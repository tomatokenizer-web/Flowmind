import { create } from "zustand";

export interface LifecycleUndoEntry {
  unitId: string;
  unitTitle: string;
  previousState: string;
  newState: string;
  timestamp: number;
}

interface LifecycleStore {
  /** Stack of undoable lifecycle changes (most recent first) */
  undoStack: LifecycleUndoEntry[];
  /** Push a new entry onto the undo stack */
  pushUndo: (entry: LifecycleUndoEntry) => void;
  /** Pop the most recent entry (returns it or undefined) */
  popUndo: () => LifecycleUndoEntry | undefined;
  /** Clear the entire undo stack */
  clearUndo: () => void;
}

export const useLifecycleStore = create<LifecycleStore>((set, get) => ({
  undoStack: [],

  pushUndo: (entry) =>
    set((state) => ({
      // Keep max 20 entries to avoid unbounded growth
      undoStack: [entry, ...state.undoStack].slice(0, 20),
    })),

  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const [top, ...rest] = stack;
    set({ undoStack: rest });
    return top;
  },

  clearUndo: () => set({ undoStack: [] }),
}));
