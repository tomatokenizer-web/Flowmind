/**
 * theme.ts — Theme management for Flowmind.
 *
 * Supports two themes:
 *   - Light (default): no class on root
 *   - Natural Dark: `natural-dark` class on root
 *
 * Stores the preference in localStorage and toggles the class
 * on the document root element. CSS custom properties for the
 * dark palette are applied via global CSS (see globals.css).
 */

const STORAGE_KEY = "flowmind:theme";
const DARK_CLASS = "natural-dark";

export type ThemeMode = "light" | "natural-dark";

/** Returns the currently active theme. */
export function getTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains(DARK_CLASS) ? "natural-dark" : "light";
}

/** Returns true if dark mode is currently active. */
export function isDarkMode(): boolean {
  return getTheme() === "natural-dark";
}

// Legacy aliases for backward compat
export const isHighContrastEnabled = isDarkMode;

/**
 * Read the stored preference and apply it to the document root.
 * Call once during app initialisation (client-side only).
 */
export function initTheme(): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(STORAGE_KEY);
  // Default to light; respect stored preference
  const preferDark =
    stored !== null
      ? stored === "natural-dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

  setTheme(preferDark ? "natural-dark" : "light");
}

// Legacy alias
export const initHighContrast = initTheme;

/**
 * Explicitly set the theme.
 * Persists the choice to localStorage.
 */
export function setTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle(DARK_CLASS, mode === "natural-dark");
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage may be unavailable
  }
}

// Legacy alias
export function setHighContrast(enabled: boolean): void {
  setTheme(enabled ? "natural-dark" : "light");
}

/**
 * Toggle between light and dark themes.
 * Returns the new state (true = dark).
 */
export function toggleTheme(): boolean {
  const next = !isDarkMode();
  setTheme(next ? "natural-dark" : "light");
  return next;
}

// Legacy alias
export const toggleHighContrast = toggleTheme;
