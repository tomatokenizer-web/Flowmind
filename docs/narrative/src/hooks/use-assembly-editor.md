# use-assembly-editor

Hook that manages the editing state for a single assembly, bridging local UI state with tRPC mutations for the assembly router.

## Purpose

Provides a unified interface for reading and mutating an assembly's name, rhetorical shape (frame), and ordered items. Handles optimistic local updates alongside persisted server mutations, with debounced auto-save for name and frame changes.

## Parameters

- `assemblyId: string | null` — the assembly to load; pass null when no assembly is active.

## Returned State

- `items` — ordered list of `AssemblyItem` objects (id, unitId, unit, position, assemblyRole, bridgeText)
- `name` — current assembly name
- `frame` — current rhetorical shape (`argument | narrative | analysis | comparison | synthesis | null`)
- `template` / `templateSlots` — active template and its slot mappings
- `isLoading` / `isDirty` — loading and unsaved-change flags

## Key Mutations Called

| Action | Router method | Input shape |
|--------|--------------|-------------|
| Save name/frame | `assembly.update` | `{ id, name, rhetoricalShape }` |
| Add item | `assembly.addItem` | `{ assemblyId, unitId, position, assemblyRole }` |
| Remove item | `assembly.removeItem` | `{ itemId }` |
| Reorder items | `assembly.reorderItems` | `{ assemblyId, items: [{itemId, position}] }` |
| Update role/bridge | `assembly.updateItem` | `{ itemId, assemblyRole?, bridgeText? }` |
| Export | `assembly.export` | `{ assemblyId, format, unitIds, contentHash }` |

## Notes

- Auto-save fires 1 second after any dirty state change via `useDebouncedCallback`.
- `removeItem` and `updateRole`/`updateAnnotation` do not require `assemblyId` in their mutation calls (the router looks up ownership via `itemId`).
- Export uses `btoa(unitIds.join(","))` as a simple content hash.
