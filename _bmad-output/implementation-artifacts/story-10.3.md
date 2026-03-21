# Story 10.3: Data Export & Privacy Controls

**Status: pending**

## Description
As a user,
I want to export all my data and control what information is shared externally,
So that I own my intellectual property and can comply with my own privacy standards.

## Acceptance Criteria

**Given** the user's account contains Units, Relations, Assemblies, and Contexts
**When** the user requests a full data export
**Then** the system exports all Units, relations, Assemblies, Contexts, and metadata to user-owned format (JSON and/or Markdown) per NFR21
**And** the export is downloadable as a ZIP archive
**And** a privacy settings page specifies: what data is sent to external AI services (only on explicit export/prompt generation), local processing options (embedding generation toggle), and a clear statement that user data is not used for AI training per NFR20
**And** the user can delete their account and all associated data (hard delete)
**And** export and deletion actions require confirmation via the destructive Dialog variant

## Tasks
- [ ] Create `DataExportJob` Prisma model: `id`, `user_id`, `status` (enum: queued, processing, ready, expired), `format` (enum: json, markdown, zip), `download_url`, `expires_at`, `created_at`
- [ ] Create `server/repositories/dataExportRepository.ts` — CRUD for DataExportJob
- [ ] Create `server/services/dataExportService.ts` — `generateExport(userId, format)`: queries all user data (Units, Relations, Assemblies, Contexts, Projects), serializes to JSON and/or Markdown files, packages as ZIP, uploads to temporary storage (Supabase Storage or presigned S3 URL), records download URL in DataExportJob
- [ ] Create Trigger.dev job `data-export-job.ts` — async export processing; updates job status on completion
- [ ] Add tRPC procedures: `dataExport.request`, `dataExport.getStatus`, `dataExport.getDownloadUrl`
- [ ] Create `server/services/accountDeletionService.ts` — `deleteAccount(userId)`: hard deletes all user data in correct dependency order (Units → Relations → Assemblies → Contexts → Projects → User), revokes all sessions and API keys
- [ ] Add tRPC procedure `account.requestDeletion` — requires re-authentication or confirmation token before proceeding
- [ ] Create `components/settings/DataExportSection.tsx` — shows export format options (JSON, Markdown, ZIP), "Request Export" button, status indicator, download link when ready
- [ ] Create `components/settings/PrivacyControlsSection.tsx` — toggles: "Allow embedding generation for search" (default on), "Include data in AI improvement" (default off, fixed — displays statement that data is never used for training), list of current API keys with revoke buttons
- [ ] Create `components/settings/DeleteAccountSection.tsx` — "Delete My Account" button with destructive Dialog confirmation (type "DELETE" to confirm), explains what will be deleted
- [ ] Create `components/common/DestructiveDialog.tsx` — reusable confirmation dialog with red "Confirm" button, optional text input for typing confirmation word
- [ ] Add privacy statement text: "Your data is never used to train AI models. Embeddings are generated solely for in-app search features."
- [ ] Export expiry: DataExportJob download URLs expire after 24 hours; job record is cleaned up by a scheduled Trigger.dev job
- [ ] Write unit tests for dataExportService serialization (JSON and Markdown format correctness)
- [ ] Write integration tests for full export flow: request → processing → ready → download

## Dev Notes
- Key files: `server/services/dataExportService.ts`, `server/services/accountDeletionService.ts`, `server/api/routers/dataExport.ts`, `components/settings/DataExportSection.tsx`, `components/settings/PrivacyControlsSection.tsx`, `components/settings/DeleteAccountSection.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.3 (Context), Story 2.4 (Relations), Story 5.x (Assemblies), Story 9.1 (Projects), Story 1.x (user/auth), Story 10.1 (API key model for revocation)
- Technical approach: Export is async — large datasets can't be exported synchronously. User requests export → Trigger.dev job queued → job streams data to ZIP using `archiver` npm package → uploads to Supabase Storage → records signed URL. Markdown export: one file per Context, each Unit as a `## [unit_type] - [content]` section, relations shown as bullet list below each Unit. Account deletion uses a Prisma transaction with explicit ordering to respect FK constraints. Privacy controls stored in `user_preferences` JSON field on User model (add `embeddingEnabled: boolean` key).

## References
- Epic 10: External Integration & Context Export API
- NFR20: Privacy controls — explicit user consent for external data sharing
- NFR21: Full data export to user-owned formats
- Related: Story 10.1 (API keys revoked on account deletion), Story 10.3 (integration OAuth tokens deleted on account deletion)
