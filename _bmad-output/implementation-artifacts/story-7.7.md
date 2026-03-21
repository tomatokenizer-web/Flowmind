# Story 7.7: Partial Export & Export History

**Status: pending**

## Description
As a user,
I want to export only specific Units from an Assembly and track when and how I exported,
So that I can create targeted outputs and know what's changed since my last export.

## Acceptance Criteria

**Given** an Assembly exists
**When** the user configures a Partial Export
**Then** they can filter by: specific Unit type only, specific Context membership, specific evidence_domain, or confirmed Units only per FR53
**And** the export preview updates to show only matching Units

**Given** an export completes
**When** an Export History record is created
**Then** it contains: export timestamp, format, Unit IDs included, and a snapshot hash of included Unit content per FR54

**Given** Units have changed since the last export
**When** the user views an Assembly
**Then** a notification badge shows "N units changed since last export" per FR54

**Given** export history exists for an Assembly
**When** the user views the history
**Then** they can re-export with the same settings or export with updated settings

## Tasks
- [ ] Add `ExportHistory` model to `prisma/schema.prisma` with fields: `id` (cuid), `assemblyId` (FK to Assembly), `userId` (FK to User), `format` (String — essay/presentation/email/social), `unitIds` (Json — string[]), `contentHash` (String — SHA-256 of concatenated unit contents at export time), `filterConfig` (Json — partial export filter settings), `createdAt`
- [ ] Run `prisma migrate dev --name add-export-history` and regenerate client
- [ ] Create `src/server/services/exportHistoryService.ts` with functions: `recordExportHistory(assemblyId, userId, format, unitIds, filterConfig)`, `getExportHistory(assemblyId)`, `computeContentHash(units)`, `getChangedUnitsSinceLastExport(assemblyId, userId)`
- [ ] In `computeContentHash`: sort unit IDs, concatenate `unitId:content` pairs, compute SHA-256 hex digest
- [ ] In `getChangedUnitsSinceLastExport`: fetch latest ExportHistory for the assembly; for each unitId in the last export, check if the unit's `updatedAt` is later than `ExportHistory.createdAt`; return count and changed unit IDs
- [ ] Add tRPC procedures to assembly router: `assembly.getExportHistory`, `assembly.getChangedSinceLastExport`
- [ ] Create `src/components/assembly/PartialExportFilter.tsx` — filter panel within `ExportDialog` (Story 7.6) with controls:
  - Unit type multi-select checkboxes (all types from unit_type enum)
  - Context membership dropdown (select specific context, or "Any")
  - Evidence domain filter input (free text or select from existing domains)
  - "Confirmed only" toggle (filters to units with `lifecycle: 'confirmed'`)
  - Filter summary: "Showing X of Y units"
- [ ] Update `ExportDialog.tsx` to include `PartialExportFilter` as a collapsible "Filters" section; wire filter state to `trpc.assembly.previewExport` call (add filter params)
- [ ] Update `exportService.exportAssembly` to accept an optional `filterConfig` param and apply filters before running conversion rules
- [ ] After successful export download in `src/app/api/export/route.ts`: call `exportHistoryService.recordExportHistory` with the filter config and unit IDs that were exported
- [ ] Create `src/components/assembly/ExportHistoryPanel.tsx` — list of past exports showing: timestamp (relative), format badge, unit count, "Re-export" button (pre-fills dialog with same filter config); accessible from Assembly detail via "History" tab
- [ ] Add changed-units badge to `AssemblyHeader.tsx`: call `trpc.assembly.getChangedSinceLastExport` on mount; if count > 0, render orange badge "N units changed since last export" next to the Export button
- [ ] Write tests: partial filter reduces exported units correctly, content hash is stable for same inputs and different for changed content, changed-units badge appears when a unit is updated after last export, re-export pre-fills filter from history record

## Dev Notes
- Key files: `prisma/schema.prisma`, `src/server/services/exportHistoryService.ts`, `src/server/api/routers/assembly.ts`, `src/components/assembly/PartialExportFilter.tsx`, `src/components/assembly/ExportHistoryPanel.tsx`
- Dependencies: Story 7.1 (Assembly model), Story 7.6 (exportService and ExportDialog to extend), Node.js `crypto` built-in for SHA-256
- Technical approach: Content hash uses Node.js `crypto.createHash('sha256')` — no external package needed. The `filterConfig` JSON stored in ExportHistory enables exact replay of the same partial export. For the changed-units badge, use a lightweight query: `SELECT count(*) FROM unit WHERE id IN [...lastExportUnitIds] AND updatedAt > lastExportCreatedAt`. Avoid over-fetching: only load unit `id` and `updatedAt` for the comparison.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.6 (export pipeline that partial export extends), Story 7.1 (Assembly model)
- FR53: partial export filters; FR54: export history with content snapshot hash and changed-unit notification
