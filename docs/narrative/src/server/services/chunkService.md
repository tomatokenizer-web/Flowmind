# chunkService

**Path:** `src/server/services/chunkService.ts`

## Purpose

Computes transient, on-the-fly groupings of units ("chunks") based on a chosen purpose. Chunks are never persisted to the database — they are computed at request time and returned as plain data structures.

## Exported Interface

### `TransientChunk`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Index-based identifier (`chunk-0`, `chunk-1`, …) |
| `unitIds` | `string[]` | IDs of units in this chunk |
| `label` | `string` | Human-readable label (Cluster N or YYYY-MM-DD) |
| `dominantType` | `string` | Most frequently occurring `unitType` within the chunk |

### `computeChunks(purpose, units, relations)`

| Parameter | Type | Description |
|---|---|---|
| `purpose` | `'argument' \| 'creative' \| 'chronological'` | Grouping strategy to apply |
| `units` | `Array<{ id, unitType, createdAt }>` | Units to partition |
| `relations` | `Array<{ sourceUnitId, targetUnitId, type, strength }>` | Relations between units |

Returns `TransientChunk[]`.

## Chunking Strategies

### Early-exit: fewer than 4 units

When the total unit count is below 4, a single chunk containing all units is returned immediately (no grouping logic runs).

### `argument`

Groups units that are connected by argument-category relation types with `strength >= 0.3`:

> `supports`, `contradicts`, `derives_from`, `expands`, `references`, `exemplifies`, `defines`, `questions`

Uses a **Union-Find** (disjoint-set) structure with path compression and union-by-rank to build connected components efficiently. Each component with ≥ 2 units becomes a chunk labelled `Cluster N`.

### `creative`

Same Union-Find approach but over creative-category relation types at **any strength**:

> `inspires`, `echoes`, `transforms_into`, `foreshadows`, `parallels`, `contextualizes`, `operationalizes`

Chunks are also labelled `Cluster N`.

### `chronological`

Groups units by the calendar day (`YYYY-MM-DD`) derived from `createdAt`. Day buckets with ≥ 2 units become chunks; the label is the date string itself.

## Filtering Rules

- Both endpoints of a relation must belong to the supplied unit set; cross-set relations are ignored.
- Chunks with fewer than 2 units are discarded.

## Internal Helpers

| Helper | Purpose |
|---|---|
| `UnionFind` | Path-compressed disjoint-set for O(α) component queries |
| `dominantUnitType` | Counts `unitType` occurrences and returns the modal value |
| `buildChunksFromComponents` | Converts Union-Find component map → `TransientChunk[]` |

## Relation Type Constants

`ARGUMENT_TYPES` and `CREATIVE_TYPES` are `Set<string>` constants defined at module level for O(1) membership tests.
