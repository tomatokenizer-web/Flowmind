# Tabs

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/tabs.tsx`
> **Status**: Active

---

## Context & Purpose

The Tabs component provides Flowmind's content-switching navigation pattern -- a horizontal row of labeled triggers that reveal different content panels when activated. It wraps Radix UI's Tabs primitive with Flowmind's Apple-like aesthetic: a subtle bottom border, accent-colored underline on the active tab, and 300ms cross-fade transitions between content panels.

**Business Need**: Flowmind organizes related but distinct views within a single context. A unit card's detail panel might have tabs for "Content", "Connections", and "History". The sidebar might tab between "Explorer", "Search", and "Templates". Tabs allow users to switch between these views without losing their place or navigating to a new page.

**When Used**: Sidebar navigation panels, unit detail views with multiple sections, settings pages with categorized options, and any interface that needs to present 2-5 parallel content views within the same spatial context.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-tabs`: The **accessible tabs primitive** (manages ARIA tablist/tab/tabpanel roles, keyboard navigation with arrow keys, and activation behavior)
- `~/lib/utils` (cn function): Tailwind class merging

### Dependents (What Needs This)
- Sidebar panel navigation (expected in Story 2.x)
- Unit detail views with Content/Connections/History sections
- Settings pages with categorized configurations

### Data Flow
User clicks tab trigger --> Radix updates internal state (active tab value) --> Previous TabsContent fades out (300ms) --> Active TabsContent fades in (300ms) --> Focus remains on tab bar for continued navigation

---

## Macroscale: System Integration

### Architectural Layer
Tabs sit at **Layer 1 (Composite Components)** as a content organization pattern. Unlike overlay components (Dialog, Popover, Menu), Tabs are **inline** -- they occupy normal document flow and restructure content within their container.

### Big Picture Impact
Tabs are Flowmind's **inline navigation system** for nested content hierarchies. They solve the tension between information density and cognitive load: showing everything at once overwhelms users, but hiding everything behind clicks makes features undiscoverable. Tabs strike the balance by revealing section labels upfront while only showing one section's content at a time.

Key design decisions:
- **Underline indicator pattern**: The active tab uses a 2px accent-colored bottom border (`after:bg-accent-primary`), matching Apple's tab bar aesthetic. This is more subtle than a filled background, keeping visual weight low.
- **Cross-fade animation**: Content panels use `duration-slow` (300ms) fade transitions, preventing jarring content swaps. The `motion-reduce` override disables this for users who prefer reduced motion.
- **No pill/segment style**: The design deliberately avoids the "segmented control" look (filled background tabs) in favor of the text-with-underline pattern, which reads as navigation rather than toggling and scales better with longer tab labels.

### Critical Path Analysis
**Importance Level**: Medium-High
- Tabs are structural but not blocking -- content can be reorganized into other patterns if needed
- The cross-fade animation timing must stay synchronized (both in and out use `duration-slow`) to prevent visual glitches where both panels are visible simultaneously
- Arrow key navigation between tabs is a WCAG requirement for the tablist role

---

## Technical Concepts (Plain English)

### ARIA Tablist/Tab/Tabpanel Roles
**Technical**: Radix automatically applies `role="tablist"` to the tab bar, `role="tab"` to each trigger, and `role="tabpanel"` to each content area, with `aria-selected`, `aria-controls`, and `aria-labelledby` attributes linking them together.
**Plain English**: Like labeling sections of a filing cabinet so a blind person can understand the organization: "This is the tab bar. This tab is selected. This content panel belongs to that tab." Screen readers use these labels to announce the interface structure.
**Why We Use It**: Without these roles, screen readers would see a bunch of unrelated buttons and divs with no indication that they form a tab navigation system.

### CSS Pseudo-Element Underline (after::)
**Technical**: The active tab indicator is implemented as an `::after` pseudo-element with absolute positioning, transitioning its `background-color` from transparent to `accent-primary` when the tab becomes active.
**Plain English**: Instead of adding a separate HTML element for the underline, the tab "grows" a decorative line from its own styling -- like a pen that draws a line under the word you select, and erases it when you select a different word.
**Why We Use It**: Pseudo-elements avoid extra DOM nodes and keep the component's HTML structure clean, while CSS transitions handle the smooth color change.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Tabs component with underline-style active indicator, 300ms cross-fade content transitions, and motion-reduce support
- **Why**: Story 1.5 requires inline content navigation primitives for sidebar panels and detail views
- **Impact**: Enables tabbed navigation within panels and detail views throughout the application
