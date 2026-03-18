# Dialog

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/dialog.tsx`
> **Status**: Active

---

## Context & Purpose

The Dialog component provides Flowmind's modal overlay system -- the mechanism for demanding user attention when an action requires confirmation, additional input, or a focused workflow that should not be interrupted by the rest of the interface. It wraps Radix UI's Dialog primitive with Framer Motion animations and Flowmind's Apple-like aesthetic.

**Business Need**: Flowmind's thought-mapping workflow involves destructive actions (deleting units, removing connections, discarding drafts) and configuration steps (renaming flows, editing unit metadata) that need focused, interruption-free interaction spaces. A modal dialog ensures the user acknowledges the action before the system proceeds.

**When Used**: Confirmation prompts before destructive actions (via the DestructiveDialog convenience wrapper), settings panels, form entry workflows, and any interaction that should block the underlying canvas until resolved.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-dialog`: Provides the **accessible dialog primitive** (handles focus trapping, Escape key dismissal, aria attributes, and portal rendering -- the complex accessibility plumbing that is easy to get wrong from scratch)
- `framer-motion` (AnimatePresence + motion): Powers the **entry/exit animations** (scale-up on open, fade-out on close) with Apple-like cubic-bezier easing `[0.4, 0, 0.2, 1]`
- `lucide-react` (X icon): The close button icon in the top-right corner
- `src/components/ui/button.tsx`: Used inside DestructiveDialog for Cancel (ghost variant) and Delete (destructive variant) actions
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Any feature requiring user confirmation (delete flow, remove unit, discard changes)
- Settings and configuration panels
- The DestructiveDialog sub-component is likely the most frequently used export, as it provides a complete "are you sure?" pattern out of the box

### Data Flow
Trigger click --> DialogPrimitive.Root opens --> Portal renders overlay + content outside DOM tree --> AnimatePresence manages mount/unmount animations --> Focus traps inside content --> User interacts --> Close/confirm --> Exit animation plays --> Dialog unmounts from portal

---

## Macroscale: System Integration

### Architectural Layer
Dialog sits at **Layer 1 (Composite Components)** in the Flowmind architecture:
- Layer 0: Button (atomic primitive, used inside dialog footers)
- **Layer 1: This component (composite overlay)** -- You are here
- Layer 2: Feature-specific dialogs (DeleteFlowDialog, EditUnitDialog)
- Layer 3: Page layouts that trigger dialogs from toolbar actions

### Big Picture Impact
Dialog is the **interruption layer** of the application. It creates a new stacking context (z-50) with a semi-transparent backdrop that visually dims the canvas, signaling to the user that the underlying interface is temporarily unreachable.

Key architectural decisions embedded in this component:
- **Framer Motion over CSS animations**: The dialog uses `AnimatePresence` for exit animations, which CSS alone cannot handle (CSS animations cannot animate an element as it unmounts from the DOM). This is why Framer Motion is a project dependency.
- **Portal rendering**: Content renders outside the normal DOM tree via `DialogPrimitive.Portal`, preventing z-index conflicts with the flow canvas and sidebar.
- **DestructiveDialog pattern**: A pre-composed confirmation dialog that enforces a consistent UX for dangerous operations -- red button on the right, ghost cancel on the left, customizable labels.

### Critical Path Analysis
**Importance Level**: High
- If Dialog breaks, all confirmation workflows break -- users could accidentally delete content without warning
- The overlay's `bg-black/40` opacity and `shadow-modal` token create the depth perception that separates the dialog from the canvas
- Focus trapping (provided by Radix) is an accessibility requirement -- without it, keyboard users could tab behind the dialog into invisible controls

---

## Technical Concepts (Plain English)

### Focus Trapping
**Technical**: When the dialog opens, keyboard focus is constrained within the dialog content. Tab and Shift+Tab cycle through focusable elements inside the dialog only, and focus returns to the trigger element when the dialog closes.
**Plain English**: Like being in a room where the door locks behind you -- you can move around inside the room freely, but you cannot wander back into the hallway until you explicitly leave through the door (close button or Escape key).
**Why We Use It**: Without focus trapping, a keyboard user pressing Tab could navigate to buttons hidden behind the dark overlay, creating a confusing and inaccessible experience.

### Portal Rendering
**Technical**: The dialog content is rendered into a separate DOM node appended to `<body>`, outside the component's normal DOM parent hierarchy, using React's createPortal mechanism.
**Plain English**: Instead of putting a popup inside the page where it might get clipped or hidden by a parent container's overflow rules, the dialog "teleports" itself to the top level of the page where nothing can obstruct it.
**Why We Use It**: The flow canvas has complex layering (SVG paths, draggable nodes, scroll containers). Rendering the dialog inside the canvas would cause z-index battles and overflow clipping.

### AnimatePresence (Exit Animations)
**Technical**: Framer Motion's AnimatePresence component delays the unmounting of child components until their exit animations complete, enabling smooth scale-down and fade-out transitions.
**Plain English**: Normally, when React removes something from the screen, it vanishes instantly. AnimatePresence says "wait -- let me finish my goodbye animation before you actually remove me." The dialog gracefully shrinks and fades instead of popping out of existence.
**Why We Use It**: Abrupt disappearance feels jarring and cheap. The 300ms exit animation with Apple's standard easing curve creates the polished feel Flowmind targets.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Dialog component with Framer Motion animations, overlay, close button, header/footer layout, title/description typography, and DestructiveDialog convenience wrapper
- **Why**: Story 1.5 requires modal overlay primitives for confirmation flows and focused interactions
- **Impact**: Enables all destructive action confirmations and focused form workflows throughout the application
