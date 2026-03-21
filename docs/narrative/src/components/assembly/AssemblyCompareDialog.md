# AssemblyCompareDialog

## Purpose

A modal dialog that wraps `AssemblyDiffView` and exposes two dropdown selectors so the user can pick any two assemblies from the current project to compare. It is opened from the assembly list on the dashboard via the "Compare" button that appears on each assembly card.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Radix open-state callback |
| `initialAssemblyAId` | `string` | UUID pre-selected as the base assembly (left column) |
| `initialAssemblyBId` | `string` | UUID pre-selected as the compare assembly (right column) |
| `assemblies` | `Array<{ id, name }>` | Full list of assemblies for the current project, used to populate the selectors |

## State

- `assemblyAId` / `assemblyBId` — controlled by the two `<select>` elements; seeded from props and re-synced whenever the dialog is opened from a different card.

## Layout

1. **Header** — "Compare Assemblies" title with close button.
2. **Selector row** — two labelled dropdowns ("Base" / "Compare to"). Each dropdown disables the option already chosen in the other to prevent selecting the same assembly twice.
3. **Diff content area** — renders `AssemblyDiffView` when the two IDs differ; shows a prompt to "Select two different assemblies" when they are the same.

## Relationship to AssemblyDiffView

`AssemblyCompareDialog` is purely a shell: it owns assembly selection state and passes the resolved IDs and names down to `AssemblyDiffView`, which handles all data fetching and rendering.
