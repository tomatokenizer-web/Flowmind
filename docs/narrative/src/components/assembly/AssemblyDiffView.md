# AssemblyDiffView

## Purpose

Renders a side-by-side comparison of two assemblies, showing which units were added, removed, or are shared between them. It is the UI surface for the `assembly.diff` procedure (Story 7.5).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `assemblyAId` | `string` | — | UUID of the "base" assembly (left column) |
| `assemblyBId` | `string` | — | UUID of the "compare" assembly (right column) |
| `assemblyAName` | `string` | `"Assembly A"` | Display label for the left column header |
| `assemblyBName` | `string` | `"Assembly B"` | Display label for the right column header |

## Data Flow

1. Calls `api.assembly.diff` with both IDs — returns `{ onlyInA, onlyInB, shared, summary }` (arrays of unit UUIDs).
2. Calls `api.assembly.getById` for each assembly to build a `unitId → { content, unitType }` lookup map.
3. All three queries run in parallel; a loading spinner is shown until all resolve.

## Layout

- **Summary bar** — three stat pills: added count (green), removed count (red), shared count (neutral).
- **Column headers** — labelled with assembly names.
- **Two-column diff grid**:
  - Left column: units only in A (red "Removed" badge) + shared units (neutral).
  - Right column: units only in B (green "Added" badge) + shared units (neutral).

## DiffCard sub-component

Each unit is rendered as a `DiffCard` with:
- A status icon (Plus / Minus / Equal) and badge label.
- The unit type shown top-right.
- Up to 3 lines of unit content.

The status drives the border and background tint (success/danger/neutral).

## Error States

- Loading: spinner with "Comparing assemblies…" message.
- Query error: red notice box with the error message.
- Empty columns: "No units" placeholder text.

## Usage

Embedded inside `AssemblyCompareDialog` (in `dashboard/page.tsx`) which provides the two assembly IDs and names selected by the user from the assembly list.
