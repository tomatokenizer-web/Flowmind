# Story 1.2: Supabase Database Provisioning with pgvector

Status: ready-for-dev

## Story

As a developer,
I want PostgreSQL 16 with pgvector provisioned via Supabase and connected through Prisma,
So that the application has a production-ready database with vector search capability from day one.

## Acceptance Criteria

1. A Supabase project is provisioned with PostgreSQL 16
2. Prisma schema is configured with the Supabase connection string and `prisma migrate dev` runs successfully
3. The pgvector extension is enabled (`CREATE EXTENSION IF NOT EXISTS vector`)
4. PgBouncer connection pooling is configured for the connection URL
5. A `prisma/seed.ts` file exists with seed data for the 23 system relation types (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions, inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes, contains, presupposes, defined_by, grounded_in, instantiates, and 3 structural) and 4 domain template defaults (software-design, nonfiction-writing, investment-decision, academic-research)
6. `prisma db seed` runs successfully
7. Environment variables for database URLs are documented in `.env.example`
8. Prisma Client generates with camelCase TypeScript fields mapped to snake_case database columns

## Tasks / Subtasks

- [ ] Task 1: Provision Supabase project (AC: #1)
  - [ ] Create Supabase project with PostgreSQL 16
  - [ ] Note connection strings (direct + pooled)
- [ ] Task 2: Configure Prisma with Supabase (AC: #2, #4)
  - [ ] Set `DATABASE_URL` to PgBouncer pooled connection string
  - [ ] Set `DIRECT_URL` to direct connection string for migrations
  - [ ] Configure `prisma/schema.prisma` datasource with both URLs
  - [ ] Run `prisma migrate dev` to verify connection
- [ ] Task 3: Enable pgvector extension (AC: #3)
  - [ ] Create initial migration enabling pgvector: `CREATE EXTENSION IF NOT EXISTS vector`
  - [ ] Verify vector column type is available in Prisma schema
- [ ] Task 4: Create seed file (AC: #5, #6)
  - [ ] Create `prisma/seed.ts` with all 23 system relation types
  - [ ] Add 4 domain template defaults to seed data
  - [ ] Configure `package.json` prisma seed command
  - [ ] Run `prisma db seed` and verify data
- [ ] Task 5: Document environment variables (AC: #7)
  - [ ] Create/update `.env.example` with `DATABASE_URL`, `DIRECT_URL` placeholders
  - [ ] Add comments explaining pooled vs direct connection usage
- [ ] Task 6: Configure Prisma field mapping (AC: #8)
  - [ ] Use `@map` and `@@map` in Prisma schema for snake_case DB columns
  - [ ] Verify generated Prisma Client uses camelCase in TypeScript

## Dev Notes

- Supabase provides managed PostgreSQL with pgvector pre-installed — just need to enable the extension
- Two connection strings needed: pooled (via PgBouncer, for application queries) and direct (for migrations)
- The 23 system relation types are organized in three groups: Argument-centered (8), Creative/research/execution (7), Structure/containment (5), plus 3 additional structural types
- Domain templates define domain-specific unit types, relation types, scaffold units, and gap detection rules

### Project Structure Notes

- `prisma/schema.prisma` — main schema file
- `prisma/seed.ts` — seed script
- `prisma/migrations/` — migration files (auto-generated)
- `.env` / `.env.example` — environment configuration

### References

- [Source: _bmad-output/planning-artifacts/architecture.md] — PostgreSQL 16 + pgvector via Supabase requirement
- [Source: _bmad-output/planning-artifacts/architecture.md] — Prisma Migrate for migrations
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — Story definition and acceptance criteria
- [Source: docs/flowmind-prd.md#FR11] — 23 system relation types listing
- [Source: docs/flowmind-prd.md#FR66-FR67] — Domain template specification

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
