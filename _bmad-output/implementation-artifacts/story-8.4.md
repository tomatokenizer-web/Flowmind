# Story 8.4: External Knowledge Import with Connection Mode

**Status: pending**

## Description
As a user,
I want to import external knowledge (papers, web clips, book chapters) and choose how it connects to my existing thinking,
So that outside sources enrich my graph in the way I intend.

## Acceptance Criteria

**Given** the user imports external content (via paste, URL, or file upload)
**When** the system processes the import
**Then** it creates a Citation Unit (source metadata) + Resource Unit (the content) per FR18
**And** the user is prompted to select a connection mode per FR19:
  (1) Connect to active Context — imported Units are added to the current Context with AI-proposed relations
  (2) Start a new Context — a new Context is created with the imported content as seed
  (3) Hold in Incubation Queue — content is saved but not connected yet
**And** each derived Unit tracks provenance via `origin_type` and `source_span` per FR20
**And** the import preserves the source URL, author, date, and excerpt for citation

## Tasks
- [ ] Create `ImportJob` Prisma model: `id`, `user_id`, `import_type` (enum: paste, url, file), `raw_content`, `source_url`, `source_author`, `source_date`, `status` (enum: processing, completed, failed), `created_at`
- [ ] Create `server/repositories/importRepository.ts` — CRUD for ImportJob, Citation Unit and Resource Unit creation
- [ ] Create `server/services/importService.ts` — URL fetch (via edge function), file parse (plain text/PDF/markdown), Citation + Resource Unit creation with correct `origin_type` and `source_span`, AI relation proposal for Connect mode
- [ ] Add tRPC procedures: `import.fromPaste`, `import.fromUrl`, `import.fromFile`, `import.setConnectionMode`, `import.getStatus`
- [ ] Create `components/import/ImportDialog.tsx` — three-tab input (Paste / URL / File), connection mode selection step, preview of created Units
- [ ] Create `components/import/ConnectionModeSelector.tsx` — radio group for three connection modes with descriptions
- [ ] Create `components/import/ImportProgressIndicator.tsx` — processing state with status polling
- [ ] Implement URL fetch via Next.js API route (server-side to avoid CORS): extracts title, author, date, content via `@extractus/article-extractor` or similar
- [ ] Implement file upload via tRPC `import.fromFile` with multipart form (or presigned S3 URL)
- [ ] Add "Import External Knowledge" button to Context toolbar and sidebar quick-actions
- [ ] Write unit tests for Citation/Resource Unit creation with correct provenance fields
- [ ] Write integration tests for all three connection modes

## Dev Notes
- Key files: `server/services/importService.ts`, `server/api/routers/import.ts`, `components/import/ImportDialog.tsx`
- Dependencies: Story 2.1 (Unit model with origin_type/source_span), Story 2.3 (Context membership), Story 4.x (AI relation proposals), Story 8.1 (Incubation Queue for Hold mode)
- Technical approach: Citation Unit has `unit_type: "definition"` with source metadata in content. Resource Unit has `unit_type: "evidence"` with `origin_type: "external_excerpt"` and `source_span.parent_input_id` pointing to CitationUnit id. URL extraction runs in a Next.js API route to keep server-side. File uploads limited to 10MB per NFR constraint.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR18: Citation Unit + Resource Unit creation
- FR19: Connection mode selection
- FR20: Provenance tracking via origin_type and source_span
- Related: Story 8.5 (Reverse Provenance uses source_span), Story 8.1 (Incubation Queue hold mode)
