# Toggle

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/toggle.tsx`
> **Status**: Active

---

## Context & Purpose

The Toggle component provides Flowmind's binary state switch -- a button that visually communicates and controls an on/off state. Unlike a regular button (which triggers an action), a toggle **represents a persisted state** that flips between active and inactive each time it is pressed. It wraps Radix UI's Toggle primitive with Flowmind's design tokens and CVA variant system for size options.

**Business Need**: Flowmind's toolbar and canvas controls need binary options: bold/italic text formatting, show/hide connection labels, lock/unlock unit positions, enable/disable grid snapping. These are not one-time actions but persistent preferences that users toggle on and off. The visual state (filled accent color vs muted surface) must instantly communicate the current setting.

**When Used**: Toolbar formatting controls (bold, italic, underline), view option toggles (show connections, show labels, snap to grid), filter toggles in the sidebar, and any binary on/off control.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-toggle`: The **accessible toggle primitive** (manages pressed/unpressed state, `aria-pressed` attribute, and keyboard activation with Enter/Space)
- `class-variance-authority` (CVA): Manages the **size variant system** (sm, md, lg) through a single configuration object
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Toolbar formatting controls (expected in Story 2.x)
- Canvas view option controls
- Sidebar filter toggles

### Data Flow
User clicks toggle --> Radix flips internal pressed state --> CSS data attribute changes from `data-[state=off]` to `data-[state=on]` (or vice versa) --> Visual transition: surface background to accent-primary fill --> onPressedChange callback fires with new boolean value --> Parent component updates its state accordingly

---

## Macroscale: System Integration

### Architectural Layer
Toggle sits at **Layer 0 (Atomic Primitives)** alongside Button. It is a fundamental interactive element, but with a crucial behavioral difference: Button triggers actions, Toggle represents state.

### Big Picture Impact
Toggle is Flowmind's **state visualization primitive**. Its two visual states encode meaning:
- **Off state** (`data-[state=off]`): `bg-bg-surface` (subtle grey) + `text-text-secondary` (muted text) -- "this option is inactive"
- **On state** (`data-[state=on]`): `bg-accent-primary` (blue fill) + `text-white` -- "this option is active"

This binary visual language is consistent across all toggles in the application, so users learn the pattern once: blue-filled means on, grey-surface means off.

Key design decisions:
- **No variant prop (unlike Button)**: Toggle has only size variants, not style variants. All toggles look the same because they all serve the same semantic purpose -- representing binary state. Adding visual variants would confuse the "on = blue, off = grey" pattern.
- **`motion-reduce` support**: Transitions are disabled for users who prefer reduced motion, ensuring accessibility compliance.
- **Same height scale as Button**: sm (32px), md (36px), lg (40px) matches Button sizes so toggles can sit alongside buttons in toolbars without misalignment.

### Critical Path Analysis
**Importance Level**: Medium
- Toggle is important for toolbar usability but is not on the critical path -- the application functions without formatting toggles
- The `aria-pressed` attribute (managed by Radix) is essential for screen readers to announce the toggle's current state
- The accent-primary fill on the active state reuses the same brand color as primary buttons, creating a consistent "active/important" color language

---

## Technical Concepts (Plain English)

### Toggle vs Button (Behavioral Difference)
**Technical**: A Button dispatches a one-time onClick event with no internal state. A Toggle maintains an internal boolean state (pressed/unpressed) that persists between clicks and is communicated via the `aria-pressed` attribute.
**Plain English**: A light switch (Toggle) stays in the position you leave it -- flip up for on, flip down for off. A doorbell (Button) does something when you press it but always returns to the same position. Toggles remember, buttons do not.
**Why We Use It**: Using a regular button for binary states would require external state management and manual aria-pressed handling. Toggle provides this out of the box.

### Data-Attribute Driven Styling
**Technical**: Visual states are controlled via Radix's `data-[state=on]` and `data-[state=off]` attributes in the CSS, which Radix toggles automatically based on the component's internal pressed state.
**Plain English**: Instead of JavaScript manually changing the button's color when clicked, Radix puts a label on the element ("state: on" or "state: off") and CSS rules automatically apply the right colors based on which label is present. It is like a traffic light that changes color based on a signal, not someone manually painting it.
**Why We Use It**: Keeps styling in CSS (where it belongs) and logic in JavaScript (where it belongs), with data attributes as the clean bridge between them.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Toggle component with on/off visual states, three size variants (sm, md, lg), accent-primary active fill, and motion-reduce support
- **Why**: Story 1.5 requires binary state control primitives for toolbar and canvas view options
- **Impact**: Enables formatting toggles, view option switches, and filter controls throughout the application
