# Scroll Area

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/scroll-area.tsx`
> **Status**: Active

---

## Context & Purpose

The Scroll Area component provides Flowmind's custom scrollbar system -- replacing the browser's default scrollbars with thin, auto-hiding scrollbar tracks that match the application's Apple-like aesthetic. It wraps Radix UI's ScrollArea primitive to deliver consistent scroll behavior across all operating systems and browsers.

**Business Need**: Flowmind's sidebar panels, unit lists, and command palette results all contain scrollable content. Default browser scrollbars vary wildly between Windows (thick, always-visible grey bars), macOS (thin, auto-hiding), and Linux (theme-dependent). This inconsistency breaks the premium visual identity Flowmind targets. Custom scrollbars ensure every user sees the same refined experience.

**When Used**: Sidebar content panels, long lists of units or templates, command palette result lists, any container where content exceeds available vertical or horizontal space.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-scroll-area`: The **custom scrollbar primitive** (replaces native scrollbars with stylable elements while preserving native scroll physics, touch gestures, and scroll event behavior)
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Sidebar panels with scrollable content lists
- Command palette result lists (CommandList may use this internally or alongside it)
- Any panel or container with overflow content

### Data Flow
Content exceeds container bounds --> ScrollArea.Viewport enables native scrolling internally --> ScrollBar renders as an overlay track --> Thumb size reflects content-to-viewport ratio --> User scrolls via mouse wheel, touch, or drag --> Thumb position updates reactively --> Scrollbar fades out when idle, reappears on hover or scroll

---

## Macroscale: System Integration

### Architectural Layer
ScrollArea sits at **Layer 0.5 (Layout Utilities)** -- it is not an interactive component like Button or a content overlay like Dialog. It is a **layout enhancement** that improves the visual quality of overflow handling across the application.

### Big Picture Impact
ScrollArea is the **visual polish layer** for overflow content. Its design decisions directly reflect Flowmind's Apple-like aesthetic goals:

- **4px width** (`w-1`): Ultra-thin scrollbars that do not compete with content for attention, matching macOS's native scrollbar width
- **Auto-hiding** (`opacity-0` by default, `hover:opacity-100` and `data-[state=visible]:opacity-100`): Scrollbars disappear when not needed, maximizing content space and reducing visual noise
- **Translucent thumb** (`bg-text-tertiary/50`, darkening to `bg-text-tertiary/80` on hover): The scrollbar is visible enough to find when you need it, but subtle enough to ignore when you do not
- **Touch support** (`touch-none select-none`): Prevents accidental text selection when dragging the scrollbar on touch devices

### Critical Path Analysis
**Importance Level**: Medium
- ScrollArea is cosmetic -- if it breaks, content is still scrollable via the browser's native mechanism
- The `rounded-[inherit]` on the Viewport ensures the scroll area respects its parent container's border radius, preventing content from poking out of rounded corners
- Both vertical and horizontal orientations are supported, though vertical is the primary use case

---

## Technical Concepts (Plain English)

### Custom Scrollbar vs Native Scrollbar
**Technical**: Radix's ScrollArea renders the content inside an overflow-hidden viewport and manually tracks scroll position to position a custom scrollbar thumb element, while still delegating actual scroll physics to the browser's native scroll engine.
**Plain English**: Imagine putting a window frame (the custom scrollbar) over an existing window (native scroll). The view through the window is the same, but the frame looks different. You get the best of both worlds: the browser handles the smooth physics of scrolling, while the custom scrollbar controls what the scrollbar looks like.
**Why We Use It**: CSS `scrollbar-width` and `::-webkit-scrollbar` pseudo-elements have inconsistent browser support and limited styling options. Radix's approach works identically across all browsers.

### Auto-Hiding Behavior
**Technical**: The scrollbar's opacity transitions from 0 to 1 based on CSS hover state and Radix's `data-[state=visible]` attribute (set when the user is actively scrolling), using `duration-fast` (150ms) for the transition.
**Plain English**: Like lights in a hallway that turn on when someone walks through and turn off after they leave. The scrollbar appears when you need it (scrolling or hovering over the edge) and disappears when you do not, keeping the interface clean.
**Why We Use It**: Always-visible scrollbars add visual noise to panels that may not even need scrolling. Auto-hiding respects the user's attention.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created ScrollArea component with auto-hiding thin scrollbars, vertical and horizontal orientation support, and translucent thumb styling
- **Why**: Story 1.5 requires consistent cross-browser scroll styling for sidebar panels and list containers
- **Impact**: Ensures premium scrollbar appearance across all platforms, replacing inconsistent native scrollbar rendering
