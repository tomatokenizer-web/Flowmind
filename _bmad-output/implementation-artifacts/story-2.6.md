# Story 2.6: Resource Unit Support for Non-Text Content

Status: ready-for-dev

## Story

As a user,
I want to attach images, files, audio, code, and links as first-class Resource Units,
So that non-text content participates equally in my thinking alongside text Units.

## Acceptance Criteria

1. **Given** the Thought Unit model, **When** a Resource Unit model is defined, **Then** it includes: `id` (cuid), `resource_type` (enum: image, table, audio, diagram, link, video, code), `url` (Vercel Blob storage URL or external URL), `mime_type`, `file_size`, `metadata` (JSON for dimensions, duration, etc.), `created_at`, `user_id` per FR4
2. Files are uploaded to Vercel Blob storage and the returned URL is stored in the Resource Unit
3. A single Resource Unit can be referenced by multiple Thought Units via a many-to-many join table per FR4
4. tRPC procedures `resource.upload`, `resource.getById`, `resource.list`, `resource.delete` are available
5. The UnitCard renders Resource Units with a type-specific preview (image thumbnail, code snippet, link preview, audio waveform placeholder)
6. Resource Units support the same lifecycle states as Thought Units (draft, pending, confirmed)

## Tasks / Subtasks

- [ ] Task 1: Define Prisma schema for Resource Unit (AC: #1, #3)
  - [ ] Add `ResourceType` enum (image, table, audio, diagram, link, video, code)
  - [ ] Define `ResourceUnit` model with all fields, snake_case `@@map`
  - [ ] Add `metadata` as `Json?` field for type-specific data (dimensions, duration, etc.)
  - [ ] Create `UnitResource` join table for many-to-many relationship between Units and Resources
  - [ ] Add `lifecycle` field reusing the same `Lifecycle` enum from Story 2.1
  - [ ] Run `prisma migrate dev`
- [ ] Task 2: Create resource repository layer (AC: #4)
  - [ ] Create `server/repositories/resourceRepository.ts`
  - [ ] Implement `create`, `findById`, `findMany`, `delete` methods
  - [ ] Implement `linkToUnit`, `unlinkFromUnit` for join table management
- [ ] Task 3: Implement Vercel Blob upload (AC: #2)
  - [ ] Create `server/services/storageService.ts`
  - [ ] Implement `upload(file: File)` → returns Vercel Blob URL
  - [ ] Implement `delete(url: string)` for cleanup
  - [ ] Add file size validation (configurable max, e.g., 50MB)
  - [ ] Add MIME type validation against allowed types
- [ ] Task 4: Create resource service layer (AC: #4, #6)
  - [ ] Create `server/services/resourceService.ts`
  - [ ] Implement `upload` (handles file upload + DB record creation)
  - [ ] Implement `getById`, `list`, `delete` with cascading blob cleanup
  - [ ] Publish events: `resource.created`, `resource.deleted`
  - [ ] Enforce lifecycle restrictions (same as Thought Units)
- [ ] Task 5: Create tRPC router (AC: #4)
  - [ ] Create `server/api/routers/resource.ts`
  - [ ] Define `resource.upload` with file validation
  - [ ] Define `resource.getById`, `resource.list` with pagination
  - [ ] Define `resource.delete`
  - [ ] Define `resource.linkToUnit`, `resource.unlinkFromUnit`
  - [ ] Register in `server/api/root.ts`
- [ ] Task 6: Create ResourceCard component (AC: #5)
  - [ ] Create `src/components/units/ResourceCard.tsx`
  - [ ] Image type: show thumbnail preview (max 200px width)
  - [ ] Code type: show syntax-highlighted snippet (first 5 lines)
  - [ ] Link type: show URL with favicon and page title (if available)
  - [ ] Audio type: show waveform placeholder with duration
  - [ ] Video type: show thumbnail frame placeholder
  - [ ] Table/Diagram type: show generic icon with file name
- [ ] Task 7: Write tests
  - [ ] Test Resource Unit CRUD operations
  - [ ] Test many-to-many linking between Units and Resources
  - [ ] Test file upload with valid and invalid MIME types
  - [ ] Test file size validation
  - [ ] Test ResourceCard renders correct preview per type
  - [ ] Test lifecycle restrictions on Resource Units

## Dev Notes

- Vercel Blob is the storage backend — it provides edge-cached URLs suitable for Next.js Image optimization
- The `metadata` JSON field structure varies by type: images have `{ width, height }`, audio has `{ duration, sampleRate }`, links have `{ title, description, favicon }`
- File upload should use tRPC's file upload capabilities or a separate Next.js API route for multipart form data
- The many-to-many join table enables FR4's requirement that "a single Resource Unit can be referenced by multiple Thought Units"
- Resource previews in UnitCard should be lightweight — use thumbnails and lazy loading
- Audio waveform is a placeholder visual — actual waveform rendering comes in Story 2.11

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Vercel Blob for file storage
- [Source: _bmad-output/planning-artifacts/architecture.md] — 3-layer architecture (Router → Service → Repository)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR4: Resource Units as first-class citizens
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR10: Card visual states (apply to resource cards too)
