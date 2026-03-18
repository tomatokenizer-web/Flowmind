# Context Menu

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/context-menu.tsx`
> **Status**: Active

---

## Context & Purpose

The Context Menu component provides Flowmind's right-click action menu system -- the standard desktop interaction pattern where right-clicking (or long-pressing on touch devices) reveals a menu of contextual actions relevant to the element under the cursor. It wraps Radix UI's ContextMenu primitive with Flowmind's design tokens, sharing the same visual language as Dropdown Menu but triggered by right-click instead of left-click.

**Business Need**: Flowmind's flow canvas is a spatial workspace where users manipulate thought units, connections, and the canvas itself. Right-click menus are the expected desktop pattern for revealing "what can I do with this specific thing?" -- right-clicking a unit card shows unit-specific actions, right-clicking the canvas background shows canvas-level actions (paste, add new unit, zoom controls). This matches the mental model of desktop power users who expect right-click functionality.

**When Used**: Canvas background (canvas-level actions), unit cards (unit-specific actions like edit, delete, duplicate, change type), connection edges (edit or delete connection), and any spatial element where actions should be discoverable via right-click.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-context-menu`: The **accessible context menu primitive** (handles right-click detection, long-press for touch, cursor-position-aware menu placement, keyboard navigation, and ARIA menu roles)
- `lucide-react` (Check, ChevronRight, Circle): Icons for checkbox items, submenu indicators, and radio items
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Flow canvas background context menu (expected in Story 2.x)
- Unit card context menus
- Connection edge context menus

### Data Flow
User right-clicks trigger area --> Browser's native context menu is suppressed --> Radix captures cursor position --> Portal renders menu at click coordinates --> User navigates items with keyboard or mouse --> Selection triggers onSelect callback --> Menu closes

### Relationship to Dropdown Menu
Context Menu and Dropdown Menu are **sibling components** with nearly identical internals. They share:
- The same item styling (rounded-lg, px-3, py-2, duration-fast transitions)
- The same container styling (rounded-card, border-border, shadow-elevated)
- The same animation pattern (fade + zoom + directional slide)
- The same sub-component set (Item, CheckboxItem, RadioItem, Label, Separator, Sub)

The only difference is the trigger mechanism: Dropdown Menu responds to left-click on a visible trigger element, while Context Menu responds to right-click on an invisible trigger region.

---

## Macroscale: System Integration

### Architectural Layer
Context Menu sits at **Layer 1 (Composite Components)** as part of the overlay family. In the canvas interaction model, it serves as the **spatial action discovery layer** -- unlike Dropdown Menu which is anchored to a visible button, Context Menu is anchored to the user's cursor position within a spatial region.

### Big Picture Impact
Context Menu is the **power user acceleration layer** for the flow canvas. Novice users discover actions through visible buttons and dropdown menus; experienced users right-click directly on the element they want to manipulate, skipping the "find the menu button" step entirely.

Key design decisions:
- **Shortcut display**: Like Dropdown Menu, items support a `shortcut` prop that displays keyboard shortcuts in muted text, creating a learning progression: discover via right-click menu, memorize the shortcut, eventually bypass the menu entirely
- **Visual consistency with Dropdown Menu**: Deliberate mirroring of styles ensures users do not perceive right-click menus as a "different system" -- they are the same menus, just triggered differently
- **No position prop**: Unlike Dropdown Menu which positions relative to its trigger, Context Menu positions at the cursor's coordinates, which Radix handles automatically

### Critical Path Analysis
**Importance Level**: Medium-High
- Context menus are expected behavior for desktop canvas applications; their absence would feel like a missing feature to power users
- On touch devices, Radix handles the long-press gesture automatically, extending right-click behavior to mobile without additional code
- The suppression of the browser's native context menu is handled by Radix and is essential -- seeing the browser's "Inspect Element / Copy / Paste" menu instead of Flowmind's canvas actions would break immersion

---

## Technical Concepts (Plain English)

### Cursor-Position Menu Placement
**Technical**: The context menu renders at the exact (x, y) coordinates where the right-click occurred, using the mouse event's clientX/clientY values as the anchor point for Radix's positioning engine.
**Plain English**: Like dropping a pin on a map exactly where you tap -- the menu appears right where your cursor is, not at some predetermined location. This feels natural because the menu is spatially close to the thing you right-clicked on.
**Why We Use It**: On a canvas with many elements, the menu needs to appear near the relevant element so the user maintains spatial context about what they are acting on.

### Long-Press Touch Gesture
**Technical**: Radix's context menu primitive detects press-and-hold gestures on touch devices (typically 500ms+) as the equivalent of a right-click, triggering the same menu without requiring a physical right mouse button.
**Plain English**: Since phones and tablets do not have a right mouse button, holding your finger down on an element for about half a second acts as the "right-click" equivalent -- like how you long-press an app icon on your phone to see additional options.
**Why We Use It**: Without this, the entire context menu system would be desktop-only, leaving mobile/tablet users without access to contextual actions.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created ContextMenu component with items, checkbox items, radio items, labels, separators, submenu support, and shortcut display
- **Why**: Story 1.5 requires right-click menu primitives for canvas element interactions
- **Impact**: Enables contextual right-click menus for canvas elements, unit cards, and connection edges
