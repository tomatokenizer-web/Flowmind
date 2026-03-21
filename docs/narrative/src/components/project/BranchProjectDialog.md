# BranchProjectDialog

## Purpose

A modal dialog that lets the user fork the current project into a new one, carrying selected units along. It is the primary UI trigger for the `feedback.branchProject` mutation (Story 8.8).

## When It Appears

The dialog is opened from the **DriftPanel** via a "Branch to new project" button. It arrives pre-populated with the drifting unit IDs that prompted the branch action.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Radix open-state callback |
| `sourceProjectId` | `string` | UUID of the project being branched from |
| `preselectedUnitIds` | `string[]` | Units to branch (e.g. drifting units); at least one required by the mutation |
| `availableUnits` | `Array<{id, content, unitType}>` | Full unit list for optional inclusion |
| `onSuccess` | `(newProjectId: string) => void` | Called after successful branch |

## Form Fields

1. **Project name** (required) — becomes the `name` field on the new project.
2. **Purpose** (optional, max 500 chars) — stored as `branchReason` on the project record.
3. **Include shared units checkbox** — when checked, all non-drifting `availableUnits` are pre-selected; individual units can be deselected from the revealed list.

## Mutation Behaviour

Calls `api.feedback.branchProject` with:
- `sourceProjectId`
- `unitIds` — union of pre-selected and any additionally ticked shared units
- `name` / `purpose`

On success the server creates a new project (with `branchedFrom` set), a "Main" context, and resets `driftScore` to 0 on all branched units.

## State

- `name` / `purpose` — controlled inputs, reset on success.
- `selectedIds` — a `Set<string>` derived from `preselectedUnitIds`; updated when the dialog reopens or when the user toggles individual shared units.
- `includeShared` — drives bulk-add/remove of non-drifting units.

## Error Handling

Validation is enforced client-side (`name` required, `selectedIds` non-empty). Server errors surface via `toast.error`.
