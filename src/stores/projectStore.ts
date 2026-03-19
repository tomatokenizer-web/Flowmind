import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectStore {
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  clearActiveProject: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProject: (id) => set({ activeProjectId: id }),
      clearActiveProject: () => set({ activeProjectId: null }),
    }),
    { name: "flowmind-active-project" },
  ),
);
