# Story 1.1: T3 Stack Project Initialization & Configuration

Status: review

## Story

As a developer,
I want a fully initialized T3 Stack project with all required tooling configured,
So that all subsequent development builds on a consistent, type-safe foundation.

## Acceptance Criteria

1. Project is initialized using `pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql`
2. Project compiles with zero errors using TypeScript 5.x strict mode
3. Turbopack dev server starts successfully with `pnpm dev`
4. ESLint and Prettier are configured and pass on all generated files
5. The following additional packages are installed: shadcn/ui, Zustand 5.x, D3.js, dnd-kit, Tiptap 3.x, TanStack Virtual, date-fns, Auth.js v5, Trigger.dev SDK, Sentry SDK, pino, cmdk
6. pnpm is enforced as the package manager (preinstall script rejects npm/yarn)
7. A basic `src/app/page.tsx` renders a placeholder landing page

## Tasks / Subtasks

- [x] Task 1: Initialize T3 Stack project (AC: #1)
  - [x] Run `pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql`
  - [x] Verify generated project structure matches T3 conventions
- [x] Task 2: Verify TypeScript strict mode (AC: #2)
  - [x] Confirm `tsconfig.json` has `strict: true`
  - [x] Run `pnpm tsc --noEmit` with zero errors
- [x] Task 3: Verify Turbopack dev server (AC: #3)
  - [x] Run `pnpm dev` and confirm Turbopack starts without errors
- [x] Task 4: Configure ESLint and Prettier (AC: #4)
  - [x] Ensure ESLint config extends T3 defaults
  - [x] Add Prettier config (`.prettierrc`)
  - [x] Run `pnpm lint` and `pnpm format:check` with zero issues
- [x] Task 5: Install additional packages (AC: #5)
  - [x] Install shadcn/ui and initialize with `pnpm dlx shadcn@latest init`
  - [x] Install Zustand 5.x (`zustand`)
  - [x] Install D3.js (`d3`, `@types/d3`)
  - [x] Install dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
  - [x] Install Tiptap 3.x (`@tiptap/react`, `@tiptap/starter-kit`)
  - [x] Install TanStack Virtual (`@tanstack/react-virtual`)
  - [x] Install date-fns (`date-fns`)
  - [x] Install Auth.js v5 (`next-auth@beta`)
  - [x] Install Trigger.dev SDK (`@trigger.dev/sdk`)
  - [x] Install Sentry SDK (`@sentry/nextjs`)
  - [x] Install pino (`pino`, `pino-pretty`)
  - [x] Install cmdk (`cmdk`)
- [x] Task 6: Enforce pnpm as package manager (AC: #6)
  - [x] Add `preinstall` script in `package.json` to reject npm/yarn
  - [x] Add `engines` field specifying pnpm
  - [x] Add `.npmrc` with `engine-strict=true`
- [x] Task 7: Create placeholder landing page (AC: #7)
  - [x] Update `src/app/page.tsx` with Flowmind branding placeholder
  - [x] Verify page renders correctly in browser

## Dev Notes

- The T3 Stack (`create-t3-app`) generates a Next.js App Router project with tRPC, Prisma, and Tailwind pre-configured
- TypeScript strict mode is the T3 default — verify it hasn't been relaxed
- Turbopack is the Next.js bundler for dev mode — ensure `next dev --turbopack` is the dev script
- camelCase in TypeScript/API, snake_case in database (Prisma handles mapping)
- pnpm is mandatory — npm and yarn must be rejected at install time

### Project Structure Notes

- Follow T3 conventions: `src/app/` for pages, `src/server/` for backend, `src/trpc/` for tRPC config
- Additional directories to create: `src/components/`, `src/lib/`, `src/stores/`
- All packages listed in AC #5 are enumerated in the architecture doc's "Additional packages beyond T3 starter" section

### References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Starter Template section specifying exact `create-t3-app` command
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md] — "Additional packages beyond T3 starter" list
- [Source: _bmad-output/planning-artifacts/architecture.md] — camelCase/snake_case naming convention

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
