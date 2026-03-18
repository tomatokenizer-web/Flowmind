# UnitTypeBadge

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/unit/unit-type-badge.tsx`
> **Status**: Active

---

## Context & Purpose

FlowMind's core data primitive is the "ThoughtUnit" -- a discrete piece of thinking that a user captures (a claim, a question, a piece of evidence, and so on). There are nine distinct unit types, and users need to instantly distinguish one type from another at a glance. This component exists to solve that visual-identification problem.

UnitTypeBadge renders a small, color-coded pill with an icon and a human-readable label. Each of the nine unit types gets its own unique combination of background tint, accent color, and Lucide icon, creating a consistent visual language that carries across every surface where thought units appear -- cards, lists, detail panels, and eventually the graph canvas.

**Business/User Need**: When a user scans a board of dozens of thought units, the badge is the fastest signal telling them "this is an Evidence card" versus "this is a Question card." Without it, every card looks the same and the structured-thinking value proposition of FlowMind collapses. Color-coding and iconography reduce cognitive load by letting pattern recognition do the work instead of requiring users to read labels.

**When Used**: Rendered inside every `UnitCard` component, appearing in the card header area. It will also appear anywhere the application needs to communicate a unit's type in a compact, inline format -- search results, relation lists, type selectors, and the future graph canvas node overlays.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client` (type import): `UnitType` -- the **enum** (a fixed list of allowed values) defining the nine thought-unit categories. This is the single source of truth; the badge does not invent its own type list.
- `lucide-react`: The icon library. The component dynamically looks up an icon component by name string at runtime, which is why it imports the entire `lucide-react` namespace rather than individual icons.
- `src/lib/utils.ts`: `cn()` -- a utility that merges Tailwind CSS class strings intelligently, handling conflicts and conditional classes.
- `src/lib/unit-types.ts`: `UNIT_TYPE_ICONS` -- the centralized mapping from each `UnitType` to its Lucide icon name (e.g., `claim` maps to `"MessageSquare"`). This ensures the badge uses the same icon that every other part of the system associates with that type.

### Dependents (What Needs This)

- `src/components/unit/unit-card.tsx`: The primary consumer. Every UnitCard renders a UnitTypeBadge in its header row to identify the card's type. This is currently the only direct importer, but the component is designed for reuse anywhere a type indicator is needed.

### Data Flow

```
UnitType enum value (e.g., "evidence")
  --> UnitTypeBadge receives it as a prop
  --> Looks up style tokens from TYPE_BADGE_STYLES (bg + text color classes)
  --> Looks up human label from TYPE_LABELS ("Evidence")
  --> Looks up icon name from UNIT_TYPE_ICONS ("FileCheck")
  --> Dynamically resolves icon component from lucide-react
  --> Renders a styled <span> pill with icon + label
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **Presentation Layer**, specifically within the unit component family (`src/components/unit/`). It is a pure visual mapping component -- it receives a type identifier and renders a visual representation. It contains zero business logic, no side effects, and no state.

In FlowMind's layered architecture:
- **Layer 1 (Data)**: Prisma schema defines the `UnitType` enum with 9 values
- **Layer 2 (Shared Logic)**: `src/lib/unit-types.ts` centralizes colors, icons, descriptions, and relationships for all types
- **Layer 3 (Presentation)**: **This component** -- translates type data into a visual badge
- **Layer 4 (Composition)**: `UnitCard` and future components compose this badge into larger UI structures

### Big Picture Impact

The unit type system is foundational to FlowMind's identity as a structured-thinking tool. This badge is the most visible and frequently rendered manifestation of that type system. It establishes the color language that users learn and rely on:

- Blue pill = Claim
- Yellow pill = Question
- Green pill = Evidence
- Red pill = Counterargument
- Purple pill = Observation
- Orange pill = Idea
- Teal pill = Definition
- Gray pill = Assumption
- Indigo pill = Action

This color vocabulary propagates to card borders (in UnitCard), future graph nodes, and relation-type indicators. The badge is where users first learn the association, and consistency here is what makes the rest of the visual system legible.

### Critical Path Analysis

**Importance Level**: High (visual, not functional)

If this component broke or disappeared, the application would still function -- data would still save, APIs would still respond. However, the user experience would degrade severely because every thought unit card would lose its type identification. Users would have to read content to figure out what kind of unit they are looking at, eliminating the at-a-glance scanning that makes FlowMind's structured approach practical.

The component has no failure modes that could cascade into data loss or system errors. The worst case is a missing icon (if the Lucide icon name mapping is wrong), in which case the badge gracefully renders just the text label because of the `{Icon && ...}` guard.

---

## Technical Concepts (Plain English)

### Dynamic Icon Resolution
**Technical**: The component imports the entire `lucide-react` namespace and resolves an icon component at runtime by indexing into the module object with a string key, then casting it to `LucideIcon`.
**Plain English**: Instead of hard-coding "use this specific icon for claims, this one for questions" with nine separate import lines, it looks up the right icon from a dictionary at the moment it renders. Like looking up a word in a phone book by name instead of memorizing every phone number.
**Why We Use It**: Keeps the icon-to-type mapping in one central place (`src/lib/unit-types.ts`) so that changing an icon for a type only requires editing one file, not hunting through components.

### Design Token Classes (Semantic Tailwind)
**Technical**: The `TYPE_BADGE_STYLES` map uses custom Tailwind utility classes like `bg-unit-claim-bg` and `text-unit-claim-accent` that resolve to project-specific CSS custom properties defined in the Tailwind config.
**Plain English**: Instead of writing raw color codes (like `#1A56DB`) directly in the component, it uses named tokens -- think of them as labeled paint cans. The label says "claim accent color" and the actual color is defined elsewhere. If the design team changes the blue for claims, every badge, card border, and graph node updates automatically.
**Why We Use It**: Ensures visual consistency across the entire application and makes theme changes (including dark mode, if added later) a configuration change rather than a code change.

### Record Type Mapping
**Technical**: `Record<UnitType, { bg: string; text: string }>` creates a TypeScript type that guarantees every member of the `UnitType` enum has a corresponding entry in the style map.
**Plain English**: The compiler acts as a checklist enforcer. If someone adds a tenth unit type to the database schema, TypeScript will immediately flag every `Record<UnitType, ...>` map in the codebase that is missing the new type, preventing a runtime "undefined style" bug.
**Why We Use It**: Makes it impossible to forget to style a new unit type -- the code will not compile until all nine (or more) types are accounted for.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 2.2)
- **What Changed**: Created UnitTypeBadge component with support for all 9 base unit types
- **Why**: Story 2.2 introduced the unit type system, requiring a reusable visual indicator for type identity
- **Impact**: Enables type-at-a-glance scanning in UnitCard and all future surfaces that display thought units
