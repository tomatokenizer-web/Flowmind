# ProvenanceChain

**Path:** `src/components/feedback/ProvenanceChain.tsx`
**Story:** 8.5 — Reverse Provenance

## Purpose

Renders the derivation ancestry of a unit as a vertical chain. Starting from the selected unit, the component walks backwards through relations of type `derives_from`, `responds_to`, `supports`, and `references` (up to 5 levels deep) and displays each ancestor node with its relation label, unit type badge, and content preview.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `unitId` | `string` | UUID of the unit whose provenance is being traced |
| `onNavigate` | `(unitId: string) => void` | Optional callback invoked when the user clicks an ancestor node |

## Behavior

- Queries `feedback.getProvenance` on mount, enabled only when `unitId` is non-empty.
- Shows a centered spinner while loading.
- Shows an empty state (`GitCommitHorizontal` icon) when the chain is empty.
- Renders each ancestor as a clickable card connected by a vertical line, ordered from immediate parent (depth 1) to most distant ancestor (depth N).
- Each node displays:
  - A `UnitTypeBadge` for the ancestor's type
  - The relation label (underscores replaced with spaces)
  - The depth number
  - A 2-line content preview
- Clicking a node calls `onNavigate(node.id)`, allowing the host panel to open that unit's detail view.

## Data flow

```
ProvenanceChain
  └── api.feedback.getProvenance (query)
        input:  { unitId }
        output: { chain: Array<{ id, content, unitType, relation, depth }> }
```

## Mount point

Rendered as the "Provenance" tab inside `src/components/panels/UnitDetailPanel.tsx`. The tab is added to `TAB_CONFIG` alongside Content, Relations, Metadata, and AI tabs. The `onNavigate` callback is wired to the panel's unit-selection handler so clicking an ancestor opens its detail view.
