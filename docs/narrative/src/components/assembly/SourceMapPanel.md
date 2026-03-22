# SourceMapPanel

**Path:** `src/components/assembly/SourceMapPanel.tsx`

## Purpose

Displays a visual breakdown of which sources contributed units to an assembly, grouped into four origin categories: Human, AI, Import, and Decomposition. Rendered as a collapsible panel inside `AssemblyBoard`.

## Behavior

- Collapsed by default; data is only fetched when the user expands the panel.
- Calls `api.assembly.getSourceMap` with the current `assemblyId`.
- Renders a horizontal stacked bar chart (plain divs, no chart library) showing percentage contribution per source group.
- Each bar segment has a tooltip with label, count, and percentage.
- Below the bar, a legend lists each source group with its badge color, unit count, and percentage.

## Origin Group Color Coding

| Group | Bar Color | Description |
|-------|-----------|-------------|
| human | blue-500 | `direct_write` origin type |
| ai | purple-500 | `ai_generated` or `ai_refined` |
| import | green-500 | `external_excerpt`, `external_inspiration`, `external_summary` |
| decomposition | orange-500 | any other origin type |

## Props

| Prop | Type | Description |
|------|------|-------------|
| `assemblyId` | `string` (UUID) | ID of the assembly to show the source map for |

## Dependencies

- `api.assembly.getSourceMap` tRPC query (Story 7.8)
- `lucide-react`: `Map`, `ChevronDown` icons
- Tailwind utility classes for color coding
