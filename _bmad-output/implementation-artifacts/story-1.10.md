# Story 1.10: Trigger.dev Background Job Infrastructure

**Status: pending**

## Description
As a developer,
I want Trigger.dev configured as the background job processor,
So that async AI operations (decomposition, embedding, relation inference, ThoughtRank, context snapshots, drift detection) run reliably without blocking the main request cycle.

## Acceptance Criteria

**Given** the project needs async background processing for AI-heavy operations
**When** Trigger.dev is configured
**Then** the `@trigger.dev/sdk` package is installed and configured with project credentials
**And** a `trigger.config.ts` file defines the Trigger.dev project configuration
**And** at least one example job is created (e.g., `generateEmbedding`) that processes a Unit's content and stores the vector in pgvector
**And** jobs can be triggered from tRPC service layer via `trigger.dev` client
**And** job status (pending, running, completed, failed) is queryable
**And** failed jobs are retried up to 3 times with exponential backoff
**And** job execution logs are visible in the Trigger.dev dashboard
**And** environment variables for Trigger.dev API keys are documented in `.env.example`

## Tasks
- [ ] Install `@trigger.dev/sdk` and `@trigger.dev/nextjs` packages
- [ ] Create `trigger.config.ts` at project root
- [ ] Create `src/server/jobs/` directory structure
- [ ] Implement `generateEmbedding.ts` job as reference implementation
- [ ] Create `src/server/jobs/client.ts` for triggering jobs from services
- [ ] Add Trigger.dev env vars to `.env.example`
- [ ] Test job execution locally with Trigger.dev dev server
- [ ] Document job creation pattern in dev notes

## Dev Notes
- Key files: `trigger.config.ts`, `src/server/jobs/client.ts`, `src/server/jobs/generateEmbedding.ts`
- Dependencies: Story 1.1 (project setup), Story 1.2 (pgvector for embeddings)
- Technical approach: Trigger.dev is the MVP background job processor per architecture spec. Jobs are used by Epic 5 (AI decomposition, type suggestion), Epic 6 (ThoughtRank computation), Epic 8 (drift detection, compression), and Epic 9 (gap detection). This story provides the infrastructure; individual jobs are created in their respective stories.
- Future: May migrate to BullMQ at scale per architecture decision.

## References
- Epic 1: Foundation & User Access (infrastructure prerequisite)
- Architecture: "Background job processor: Trigger.dev (MVP) → BullMQ (scale)"
- Required by: Story 5.1, 5.4, 5.7, 5.8, 5.12, 6.5, 8.2, 8.7, 9.4
