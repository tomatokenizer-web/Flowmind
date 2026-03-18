# Command

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/command.tsx`
> **Status**: Active

---

## Context & Purpose

The Command component provides Flowmind's searchable command interface -- a text-input-driven list that filters and ranks items as the user types, commonly known as a **command palette** (the Cmd+K / Ctrl+K overlay). It wraps the `cmdk` library (a headless command menu by Paige Sun) with Flowmind's design tokens and includes a ready-to-use CommandPalette overlay component with Framer Motion animations.

**Business Need**: Flowmind is a productivity tool for structured thinking. Power users need fast access to actions and navigation without lifting their hands from the keyboard. The command palette is the universal accelerator: press Cmd+K, type what you want ("new unit", "delete flow", "settings"), and execute instantly. This pattern, popularized by VS Code, Notion, and Linear, is now an expected feature in professional tools.

**When Used**: Global command palette (Cmd+K / Ctrl+K from anywhere in the application), inline search-and-select for unit type pickers, template selectors, and any interface that benefits from "type to filter" behavior.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `cmdk`: The **headless command menu library** (provides fuzzy search, item ranking, keyboard navigation, group support, and empty-state handling without any styling -- Flowmind supplies all visual treatment)
- `framer-motion` (AnimatePresence + motion): Powers the CommandPalette overlay's entrance/exit animations (150ms scale + fade, faster than Dialog's 300ms to feel snappy and keyboard-driven)
- `lucide-react` (Search, X): Search icon in the input field and close icon for the palette
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Global application layout (will mount CommandPalette at the root level)
- Unit type pickers (can use the base Command component inline for type-to-filter selection)
- Template browsers and action launchers

### Data Flow
**CommandPalette flow**: User presses Cmd+K --> useEffect keydown listener toggles open state --> AnimatePresence renders overlay + Command container --> User types in CommandInput --> cmdk filters and ranks CommandItems in real-time --> User selects with arrow keys + Enter or mouse click --> onSelect callback fires --> Escape or click-outside closes palette

**Inline Command flow**: Command renders inline (no overlay) --> User types in CommandInput --> cmdk filters items --> Selection triggers callback

---

## Macroscale: System Integration

### Architectural Layer
Command sits at **Layer 1.5** -- it is both a composite component (combining input, list, items, groups) and an **application-level feature** (the CommandPalette overlay is a global UI element, not something nested inside other components).

The CommandPalette is unique in the component library because it has its own **keyboard shortcut listener** (Cmd+K / Ctrl+K) built in. Other components are passive (they render when told to); CommandPalette actively listens for a global hotkey.

### Big Picture Impact
The Command system serves three roles in Flowmind's architecture:

1. **Global Action Launcher** (CommandPalette): The fastest path from "I want to do something" to "it is done." Every action in the application should eventually be registered as a command, making the palette a universal entry point.

2. **Search Interface**: The fuzzy search behavior makes Command suitable for finding units, flows, templates, and settings by partial name match.

3. **Inline Picker**: The base Command component (without the palette overlay) can be embedded inside popovers or panels for type-to-filter selection (e.g., choosing a unit type from the 9+ available types).

Key design decisions:
- **150ms animation** (vs Dialog's 300ms): The palette uses faster animations because keyboard-driven interactions demand snappier feedback. A 300ms delay on Cmd+K would feel sluggish to power users.
- **Keyboard shortcut badge** (`<kbd>` element): CommandItem supports a `shortcut` prop that renders a styled keyboard shortcut badge, teaching users the direct shortcut for frequently used commands.
- **Top-20% vertical position** (`top-[20%]`): The palette appears in the upper third of the screen (not centered), matching the Spotlight/VS Code convention that keeps results visible below the input.
- **300px max list height**: Prevents the result list from overwhelming the screen while providing enough space for grouped results.

### Critical Path Analysis
**Importance Level**: High
- The command palette is a signature feature of modern productivity tools; its absence would make Flowmind feel incomplete relative to competitors
- The Cmd+K listener uses `metaKey` (Mac) and `ctrlKey` (Windows/Linux) for cross-platform support
- The cmdk library handles fuzzy matching and ranking, which would be complex and error-prone to implement from scratch
- If the global keydown listener fails to clean up (missing removeEventListener in useEffect return), it could cause memory leaks and duplicate palette triggers across route changes

---

## Technical Concepts (Plain English)

### Command Palette Pattern
**Technical**: A modal overlay triggered by a keyboard shortcut that combines a text input with a filtered, ranked list of actions, navigable via arrow keys and activatable via Enter.
**Plain English**: Like the search bar in your phone's settings app -- you type what you are looking for, and it shows matching options instantly. But instead of just finding settings, it can also execute actions directly. Think of it as "Spotlight for Flowmind."
**Why We Use It**: Mouse-driven menus require visual scanning and multiple clicks. A command palette lets users jump directly to any action by typing a few characters, dramatically reducing the time between intent and execution.

### Fuzzy Search / Item Ranking
**Technical**: The cmdk library scores each item against the user's input using substring matching and ranking heuristics, showing the best matches first and hiding non-matches entirely.
**Plain English**: Like a smart autocomplete that does not require you to type the exact name -- typing "del" would match "Delete Unit", "Delete Flow", and "Undo Delete" and show the most relevant one first. It forgives typos and partial words.
**Why We Use It**: Users rarely remember exact command names. Fuzzy matching lets them find what they need with approximate input.

### Headless UI Library
**Technical**: The cmdk library provides behavior (search, filtering, keyboard navigation, state management) without any visual styling, leaving the component's appearance entirely up to the consumer (Flowmind, in this case).
**Plain English**: Like buying a car engine without a body -- cmdk provides the motor (search logic, keyboard controls) and Flowmind builds the body (colors, fonts, shadows, animations) around it. This means the command palette looks exactly like the rest of Flowmind, not like a third-party widget.
**Why We Use It**: Pre-styled command menus would clash with Flowmind's design tokens. A headless library lets us apply our exact aesthetic without fighting against built-in styles.

### AnimatePresence for Overlay Lifecycle
**Technical**: Framer Motion's AnimatePresence wraps the conditionally rendered overlay, delaying its DOM removal until the exit animation (scale 0.95 + fade out, 150ms) completes.
**Plain English**: When you press Escape to close the palette, instead of vanishing instantly, it gracefully shrinks and fades away over 150 milliseconds. AnimatePresence is what says "wait for the goodbye animation before actually removing it from the page."
**Why We Use It**: Instant disappearance feels glitchy. A brief exit animation provides closure and confirms to the user that their action (closing the palette) was registered.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Command component system with Input, List, Empty, Group, Item (with shortcut badge), Separator, and the full CommandPalette overlay with Cmd+K/Ctrl+K hotkey listener
- **Why**: Story 1.5 requires a command palette primitive for keyboard-driven action launching and search-to-select interfaces
- **Impact**: Enables global Cmd+K command palette and inline type-to-filter pickers throughout the application
