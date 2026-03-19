# customRelationTypeRouter

**File:** `src/server/api/routers/customRelationType.ts`

## Purpose

Manages custom relation types that users define within a project, alongside read access to the fixed set of system relation types. Relation types label directed edges between units (e.g., "supports", "contradicts", "extends"). System types are seeded and immutable; custom types are per-project and user-managed.

## Procedures

### `customRelationType.create`

Creates a new custom relation type for a project.

**Input:**
| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` (1-100 chars) | Display name; must not clash with any system type (case-insensitive) |
| `description` | `string` | Optional prose description, defaults to `""` |
| `projectId` | `uuid` | Owning project |
| `scope` | `"private" \| "shared"` | Visibility within project membership |
| `reusable` | `boolean` | Whether the type can be reused across contexts |
| `purposeTag` | `string?` | Optional semantic tag for filtering |

**Conflict guard:** Queries `systemRelationType` case-insensitively before writing. Throws `CONFLICT` if a system type with the same name exists.

**ID generation:** Uses `crypto.randomUUID()` — no client-supplied IDs.

---

### `customRelationType.list`

Returns all custom relation types for a given project, ordered by creation time ascending.

**Input:** `{ projectId: uuid }`

---

### `customRelationType.update`

Patches a custom relation type's mutable fields. All fields are optional; only supplied fields are written.

**Input:** `{ id: uuid, name?: string, description?: string, reusable?: boolean }`

If `name` is supplied, re-runs the system-type conflict check before updating.

Note: `scope` and `purposeTag` are intentionally not patchable here (out of scope for initial implementation).

---

### `customRelationType.delete`

Deletes a custom relation type. Before deletion, counts how many relations currently use this type (by matching `type === customType.name AND isCustom === true`).

**Input:** `{ id: uuid }`

**Returns:** `{ deleted: true, relationsUsingType: number }`

The count is returned so the UI can display a warning before the user confirms. The delete is unconditional — the caller is responsible for surfacing the warning.

**Error:** Throws `NOT_FOUND` if the id does not exist prior to deletion.

---

### `customRelationType.listSystemTypes`

Returns all 23 system relation types grouped by category.

**Input:** none

**Returns:** `Record<string, SystemRelationType[]>` — keys are category strings, values are arrays of types ordered by `sortOrder` within each category.

Useful for populating relation-type pickers where system and custom types are shown in separate sections.

---

## Authorization

All procedures use `protectedProcedure`, meaning a valid session is required. There is currently no per-project ownership check inside the procedures — that is assumed to be enforced at a higher layer (middleware or caller).

## Security Notes

- All string inputs are validated by Zod (length bounds, UUID format) before any database access.
- Name conflict checks use Prisma's parameterized queries — no raw SQL interpolation.
- `crypto.randomUUID()` is used for ID generation; no user-supplied IDs are accepted on create.
- The `CONFLICT` error message echoes back the user-supplied `name`. This is intentional (UX feedback) and safe — the value is bounded to 100 chars by Zod before it reaches the error message.
