# AssemblyTemplateDialog

## Purpose

A modal dialog that lets users create a new assembly from a predefined template instead of always starting blank. It replaces the one-click "New Assembly" button with a two-step flow: pick a template, then confirm a name. When a `contextId` is provided, an "Auto-map units" button appears that proposes which units from that context map to each template slot.

## Location

`src/components/assembly/AssemblyTemplateDialog.tsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | yes | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | yes | Called when the dialog should close |
| `projectId` | `string` (UUID) | yes | Project to create the assembly in |
| `contextId` | `string` (UUID) | no | When provided, enables the "Auto-map units" button (Story 7.10) |
| `onCreated` | `(assemblyId: string) => void` | yes | Called with the new assembly's ID after successful creation |

## Templates

Five built-in templates are defined as static data (`TEMPLATES` array):

| ID | Label | Slots |
|----|-------|-------|
| `blank` | Blank | none |
| `essay` | Essay | Introduction, Body I–III, Conclusion |
| `research_paper` | Research Paper | Abstract, Introduction, Methods, Results, Discussion |
| `presentation` | Presentation | Hook, Problem, Solution, Evidence, Call to Action |
| `debate_brief` | Debate Brief | Claim, Warrant I–II, Evidence, Rebuttal |

## Auto-Mapping Flow (Story 7.10)

1. User selects a non-blank template and `contextId` is present.
2. "Auto-map units" button appears in the slot preview header.
3. On click, `api.assembly.proposeSlotMappings` is called with `contextId` + `templateType`.
4. Proposals (`{ slot, proposedUnitId, confidence }[]`) are displayed as accept/reject rows.
5. All proposals start accepted (green). User can toggle each individually.
6. On "Create", the assembly is built with its template slots as normal.

## Sub-components

### `ProposedUnitLabel`
Resolves a `unitId` to a short content preview using `api.unit.list`. Shown inline in each mapping row.

## Behavior

- Defaults to "Blank" template on open.
- Selecting a template resets any existing mapping proposals.
- "Blank" calls `api.assembly.create`; all other templates call `api.assembly.createFromTemplate`.
- On success, invalidates `assembly.list`, calls `onCreated`, and resets all internal state.
- Create button is disabled while pending or name is empty.

## API Calls

- `api.assembly.create` — for blank assemblies
- `api.assembly.createFromTemplate` — for templated assemblies
- `api.assembly.proposeSlotMappings` — heuristic unit-to-slot proposals (manual trigger)
- `api.unit.list` — to resolve unit labels in `ProposedUnitLabel`

## Related Files

- `src/server/api/routers/assembly.ts` — defines `proposeSlotMappings` and `createFromTemplateSchema`
- `src/server/services/assemblyService.ts` — implements `createFromTemplate` logic
