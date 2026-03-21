# Story 7.8: Assembly Source Map

**Status: pending**

## Description
As a user,
I want to see which external resources contributed to my Assembly and at what ratio,
So that I can verify the provenance and intellectual composition of my documents.

## Acceptance Criteria

**Given** an Assembly contains Units with provenance data (origin_type, source_span)
**When** the user views the Assembly Source Map
**Then** it auto-generates a visualization showing which external resources contributed to the Assembly and at what ratio per FR75

**Given** the source map is rendered
**When** the user inspects a source entry
**Then** each source entry shows: `resource_unit_id` (or "directly written" for user-authored Units), `contributing_units` list, and `contribution_ratio` per PRD Appendix A-14
**And** source entries are grouped by origin: external resources vs. directly written content
**And** each source shows: resource name/URL, number of Units derived from it, and percentage of Assembly coverage

**Given** the source map is computed
**When** the data is stored
**Then** a `source_map[]` array is stored on the Assembly model per PRD Appendix A-14

**Given** an Assembly is exported
**When** the export format is Essay
**Then** a reference list is auto-generated and appended to the export

**Given** the Assembly detail view is open
**When** the user looks for the Source Map
**Then** it is accessible as a dedicated tab or panel in the Assembly detail view

## Tasks
- [ ] Define `SourceMapEntry` TypeScript type: `{ resourceUnitId: string | null; resourceName: string; resourceUrl: string | null; contributingUnitIds: string[]; contributionRatio: number; originType: 'external' | 'direct_write' }`
- [ ] Create `src/server/services/sourceMapService.ts` with function `buildSourceMap(assemblyId)`:
  - Fetch all units in the assembly with their `originType` and `sourceSpan` fields
  - Group units by `sourceSpan.parentInputId` (or null for direct_write)
  - For each group, compute `contributionRatio = groupUnitCount / totalUnitCount`
  - Fetch resource unit metadata (name, URL) for each non-null `parentInputId`
  - Return `SourceMapEntry[]` sorted by ratio descending
- [ ] Add `sourceMap` JSON column to Assembly (Story 7.1 already includes `sourceMap Json?`) — use `SourceMapEntry[]` as the stored type
- [ ] Add tRPC procedure `assembly.buildSourceMap` (mutation): calls `sourceMapService.buildSourceMap`, persists result to `Assembly.sourceMap`, returns the entries
- [ ] Add tRPC query `assembly.getSourceMap` (query): returns `Assembly.sourceMap` if already computed, or triggers computation if null
- [ ] Create `src/components/assembly/SourceMapPanel.tsx` — renders the source map as a list grouped into two sections ("External Sources" and "Directly Written"):
  - Each external source entry: resource name (linked if URL available), unit count, percentage bar (horizontal progress bar), expandable list of contributing unit content previews
  - "Directly Written" group: percentage bar, unit count
  - "Refresh" button that calls `trpc.assembly.buildSourceMap`
- [ ] Add "Source Map" tab to the Assembly detail view (add a `Tabs` component to `src/app/(app)/assembly/[id]/page.tsx` with tabs: "Board", "Source Map", "History")
- [ ] Update `exportService.ts` (Story 7.6): when `format === 'essay'`, append a "References" section to the export output by iterating `assembly.sourceMap` entries with `originType === 'external'` and formatting as numbered reference list (APA-style: "Author. (Date). Title. URL.")
- [ ] Write tests: buildSourceMap correctly groups units by parentInputId, contribution ratios sum to 1.0, direct-write units are grouped separately, reference list appended to essay export

## Dev Notes
- Key files: `src/server/services/sourceMapService.ts`, `src/server/api/routers/assembly.ts`, `src/components/assembly/SourceMapPanel.tsx`, `src/app/(app)/assembly/[id]/page.tsx`
- Dependencies: Story 7.1 (Assembly.sourceMap JSON field), Story 7.6 (export service to append references), Unit model `originType` and `sourceSpan` fields (Epic 1/2)
- Technical approach: `buildSourceMap` is computed on-demand and cached in `Assembly.sourceMap`. Invalidate (set to null) whenever `assemblyUnits` are modified so the next view triggers a fresh computation. The `contributionRatio` is a simple count-based ratio (not token-weighted), matching the PRD A-14 specification. The reference list format is APA-style as a reasonable default — if the resource unit has `author`, `date`, `title`, `url` fields in its metadata, use them; otherwise fall back to URL only.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (sourceMap JSON field on Assembly), Story 7.6 (reference list in essay export)
- FR75: Assembly Source Map visualization; PRD Appendix A-14: SourceMapEntry schema
