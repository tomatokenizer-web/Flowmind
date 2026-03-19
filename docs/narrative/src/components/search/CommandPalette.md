# Command Palette

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/search/CommandPalette.tsx`
> **Status**: Active

---

## Context & Purpose

This module implements the "power user shortcut" pattern found in modern applications like VS Code, Notion, and Slack. It exists because experienced users need rapid access to search, navigation, and actions without leaving the keyboard or hunting through menus.

**Business Need**: As users accumulate thinking units, contexts, and workflows, they need a single unified entry point to navigate the entire application. The command palette provides a "find anything, do anything" experience that dramatically reduces the friction of knowledge work.

**When Used**:
- When a user presses `Cmd+K` (Mac) or `Ctrl+K` (Windows) from anywhere in the application
- When clicking a search icon in the header (triggers `openCommandPalette()`)
- When users want to quickly jump to a recent thought, switch contexts, or change view modes

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@radix-ui/react-dialog`: `DialogPrimitive` - Provides accessible modal foundation with focus trapping (like a well-designed pop-up that automatically keeps keyboard focus inside and prevents interaction with content behind it)
- `framer-motion`: `AnimatePresence`, `motion` - Enables smooth fade-in/fade-out and scale animations when opening/closing
- `lucide-react`: `Search`, `Clock`, `Layers`, `FileText`, `Plus`, `LayoutGrid`, `ArrowRight` - Icon set for visual item identification
- `~/lib/utils`: `cn()` - Utility for combining CSS class names conditionally
- `~/trpc/react`: `api` - Type-safe API client for fetching search results, recent units, and contexts
- `~/stores/selectionStore`: `useSelectionStore` - Global state for which unit is currently selected across all views
- `~/stores/layout-store`: `useLayoutStore` - Global state for current view mode (canvas/focus/graph/thread)
- `~/components/unit/unit-type-badge`: `UnitTypeBadge` - Visual indicator showing unit type (claim, question, evidence, etc.)

### Dependents (What Needs This)

- `src/components/search/index.ts`: Re-exports `CommandPalette` and `openCommandPalette` for use throughout the app
- `src/components/shared/global-keyboard-shortcuts.tsx`: Registers `Cmd+K` in the keyboard shortcuts help overlay (actual handling is in CommandPalette itself)
- Layout components that render `<CommandPalette />` at the application root level

### Data Flow

