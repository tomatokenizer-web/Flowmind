import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type Theme = "light" | "dark" | "natural-dark" | "system";
type ExpertiseLevel = "novice" | "intermediate" | "expert";

interface ThemeState {
  theme: Theme;
  expertiseLevel: ExpertiseLevel;

  setTheme: (theme: Theme) => void;
  setExpertiseLevel: (level: ExpertiseLevel) => void;
}

function getResolvedTheme(theme: Theme): "light" | "dark" | "natural-dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "natural-dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "natural-dark"
    : "light";
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved = getResolvedTheme(theme);
  const root = document.documentElement;

  root.classList.remove("light", "dark", "natural-dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        theme: "natural-dark",
        expertiseLevel: "intermediate",

        setTheme: (theme) => {
          applyThemeToDocument(theme);
          set({ theme }, false, "setTheme");
        },

        setExpertiseLevel: (level) =>
          set({ expertiseLevel: level }, false, "setExpertiseLevel"),
      }),
      {
        name: "flowmind-theme",
        onRehydrateStorage: () => (state) => {
          if (state) {
            applyThemeToDocument(state.theme);
          }
        },
      },
    ),
    { name: "ThemeStore" },
  ),
);

export { getResolvedTheme, applyThemeToDocument };
export type { ThemeState, Theme, ExpertiseLevel };
