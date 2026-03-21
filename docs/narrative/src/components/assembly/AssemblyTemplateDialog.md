# AssemblyTemplateDialog

## Purpose

A modal dialog that lets users create a new assembly from a predefined template instead of always starting blank. It replaces the one-click "New Assembly" button with a two-step flow: pick a template, then confirm a name.

## Location

`src/components/assembly/AssemblyTemplateDialog.tsx`

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Called when the dialog should close |
| `projectId` | `string` | UUID of the project to create the assembly in |
| `onCreated` | `(assemblyId: string) => void` | Called with the new assembly's ID after successful creation |

## Templates

Five built-in templates are defined as static data (`TEMPLATES` array):

| ID | Label | Slots |
|----|-------|-------|
| `blank` | Blank | none |
| `essay` | Essay | Introduction, Body I–III, Conclusion |
| `research_paper` | Research Paper | Abstract, Introduction, Methods, Results, Discussion |
| `presentation` | Presentation | Hook, Problem, Solution, Evidence, Call to Action |
| `debate_brief` | Debate Brief | Claim, Warrant I–II, Evidence, Rebuttal |

## Behavior

- Defaults to "Blank" template on open.
- Selecting a non-blank template shows a slot preview below the grid.
- Name field defaults to "New Assembly" and is editable.
- "Blank" calls `api.assembly.create`; all other templates call `api.assembly.createFromTemplate` with the template's `id` as `templateType` and its slot array.
- On success, invalidates `assembly.list`, calls `onCreated`, and resets internal state.
- Create button is disabled while a mutation is pending or the name field is empty.

## API Calls

- `api.assembly.create` — for blank assemblies
- `api.assembly.createFromTemplate` — for templated assemblies; passes `templateType`, `slots` (name + position pairs)

## Related Files

- `src/app/dashboard/page.tsx` — hosts this dialog in `AssemblyViewWithList`
- `src/server/api/routers/assembly.ts` — defines `createFromTemplateSchema`
- `src/server/services/assemblyService.ts` — implements `createFromTemplate` logic
