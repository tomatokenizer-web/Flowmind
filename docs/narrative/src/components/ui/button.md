# Button

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/ui/button.tsx`
> **Status**: Active

---

## Context & Purpose

The Button component exists as Flowmind's foundational interactive element -- the single most reused action trigger across the entire application. It wraps raw HTML button elements with the Flowmind design system's Apple-like aesthetic: rounded corners, subtle shadows, smooth transitions, and carefully calibrated color variants.

**Business Need**: Every user-facing action in Flowmind (creating thought units, saving flows, confirming deletions, navigating between views) requires a visually consistent, accessible button. Without a centralized Button component, visual drift and accessibility gaps would accumulate rapidly across features.

**When Used**: Everywhere. Form submissions, dialog confirmations, toolbar actions, navigation triggers, destructive operations, and icon-only controls all use this component.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@radix-ui/react-slot`: Provides the **Slot pattern** (a technique that lets the Button delegate its rendering to a child element, so you can wrap a link inside a button without nesting invalid HTML)
- `class-variance-authority` (CVA): Manages the **variant system** (a structured way to define multiple visual styles like "primary", "ghost", "destructive" through a single configuration object instead of scattered conditionals)
- `~/lib/utils` (cn function): Merges Tailwind classes safely, resolving conflicts when consumers pass custom classNames

### Dependents (What Needs This)
- `src/components/ui/dialog.tsx`: Uses Button for dialog footer actions (Cancel, Delete, Confirm)
- Any feature component that needs clickable actions (expected to grow as Stories 2.x+ are built)
- The design tokens reference page (`src/app/dev/tokens/`) likely showcases Button variants

### Data Flow
Consumer passes variant + size + children --> CVA resolves class string --> cn merges with any custom className --> Rendered as `<button>` or delegated via Slot (if asChild is true) --> User sees styled, accessible button

---

## Macroscale: System Integration

### Architectural Layer
Button sits at the **atomic layer** of the component architecture -- Layer 0 (Design Primitives). It is the lowest-level interactive element in the Flowmind UI component tree:
- **Layer 0: This component (atomic primitives)** -- You are here
- Layer 1: Composite components (Dialog, Command Palette) that compose Button
- Layer 2: Feature components (flow editor, unit cards) that use composites
- Layer 3: Page layouts that orchestrate features

### Big Picture Impact
Button is the visual language of "you can do something here." Its five variants encode Flowmind's interaction semantics:
- **primary**: The main action the user should take (Apple blue, `--accent-primary`)
- **secondary**: Alternative actions with lower visual weight
- **ghost**: Toolbar and inline actions that should not compete for attention
- **destructive**: Irreversible actions (delete, remove) using `--accent-error`
- **outline**: Neutral bordered actions for settings and configuration contexts

The shadow system (`shadow-resting` at rest, `shadow-hover` on hover) creates the Apple-like depth illusion that defines Flowmind's premium feel.

### Critical Path Analysis
**Importance Level**: Critical
- If Button breaks, virtually every interactive surface in the application breaks with it
- The `asChild` prop is structurally important: it enables Button styling on links (`<a>` tags) for Next.js navigation without compromising HTML semantics
- The `motion-reduce` media query support ensures accessibility compliance for users with vestibular disorders

---

## Technical Concepts (Plain English)

### Class Variance Authority (CVA)
**Technical**: A utility that generates a function mapping variant/size prop combinations to deterministic Tailwind class strings, with type-safe variant definitions and default values.
**Plain English**: Like a restaurant menu where you pick a "style" (primary, ghost, etc.) and a "size" (small, medium, large), and the kitchen knows exactly what to serve. CVA is the menu system that translates your choices into the right visual recipe.
**Why We Use It**: Prevents messy chains of ternary operators and keeps all visual variants defined in one readable configuration object.

### Slot Pattern (asChild)
**Technical**: Radix UI's Slot component merges the Button's props (className, onClick, ref) onto its single child element instead of wrapping it in a `<button>` tag.
**Plain English**: Instead of putting a gift (a link) inside a box (a button), the Slot takes the wrapping paper (styles and behavior) and applies it directly to the gift. The link looks and acts like a button without the invalid HTML nesting.
**Why We Use It**: Next.js `<Link>` components need to be `<a>` tags for proper routing, but we want them to look like buttons. asChild solves this elegantly.

### Design Token References
**Technical**: Classes like `bg-accent-primary`, `shadow-resting`, `duration-fast` resolve to CSS custom properties defined in `src/styles/tokens.css` via the Tailwind config.
**Plain English**: Instead of hardcoding colors like "#0071e3" everywhere, the Button says "use the accent color" -- and the tokens file decides what that actually looks like. If the brand color changes, every button updates automatically.
**Why We Use It**: Single source of truth for the entire visual identity, enabling dark mode and theming without touching component code.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 1.5)
- **What Changed**: Created Button component with five variants (primary, secondary, ghost, destructive, outline) and four sizes (sm, md, lg, icon)
- **Why**: Story 1.5 requires a complete set of Radix UI primitives wrapped with Flowmind's design tokens for the component library foundation
- **Impact**: Enables all subsequent UI development to use consistent, accessible buttons
