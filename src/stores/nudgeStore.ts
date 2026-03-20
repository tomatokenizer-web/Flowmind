import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NudgeState {
  dismissedNudges: string[];
  dismissNudge: (id: string) => void;
  hasBeenDismissed: (id: string) => boolean;
}

export const useNudgeStore = create<NudgeState>()(
  persist(
    (set, get) => ({
      dismissedNudges: [],
      dismissNudge: (id) =>
        set((s) => ({ dismissedNudges: [...s.dismissedNudges, id] })),
      hasBeenDismissed: (id) => get().dismissedNudges.includes(id),
    }),
    { name: "flowmind-nudges" },
  ),
);
