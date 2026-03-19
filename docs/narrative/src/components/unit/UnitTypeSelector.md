# UnitTypeSelector

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/unit/UnitTypeSelector.tsx`
> **Status**: Active

---

## Context & Purpose

This component exists to let users reclassify a thinking unit on the fly. In FlowMind, every unit of thought (a claim, a question, evidence, an idea, and so on) carries a "type" that determines how it is color-coded, what icon it shows, and how it relates to neighboring units in the reasoning flow. Users frequently realize mid-thought that what they originally typed as a "claim" is actually an "assumption," or that an "observation" should be promoted to an "idea." UnitTypeSelector gives them a one-click way to make that correction without leaving the context they are working in.

**Business/User Need**: Thinking is messy and iterative. Forcing users to get the type right on creation would slow them down. Instead, FlowMind lets them capture first and categorize later. This selector is the primary affordance for that "categorize later" workflow.

**When Used**: Rendered wherever a unit's type badge appears and the user has permission to edit -- typically inside unit cards, the detail panel, or any inline unit header. Selecting a new type persists the change to the database immediately via an optimistic tRPC mutation.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/lib/unit-types.ts` -- **BASE_UNIT_TYPES**: The canonical array of all 9 unit types (claim, question, evidence, counterargument, observation, idea, definition, assumption, action) with their labels, colors, icons, and descriptions. This is the single source of truth that populates the dropdown menu items.
- `src/lib/unit-types.ts` -- **UNIT_TYPE_COLORS**: A lookup map from UnitType to its color pair (light background tint and dark accent). Used to render the colored dot on the trigger button showing the currently selected type.
- `src/components/ui/dropdown-menu.tsx` -- Radix UI-based DropdownMenu primitives (Trigger, Content, Item). Provides accessible keyboard navigation, focus management, and portal-based rendering of the dropdown overlay.
- `src/trpc/react.ts` -- **api**: The tRPC React client. Gives access to `api.unit.update.useMutation` for persisting the type change and `api.useUtils()` for cache invalidation.
- `src/lib/utils.ts` -- **cn**: Tailwind class-name merging utility based on clsx and tailwind-merge.
- `lucide-react` -- **Check** icon: Displayed as a checkmark next to the currently selected type in the dropdown list.
- `@prisma/client` -- **UnitType** (type only): The Prisma-generated enum that constrains unit types to exactly the 9 valid values.

### Dependents (What Needs This)

At the time of writing, no other component imports UnitTypeSelector yet. It is built and ready for integration into unit card headers and the detail panel. Once wired in, expected consumers include:

- `src/components/layout/detail-panel.tsx` -- The side panel that shows full unit details; would use UnitTypeSelector in the unit metadata header.
- Unit card components within context or list views -- anywhere a unit's type badge is rendered inline.

### Data Flow

```
User clicks trigger button (shows current type with colored dot)
  --> Radix DropdownMenu opens, rendering all 9 types from BASE_UNIT_TYPES
    --> User selects a different type
      --> handleSelect guards against no-op (same type selected)
        --> tRPC mutation fires: api.unit.update.mutate({ id, unitType })
          --> onMutate (optimistic): cancels outgoing unit.list refetches,
              calls onTypeChange callback so parent can update UI instantly
          --> Server persists the change
          --> onSettled: invalidates unit.list cache to resync with server truth
```

---

## Macroscale: System Integration

### Architectural Layer

UnitTypeSelector sits in the **presentation layer** of FlowMind's three-tier client architecture:

- **Layer 1 -- Data definitions** (`src/lib/unit-types.ts`, Prisma schema): Defines what types exist and their visual tokens.
- **Layer 2 -- This component** (UI control + mutation): Translates the type system into an interactive picker and persists user choices.
- **Layer 3 -- Server** (`src/server/api/routers/unit.ts`, unitService, unitRepository): Validates and stores the updated type, triggers version history and event bus side effects.

### Big Picture Impact

Unit types are foundational to FlowMind's entire value proposition. They are what make FlowMind a structured thinking tool rather than a plain note-taking app. Changing a unit's type cascades through:

- **Visual identity** -- Every unit's card color, icon, and badge text derive from its type.
- **Reasoning flow suggestions** -- The UNIT_TYPE_NATURALLY_FOLLOWS map uses the current type to suggest what kind of unit should come next (for example, after a "claim," the system suggests creating "evidence" or a "counterargument").
- **Filtering and search** -- Users can filter units by type to see only their questions, only their evidence, and so on.
- **Analytics and dashboards** -- The project dashboard aggregates unit counts by type to show the composition of a user's thinking.

Without a way to change unit types after creation, users would be locked into their first classification, which contradicts the iterative nature of structured thinking.

### Critical Path Analysis

**Importance Level**: Moderate-High

- If this component fails to render, users lose the ability to reclassify units. The units themselves still work, but the thinking-refinement workflow is degraded.
- If the tRPC mutation fails silently, the optimistic UI would show the new type but the server would retain the old one. The `onSettled` invalidation acts as a safety net: it refetches server state regardless of success or failure, so the UI will self-correct on the next cache refresh.
- There is no fallback UI for changing type elsewhere in the application at this time, making this the single point of interaction for type reclassification.

---

## Technical Concepts (Plain English)

### Optimistic UI Update
**Technical**: The mutation's `onMutate` callback fires before the server responds, immediately calling the parent's `onTypeChange` callback and cancelling in-flight queries to prevent stale data from overwriting the optimistic state.

**Plain English**: When you click a new type, the UI updates instantly without waiting for the server to say "OK." It is like moving a sticky note to a new column on a whiteboard -- you see the change immediately, and the system confirms it in the background.

**Why We Use It**: Type changes are frequent, low-risk edits. Making users wait for a server round-trip (which could take hundreds of milliseconds) would make the interface feel sluggish and interrupt their flow of thought.

### Cache Invalidation (onSettled)
**Technical**: After the mutation completes (whether it succeeds or fails), `utils.unit.list.invalidate()` marks the cached unit list as stale, triggering a background refetch that reconciles the client with the server's actual state.

**Plain English**: After moving the sticky note, you double-check with the whiteboard's "official record" to make sure your move was saved. If something went wrong, the board corrects itself automatically.

**Why We Use It**: This is the safety net for optimistic updates. It ensures eventual consistency between client and server even if the network request fails or the server rejects the change.

### Radix UI DropdownMenu
**Technical**: A headless, WAI-ARIA compliant dropdown menu primitive from Radix UI that handles keyboard navigation, focus trapping, outside-click dismissal, and portal rendering.

**Plain English**: A pre-built, accessibility-tested dropdown component that handles all the tricky interaction details (arrow-key navigation, screen reader announcements, closing when you click outside) so the FlowMind team does not have to build those behaviors from scratch.

**Why We Use It**: Building accessible dropdown menus correctly is surprisingly complex. Radix handles edge cases (focus management, scroll locking, nested menus) that would take significant effort to implement and test manually.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created UnitTypeSelector component with Radix DropdownMenu, optimistic tRPC mutation, and colored-dot visual indicators for all 9 unit types.
- **Why**: Users need the ability to reclassify units as their thinking evolves, which is core to FlowMind's iterative structured-thinking model.
- **Impact**: Enables type reclassification workflow. Ready for integration into unit cards and the detail panel.
