# Dropdown Menu

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/dropdown-menu.tsx`
> **Status**: Active

---

## Context & Purpose

The Dropdown Menu component provides Flowmind's click-triggered action menu system -- the standard pattern for presenting a list of actions or options when a user clicks a button, icon, or other trigger element. It wraps Radix UI's DropdownMenu primitive with Flowmind's design tokens, adding Apple-like elevated shadows, smooth entrance animations, and support for keyboard shortcuts, status indicators, and nested submenus.

**Business Need**: Flowmind's thought-mapping interface needs compact action surfaces. A unit card on the canvas cannot display every possible action (edit, delete, duplicate, change type, set lifecycle state) as visible buttons. Dropdown menus hide secondary actions behind a single trigger, keeping the canvas clean while making all operations discoverable.

**When Used**: Unit card action menus ("..." buttons), toolbar overflow menus, view-switching dropdowns, sort/filter option lists, and user account menus.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-dropdown-menu`: The **accessible menu primitive** (handles keyboard navigation with arrow keys, typeahead search, focus management, submenu positioning, and ARIA menu roles -- behaviors that are notoriously difficult to implement correctly)
- `lucide-react` (Check, ChevronRight, Circle): Icons for checkbox items, submenu indicators, and radio items
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Unit card action menus (expected in Story 2.x)
- Toolbar and sidebar action overflow menus
- Any feature requiring a triggered list of actions

### Data Flow
User clicks trigger --> Radix calculates optimal position (side, alignment, collision avoidance) --> Portal renders menu content at computed coordinates --> Keyboard focus enters first item --> User navigates with arrow keys or mouse --> Selection triggers onSelect callback --> Menu closes with exit animation

---

## Macroscale: System Integration

### Architectural Layer
Dropdown Menu sits at **Layer 1 (Composite Components)** alongside Dialog, Popover, and Context Menu. These four components form Flowmind's **overlay family** -- they all share the same visual DNA:
- `rounded-card` border radius (12px from `--radius-card` token)
- `border-border` + `bg-bg-primary` container styling
- `shadow-elevated` depth perception
- Identical entrance/exit animations (fade + zoom + directional slide)

This visual consistency is deliberate: all floating surfaces in Flowmind should feel like they belong to the same family, reinforcing the Apple-like cohesive aesthetic.

### Big Picture Impact
The Dropdown Menu is the **primary action discovery mechanism** for the flow canvas. In a spatial interface where screen real estate is shared between nodes, edges, and whitespace, menus are how users access the full set of operations without cluttering the visual workspace.

Notable design decisions:
- **Shortcut display**: The `shortcut` prop on DropdownMenuItem renders keyboard shortcuts in muted tertiary text, training power users to bypass the menu entirely over time
- **Indicator dots**: The `indicator` prop with `{ color, label }` enables status-colored dots next to items (useful for lifecycle states like draft/pending/confirmed)
- **Submenu support**: Full SubTrigger/SubContent composition allows nested menus for categorized actions without leaving the dropdown context

### Critical Path Analysis
**Importance Level**: High
- Without this component, unit cards and toolbars would need to expose all actions as visible buttons, overwhelming the interface
- The keyboard navigation (arrow keys, Enter to select, Escape to close) is essential for accessibility compliance
- The collision-aware positioning from Radix prevents menus from overflowing off-screen on smaller viewports

---

## Technical Concepts (Plain English)

### Collision-Aware Positioning
**Technical**: Radix's positioning engine detects available viewport space and flips the menu's preferred side (e.g., from bottom to top) if there is insufficient room, using the `sideOffset` prop to maintain a consistent gap between trigger and content.
**Plain English**: Like a waiter who checks if there is room on your left side before placing a plate there -- if not, they place it on your right instead. The menu automatically repositions itself to stay fully visible on screen.
**Why We Use It**: On a flow canvas, triggers can be anywhere -- including near screen edges. Without collision detection, menus would render partially off-screen, hiding actions from the user.

### Typeahead Search
**Technical**: When the menu is open and focused, typing letter keys automatically highlights the first item whose text content starts with the typed characters, resetting after a brief pause.
**Plain English**: Like scrolling through your phone's contact list by tapping a letter on the keyboard -- typing "D" jumps to "Delete" without needing to arrow-key through every item above it.
**Why We Use It**: Accelerates action selection in long menus, particularly useful for the unit type selector which has 9+ types.

### Portal Rendering with Side-Aware Animations
**Technical**: Content renders in a portal outside the DOM tree, with CSS animations conditioned on `data-[side=*]` attributes to slide in from the direction opposite to the menu's placement side.
**Plain English**: The menu slides in from the direction it "came from" -- if it opens below the trigger, it slides down from the top; if it opens to the right, it slides in from the left. This creates the illusion of the menu emerging from the trigger rather than appearing from nowhere.
**Why We Use It**: Directional animation reinforces spatial relationships and makes the interface feel physically grounded, a hallmark of Apple's design language.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created DropdownMenu component with items, checkbox items, radio items, labels, separators, submenu support, shortcut display, and indicator dots
- **Why**: Story 1.5 requires action menu primitives for unit cards and toolbar interactions
- **Impact**: Enables all click-triggered action menus across the application
