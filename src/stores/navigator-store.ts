import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingMode = "focused" | "skim" | "deep" | "guided";

interface NavigatorState {
  /** Currently active navigator ID */
  activeNavigatorId: string | null;
  /** Reading position per navigator: navigatorId → stepIndex */
  readingPositions: Record<string, number>;
  /** Current reading mode */
  readingMode: ReadingMode;
  /** Whether the branch sidebar is open */
  sidebarOpen: boolean;
  /** Stack of unitIds for back-navigation after branching */
  branchHistory: string[];
  /** Per-unit reading time in milliseconds */
  readingTimes: Record<string, number>;

  setActiveNavigator: (id: string | null) => void;
  saveReadingPosition: (navigatorId: string, step: number) => void;
  getReadingPosition: (navigatorId: string) => number;
  setReadingMode: (mode: ReadingMode) => void;
  setSidebarOpen: (open: boolean) => void;
  pushBranchHistory: (unitId: string) => void;
  popBranchHistory: () => string | undefined;
  clearBranchHistory: () => void;
  recordReadingTime: (unitId: string, ms: number) => void;
}

export const useNavigatorStore = create<NavigatorState>()(
  persist(
    (set, get) => ({
      activeNavigatorId: null,
      readingPositions: {},
      readingMode: "focused",
      sidebarOpen: true,
      branchHistory: [],
      readingTimes: {},

      setActiveNavigator: (id) => set({ activeNavigatorId: id }),

      saveReadingPosition: (navigatorId, step) =>
        set((s) => ({
          readingPositions: { ...s.readingPositions, [navigatorId]: step },
        })),

      getReadingPosition: (navigatorId) => get().readingPositions[navigatorId] ?? 0,

      setReadingMode: (mode) => set({ readingMode: mode }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      pushBranchHistory: (unitId) =>
        set((s) => ({ branchHistory: [...s.branchHistory, unitId] })),

      popBranchHistory: () => {
        const history = get().branchHistory;
        if (history.length === 0) return undefined;
        const last = history[history.length - 1];
        set({ branchHistory: history.slice(0, -1) });
        return last;
      },

      clearBranchHistory: () => set({ branchHistory: [] }),

      recordReadingTime: (unitId, ms) =>
        set((s) => ({
          readingTimes: {
            ...s.readingTimes,
            [unitId]: (s.readingTimes[unitId] ?? 0) + ms,
          },
        })),
    }),
    {
      name: "flowmind-navigator",
      partialize: (state) => ({
        readingPositions: state.readingPositions,
        readingMode: state.readingMode,
        sidebarOpen: state.sidebarOpen,
        readingTimes: state.readingTimes,
      }),
    },
  ),
);
