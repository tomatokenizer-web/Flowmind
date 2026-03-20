import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AIIntensity = "minimal" | "moderate" | "exploratory" | "generative";

interface AISettingsState {
  intensity: AIIntensity;
  setIntensity: (level: AIIntensity) => void;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set) => ({
      intensity: "moderate",
      setIntensity: (level) => set({ intensity: level }),
    }),
    { name: "flowmind-ai-settings" },
  ),
);