```
User presses Cmd+K (or clicks search icon)
       |
       v
[CommandPalette opens] - Focus moves to search input
       |
       v
User types search query → 150ms debounce timer starts
       |
       v
Debounce completes → api.search.query fires (if query >= 2 chars)
       |
       v
[Search Results returned] OR [Recent Units + Contexts shown if no query]
       |
       v
User navigates with Arrow keys → selectedIndex updates → item scrolls into view
       |
       v
User presses Enter → item.action() called → state update + palette closes
       |
       v
Application responds (unit selected, view changed, action triggered)
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **UI Layer** as a global overlay:

- **Layer 0**: Global keyboard shortcut handler (captures Cmd+K everywhere)
- **Layer 1**: This component (Radix Dialog + search UI + keyboard navigation)
- **Layer 2**: tRPC API layer (search.query, unit.list, context.list)
- **Layer 3**: Database (Prisma + PostgreSQL)

### Big Picture Impact

The command palette is the **universal navigation hub** of FlowMind. It bridges three core user needs:

1. **Search** - Find any thought by content
2. **Navigation** - Jump to any context or view mode
3. **Action** - Trigger quick actions without menus

**Enables:**
- Zero-friction access to the entire knowledge base
- Keyboard-first workflow for power users
- Unified discovery (recent items, contexts, actions in one place)
- Reduced cognitive load (one shortcut to remember, not many)

### Critical Path Analysis

**Importance Level**: High (for productivity), Medium (for core functionality)

- **If this fails**: Users can still navigate via sidebar, search via dedicated SearchView, and use menu buttons. The system degrades gracefully.
- **Performance sensitivity**: The 150ms debounce balances responsiveness with API efficiency. Too short causes excessive requests; too long feels sluggish.
- **Accessibility**: Uses Radix Dialog primitives ensuring proper focus management, screen reader announcements, and escape-to-close behavior.

---

## Technical Concepts (Plain English)

### Radix Dialog Primitive

**Technical**: A headless UI component that provides accessible modal behavior including focus trapping, escape key handling, and ARIA attributes without imposing visual styling.

**Plain English**: Like a building's elevator mechanism without the cabin interior design. Radix handles all the complex accessibility rules (where focus goes, what keys do what, how screen readers announce it) while FlowMind applies its own visual styling.

**Why We Use It**: Building accessible modals from scratch is error-prone. Radix provides battle-tested accessibility that meets WCAG guidelines out of the box.

### Debounced Search Query

**Technical**: A 150ms delay between the user's last keystroke and the API request, implemented via `setTimeout` with cleanup.

**Plain English**: Like waiting for someone to stop typing before auto-completing their sentence. The system waits 150 milliseconds of silence before searching, preventing a flood of requests for every single letter typed.

**Why We Use It**: Without debouncing, typing "machine learning" would trigger 16 separate API requests. With debouncing, it triggers just 1-2 requests (after "machine" and after "learning").

### Global Open Function Pattern

**Technical**: A module-scoped variable `globalOpenFn` that gets assigned when the component mounts, allowing external code to call `openCommandPalette()` without needing React context or prop drilling.

**Plain English**: Like a receptionist who can connect calls from anywhere in the building. Other parts of the app can say "open the command palette" without knowing where it lives in the component tree.

**Why We Use It**: The command palette needs to be openable from header buttons, keyboard shortcuts, or anywhere else without complex wiring.

### Grouped Items with Global Index

**Technical**: Items are grouped by section (Recent, Contexts, Quick Actions) for display, but a single `globalIndex` counter tracks position for keyboard navigation across all groups.

**Plain English**: Like a single page number system across chapters of a book. Even though results are visually grouped under different headings, the arrow keys move through them as one continuous list.

**Why We Use It**: Users expect arrow keys to move linearly through all items, not get stuck within sections.

### AnimatePresence for Exit Animations

**Technical**: Framer Motion's `AnimatePresence` component that enables exit animations by delaying DOM removal until the animation completes.

**Plain English**: Normally when something closes in React, it vanishes instantly. AnimatePresence says "wait, let the fade-out animation finish first" before actually removing the element.

**Why We Use It**: Abrupt disappearance feels jarring. A smooth fade-out gives users visual feedback that their action worked.

---

## Behavioral Details

### State Management

| State | Purpose | Reset Behavior |
|-------|---------|----------------|
| `open` | Controls modal visibility | Toggled by Cmd+K or external calls |
| `query` | Current input text | Reset to empty when palette opens |
| `debouncedQuery` | Query after 150ms delay | Reset when query resets |
| `selectedIndex` | Currently highlighted item (0-based) | Reset to 0 on open or query change |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Toggle palette open/closed |
| `Arrow Down` | Move selection down (clamped at end) |
| `Arrow Up` | Move selection up (clamped at start) |
| `Enter` | Execute selected item's action |
| `Escape` | Close palette (handled by Radix) |

### Content Sections

When query is empty, three sections display:

1. **Recent** - Last 5 modified units (helps users resume where they left off)
2. **Contexts** - Available contexts in the project (quick navigation)
3. **Quick Actions** - Create new thought, switch to canvas/graph view

When query has 2+ characters:

1. **Search Results** - Units matching the query (up to 10 results)

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created command palette with Radix Dialog, debounced search, keyboard navigation, and grouped sections
- **Why**: Epic 6 requirement for quick search and navigation
- **Impact**: Enables Cmd+K workflow pattern, integrates with search router and selection/layout stores
