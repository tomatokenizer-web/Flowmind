# Story 7.6: Multi-Format Export with Unit Conversion Rules

**Status: pending**

## Description
As a user,
I want to export my Assembly to Essay, Presentation, Email, or Social format with appropriate formatting per Unit type,
So that my thoughts become polished outputs ready for their destination.

## Acceptance Criteria

**Given** an Assembly with ordered Units and optional bridge text
**When** the user triggers export and selects a format
**Then** format-specific Unit conversion rules are applied per Unit type per FR51:
- Essay: Claims become thesis statements, Evidence becomes supporting paragraphs, Questions become rhetorical questions or section headers
- Presentation: Each Unit becomes a slide bullet or slide; type determines formatting
- Email: Concise format with Claims as key points, Action Units as action items
- Social: Condensed format with character limits respected

**Given** the export dialog is open
**When** the user configures the export
**Then** an export dialog allows format selection, preview, and download per UX-DR30

**Given** bridge text was generated
**When** the export is rendered
**Then** bridge text is included in the export output per FR52

## Tasks
- [ ] Create `src/server/services/exportService.ts` with the core export pipeline:
  - `exportAssembly(assemblyId, format, options)` function returning a string (document content)
  - `applyConversionRules(unit, format)` — maps unit_type + format to a formatted string segment
  - Supported formats enum: `'essay' | 'presentation' | 'email' | 'social'`
- [ ] Implement conversion rules table in `exportService.ts`:
  - Essay: `claim` → `## [content]` (thesis heading); `evidence` → paragraph; `question` → `> [content]` (blockquote rhetorical); `observation` → paragraph; `action` → omit or footnote
  - Presentation: each unit → `- [content]` bullet (80 char max); `claim` gets bold; `evidence` gets indented sub-bullet
  - Email: `claim` → bold key point; `action` → `- [ ] [content]` checklist; other types → brief paragraph; overall length target <300 words
  - Social: all units → 1 sentence max; total character limit 280 (Twitter) or 500 (LinkedIn); truncate with `...` if over limit; `action` units omitted
- [ ] Interleave bridge text: after rendering each unit segment, check the `bridgeText` map for the key between this unit and the next; if present, insert the bridge text as plain prose between segments
- [ ] Implement download: `POST /api/export` route in `src/app/api/export/route.ts` that calls `exportService.exportAssembly`, sets `Content-Disposition: attachment; filename=[name].[ext]`, and returns the file content; extensions: `.md` (essay), `.txt` (presentation), `.txt` (email), `.txt` (social)
- [ ] Create tRPC procedure `assembly.previewExport` (query, not mutation): input `{ assemblyId, format }`, returns rendered string for preview without downloading
- [ ] Create `src/components/assembly/ExportDialog.tsx` — modal with:
  - Format selector (4 radio options with icons and descriptions)
  - Live preview panel showing rendered output (calls `trpc.assembly.previewExport` on format change)
  - "Download" button — triggers POST to `/api/export`
  - Character/word count display for social/email formats
- [ ] Add "Export" button to `AssemblyHeader.tsx` that opens `ExportDialog`
- [ ] Write unit tests for `applyConversionRules`: each unit_type × format combination produces expected output
- [ ] Write integration tests: essay export contains bridge text between adjacent units, social export respects 280 char limit, email export includes action items as checklist

## Dev Notes
- Key files: `src/server/services/exportService.ts`, `src/app/api/export/route.ts`, `src/components/assembly/ExportDialog.tsx`, `src/server/api/routers/assembly.ts`
- Dependencies: Story 7.1 (Assembly + bridgeText data), Story 7.4 (bridge text), Story 7.7 (export history — record created after download completes)
- Technical approach: Export is a pure string transformation pipeline. No external libraries needed for basic formats. The conversion rules are implemented as a `conversionRuleMap: Record<UnitType, Record<ExportFormat, (content: string) => string>>` lookup for clean extensibility. The `previewExport` tRPC procedure enables real-time preview in the dialog without triggering file download. Story 7.7 hooks into the download completion to record ExportHistory — pass an optional `recordHistory: boolean` flag to `exportAssembly` or call the history service from the API route after successful response.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.4 (bridge text in export), Story 7.7 (export history recorded after download), Story 7.8 (source map / reference list appended to essay export)
- FR51: format-specific Unit conversion rules; FR52: bridge text in export; UX-DR30: export dialog
