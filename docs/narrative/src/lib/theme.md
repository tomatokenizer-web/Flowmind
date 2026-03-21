# Theme Management Module

> **Last Updated**: 2026-03-21
> **Code Location**: `src/lib/theme.ts`
> **Status**: Active

---

## Context & Purpose

This module governs the visual appearance mode of the entire Flowmind application. It was rewritten to replace an earlier "high-contrast" theme (pure black background with bright yellow accents) with a softer "natural-dark" palette that uses warm, earthy tones for comfortable extended reading.

**Business Need**: Users working with mind-maps and knowledge graphs often spend long sessions in the app. The original high-contrast black/yellow scheme caused eye fatigue during prolonged use. The natural-dark theme provides a warm, muted alternative that is easier on the eyes while still maintaining clear visual hierarchy.

**When Used**: This module runs on every page load (via the provider component) and whenever a user toggles their theme preference. It is strictly client-side; all functions safely bail out during server-side rendering.

**Design Decisions**:
- The module supports exactly two modes: `light` (the default, no CSS class added) and `natural-dark` (adds the `natural-dark` class to the HTML root element).
- All legacy function names (`isHighContrastEnabled`, `initHighContrast`, `setHighContrast`, `toggleHighContrast`) are preserved as aliases pointing to the new implementations. This prevents breaking any existing code that referenced the old API while the rest of the codebase is incrementally migrated.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- **Browser APIs only**: `document.documentElement.classList` for toggling the CSS class, `localStorage` for persisting the user's preference, and `window.matchMedia` for detecting the operating system's preferred color scheme on first visit.
- `src/app/globals.css`: Defines the actual CSS custom properties (color values, shadows, focus rings) that activate when the `.natural-dark` class is present on the root element. Without this stylesheet, the class toggle has no visual effect.

### Dependents (What Needs This)
- `src/components/providers/HighContrastProvider.tsx`: A React component that calls `initHighContrast()` (legacy alias for `initTheme()`) inside a `useEffect` hook. It is mounted once in the root layout to apply the stored theme preference before the first meaningful paint.
- Any future UI toggle button or settings panel that lets users switch between light and dark modes will import `toggleTheme()` or `setTheme()` from this module.

### Data Flow
```
App mounts HighContrastProvider
  --> initTheme() reads localStorage("flowmind:theme")
  --> Falls back to OS prefers-color-scheme if no stored value
  --> setTheme() toggles "natural-dark" class on <html>
  --> CSS custom properties in globals.css activate
  --> Entire UI re-renders with the selected palette

User clicks theme toggle
  --> toggleTheme() checks current state via isDarkMode()
  --> setTheme() flips the class and persists to localStorage
```

---

## Macroscale: System Integration

### Architectural Layer
This module sits in the **Presentation Infrastructure** layer. It does not contain any UI components itself; instead it provides the mechanism that all visual components rely on for their color values.

- **Layer 1**: CSS custom properties in `globals.css` (the actual colors)
- **Layer 2**: This module (the toggle logic and persistence) -- you are here
- **Layer 3**: `HighContrastProvider` (React lifecycle bridge)
- **Layer 4**: Individual components that consume CSS variables (buttons, cards, backgrounds)

### Big Picture Impact
Every visible element in Flowmind inherits its colors from CSS custom properties. This module is the single control point that decides which set of properties is active. Removing it would lock the app into light mode permanently and break any theme-toggle UI.

### Critical Path Analysis
**Importance Level**: Moderate. The application functions without this module (it defaults to light mode), but the dark-mode user experience would be lost entirely. The legacy aliases are additionally important during the transition period -- removing them prematurely would cause import errors in `HighContrastProvider.tsx` and any other files still referencing the old names.

---

## Technical Concepts (Plain English)

### CSS Class Toggle on Document Root
**Technical**: The module adds or removes a CSS class (`natural-dark`) on the `<html>` element, which activates a block of CSS custom property overrides defined in `globals.css`.
**Plain English**: Think of it like flipping a master light switch for the entire building. One switch at the top level changes every room at once because all rooms inherit from the same electrical circuit.
**Why We Use It**: It is the simplest, most performant way to apply a theme globally without re-rendering React components or passing props through the tree.

### localStorage Persistence
**Technical**: The chosen theme is stored in the browser's `localStorage` under the key `flowmind:theme`, so it survives page reloads and browser restarts.
**Plain English**: Like saving your seat preference on an airline -- next time you book, it remembers you like the window seat without asking again.
**Why We Use It**: Users should not have to re-select their theme every time they open the app.

### prefers-color-scheme Media Query Fallback
**Technical**: On first visit (no stored preference), the module checks the operating system's color scheme preference via `window.matchMedia("(prefers-color-scheme: dark)")`.
**Plain English**: If you have never told the app your preference, it looks at whether your computer is already in dark mode and matches that automatically.
**Why We Use It**: Provides a sensible default without requiring user action.

### Legacy Aliases for Backward Compatibility
**Technical**: Functions like `isHighContrastEnabled`, `initHighContrast`, `setHighContrast`, and `toggleHighContrast` are exported as references to their renamed counterparts, allowing old import sites to continue working.
**Plain English**: Like when a street gets renamed but the old street signs are kept up for a while so people with old maps can still find their way.
**Why We Use It**: Prevents a cascade of breaking changes across the codebase while the migration from "high-contrast" naming to "natural-dark" naming is completed incrementally.

---

## Change History

### 2026-03-21 - Theme Rewrite: High-Contrast to Natural Dark
- **What Changed**: Replaced the black/yellow "high-contrast" theme with a warm "natural-dark" palette. Renamed the core type from implicit high-contrast to explicit `ThemeMode = "light" | "natural-dark"`. Preserved all legacy function names as aliases.
- **Why**: The original high-contrast theme was harsh for extended use. The natural-dark theme uses muted warm tones (`#1a1a17` background, warm accents) that are easier on the eyes during long sessions.
- **Impact**: All existing consumers continue to work via legacy aliases. New code should use `getTheme()`, `setTheme()`, `toggleTheme()`, and `isDarkMode()` directly.
