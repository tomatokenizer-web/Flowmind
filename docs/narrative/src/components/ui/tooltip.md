# Tooltip

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/tooltip.tsx`
> **Status**: Active

---

## Context & Purpose

The Tooltip component provides Flowmind's hover-reveal information layer -- small, transient text labels that appear when users hover over or focus on an element that needs additional explanation. It wraps Radix UI's Tooltip primitive with Flowmind's inverted color scheme (dark background on light text) and a convenience wrapper called SimpleTooltip for the most common use case.

**Business Need**: Flowmind's canvas interface relies heavily on icon buttons (toolbar controls, unit card actions, sidebar toggles) that have no visible text labels. Without tooltips, users would need to guess what each icon does. Tooltips bridge the gap between compact icon-driven UI and discoverability.

**When Used**: Icon-only buttons in toolbars, truncated text that hides its full content, keyboard shortcut hints, and any element whose purpose is not immediately obvious from its visual appearance alone.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-tooltip`: The **accessible tooltip primitive** (manages hover/focus timing, positioning, portal rendering, and screen reader announcements via aria-describedby)
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Icon buttons throughout the application (toolbar, sidebar, unit card actions)
- The TooltipProvider must wrap the application root (or a significant subtree) to enable shared delay behavior across tooltip instances

### Data Flow
User hovers over trigger --> 300ms delay (configurable via delayDuration) --> Radix calculates position avoiding viewport edges --> Portal renders tooltip content --> User moves cursor away --> Tooltip fades out

---

## Macroscale: System Integration

### Architectural Layer
Tooltip sits at **Layer 0.5** -- between atomic primitives (Button) and composite components (Dialog). It is a **decorative overlay** rather than an interactive one: tooltips display information but do not accept user input.

### Big Picture Impact
Tooltips are the **discoverability layer** of the application. They serve three purposes in Flowmind:
1. **Icon translation**: Converting abstract icons into plain-text descriptions
2. **Shortcut education**: Showing keyboard shortcuts (e.g., "Bold (Ctrl+B)") to train power users
3. **Overflow reveal**: Displaying full text for labels truncated by CSS text-overflow

The inverted color scheme (`bg-text-primary text-bg-primary` -- dark background with white text) is a deliberate design choice that visually distinguishes tooltips from all other overlays (menus, popovers, dialogs), which use `bg-bg-primary` (white background). This inversion signals "this is informational, not interactive."

### Critical Path Analysis
**Importance Level**: Medium
- Tooltips enhance usability but are not blocking -- the application functions without them
- The 300ms default delay in SimpleTooltip prevents tooltip spam when users casually move their cursor across the toolbar
- The `shadow-elevated` token gives tooltips the same depth as menus, maintaining the visual elevation hierarchy

---

## Technical Concepts (Plain English)

### TooltipProvider (Shared Delay Context)
**Technical**: A React context provider that coordinates delay timing across multiple tooltip instances, enabling "skip delay" behavior where hovering from one tooltip trigger to another shows the second tooltip instantly.
**Plain English**: Like a museum guide who waits 3 seconds before explaining the first painting, but once they have started talking, they immediately explain the next painting you look at without pausing again. The Provider coordinates this "warm-up" behavior across all tooltips.
**Why We Use It**: Without the Provider, each tooltip would independently wait 300ms, making rapid toolbar scanning feel sluggish.

### SimpleTooltip (Convenience Wrapper)
**Technical**: A pre-composed component that bundles Tooltip, TooltipTrigger (with asChild), and TooltipContent into a single component with `content`, `side`, and `delayDuration` props.
**Plain English**: Instead of assembling three separate LEGO pieces every time you want a tooltip, SimpleTooltip gives you the pre-built model. You just say "show this text on hover" and it handles the rest.
**Why We Use It**: Reduces boilerplate for the 90% case where you just need a text tooltip on hover, while keeping the raw primitives available for the 10% of cases that need custom behavior.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Tooltip component with inverted color scheme, side-aware animations, and SimpleTooltip convenience wrapper with 300ms default delay
- **Why**: Story 1.5 requires hover-information primitives for icon-heavy toolbar and canvas interactions
- **Impact**: Enables discoverability for all icon-only controls across the application
