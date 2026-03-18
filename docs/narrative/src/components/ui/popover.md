# Popover

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/popover.tsx`
> **Status**: Active

---

## Context & Purpose

The Popover component provides Flowmind's click-triggered floating content panel -- a non-modal overlay that can contain any arbitrary content (forms, pickers, rich previews) anchored to a trigger element. Unlike Dialog (which blocks the entire interface) or Tooltip (which shows only text on hover), Popover occupies the middle ground: it presents interactive content without disrupting the rest of the canvas.

**Business Need**: Flowmind's thought-mapping canvas needs inline editing surfaces. When a user clicks a unit card to edit its metadata (type, lifecycle state, connections), opening a full modal dialog would feel heavy and disorienting. A popover anchored to the card provides a lightweight, contextual editing surface that maintains spatial awareness of where the user is on the canvas.

**When Used**: Inline property editors for unit cards, color/type pickers, date selectors, quick-edit panels, and any interaction that needs more than a menu but less than a full dialog.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-popover`: The **accessible popover primitive** (handles click-outside dismissal, Escape key closing, anchor positioning with collision detection, and focus management)
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Unit card property editors (expected in Story 2.x)
- Color pickers for unit type selection
- Any feature needing a floating interactive panel anchored to a trigger

### Data Flow
User clicks trigger --> Radix calculates position relative to trigger (or Anchor element) --> Portal renders content panel at computed coordinates --> User interacts with panel content --> Click outside or Escape key --> Panel closes with exit animation

---

## Macroscale: System Integration

### Architectural Layer
Popover sits at **Layer 1 (Composite Components)** in the overlay family alongside Dialog, Dropdown Menu, and Context Menu. It shares the same visual container styling:
- `rounded-card` (12px radius)
- `border-border` + `bg-bg-primary` (white surface with subtle border)
- `shadow-elevated` (medium depth shadow)
- Same directional slide-in animations

The key distinction from its siblings: Popover is **non-modal** (the rest of the page remains interactive) and **content-agnostic** (it renders whatever children you give it, unlike menus which enforce item structure).

### Big Picture Impact
Popover is the **contextual interaction layer** of Flowmind. In a spatial canvas application, maintaining context is critical -- the user needs to see where they are on the canvas while editing a node's properties. Popover achieves this by floating a small panel next to the relevant node rather than centering a dialog that obscures the canvas.

Notable design decisions:
- **PopoverAnchor export**: Allows the popover to anchor to a different element than the one that triggers it. This is useful when a toolbar button should open a popover that appears next to the selected canvas node, not next to the button.
- **PopoverClose export**: Enables placing close buttons or "Done" buttons inside the popover content, giving consumers control over dismissal UX.
- **Default width of w-72 (288px)**: A sensible default for property editors, wide enough for form inputs but narrow enough to not obscure the canvas.

### Critical Path Analysis
**Importance Level**: High
- Popover will be the primary interaction pattern for the flow canvas editing experience
- If it breaks, users cannot edit unit properties inline and must fall back to full-page forms or dialogs
- The collision-aware positioning is especially important on the canvas, where nodes can be near any screen edge

---

## Technical Concepts (Plain English)

### Non-Modal Overlay
**Technical**: A floating panel that does not create a backdrop or trap focus, allowing the user to continue interacting with elements outside the popover while it is open.
**Plain English**: Like a sticky note placed on your desk -- you can still use your computer, read other papers, and do other things while the sticky note is visible. Compare this to a dialog, which is like someone standing in front of your screen demanding attention before you can do anything else.
**Why We Use It**: Canvas editing requires spatial awareness. A modal would hide the very context the user needs to see while editing a node.

### Anchor Positioning
**Technical**: The popover's position is calculated relative to a designated anchor element (the trigger by default, or a separate PopoverAnchor element) using Radix's floating-ui-based positioning engine, which considers available viewport space and applies collision avoidance.
**Plain English**: The popover sticks to its trigger like a speech bubble sticks to a character in a comic strip. If the character is near the edge of the panel, the speech bubble flips to the other side so it stays readable.
**Why We Use It**: On a scrollable, pannable canvas, trigger elements can appear at any viewport position. The popover must adapt its placement dynamically.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Popover component with portal rendering, collision-aware positioning, anchor support, and close button export
- **Why**: Story 1.5 requires floating content panel primitives for inline canvas editing interactions
- **Impact**: Enables contextual property editors and pickers throughout the canvas interface
