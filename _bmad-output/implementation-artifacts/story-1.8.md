# Story 1.8: CI/CD Pipeline, Testing Infrastructure & Monitoring

Status: ready-for-dev

## Story

As a developer,
I want automated CI/CD, testing frameworks, and error monitoring configured,
So that code quality is enforced automatically and production issues are detected immediately.

## Acceptance Criteria

1. A `.github/workflows/ci.yml` runs lint + type check + unit tests on every PR
2. A `.github/workflows/e2e.yml` runs Playwright E2E tests on merge to main
3. Vitest is configured for unit tests with co-located `*.test.ts` files, integration tests in `__tests__/integration/`, and test helpers with DB setup/teardown and factories
4. Playwright is configured for E2E tests in `e2e/` directory
5. Sentry SDK is integrated for error tracking and performance monitoring
6. Vercel Analytics is configured for web vitals tracking
7. pino is configured for structured JSON server-side logging
8. Preview deployments on PR branches are enabled via Vercel
9. At least one example unit test, one integration test, and one E2E test pass successfully in CI

## Tasks / Subtasks

- [ ] Task 1: Configure Vitest (AC: #3)
  - [ ] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
  - [ ] Create `vitest.config.ts` with path aliases matching `tsconfig.json`
  - [ ] Set up co-located test pattern (`*.test.ts`, `*.test.tsx`)
  - [ ] Create `__tests__/integration/` directory structure
  - [ ] Create test helpers: DB setup/teardown utility, factory functions
  - [ ] Add `pnpm test` and `pnpm test:unit` scripts
- [ ] Task 2: Configure Playwright (AC: #4)
  - [ ] Install `@playwright/test`
  - [ ] Create `playwright.config.ts` with Next.js webServer configuration
  - [ ] Set up `e2e/` directory structure
  - [ ] Add `pnpm test:e2e` script
- [ ] Task 3: Create CI workflow (AC: #1)
  - [ ] Create `.github/workflows/ci.yml`
  - [ ] Configure pnpm setup with caching
  - [ ] Add lint step (`pnpm lint`)
  - [ ] Add type check step (`pnpm tsc --noEmit`)
  - [ ] Add unit test step (`pnpm test:unit`)
  - [ ] Trigger on pull request events
- [ ] Task 4: Create E2E workflow (AC: #2)
  - [ ] Create `.github/workflows/e2e.yml`
  - [ ] Configure Playwright browser installation with caching
  - [ ] Run E2E tests on merge to main
  - [ ] Upload test artifacts (screenshots, traces) on failure
- [ ] Task 5: Integrate Sentry (AC: #5)
  - [ ] Configure `@sentry/nextjs` with `sentry.client.config.ts` and `sentry.server.config.ts`
  - [ ] Set up source maps upload in build
  - [ ] Add `SENTRY_DSN` to `.env.example`
  - [ ] Verify error capture in development
- [ ] Task 6: Configure Vercel Analytics (AC: #6)
  - [ ] Install `@vercel/analytics`
  - [ ] Add `<Analytics />` component to root layout
  - [ ] Verify web vitals tracking
- [ ] Task 7: Configure pino logging (AC: #7)
  - [ ] Create `src/server/logger.ts` with pino configuration
  - [ ] Configure structured JSON output
  - [ ] Add log levels (debug, info, warn, error)
  - [ ] Use `pino-pretty` for development output
- [ ] Task 8: Configure Vercel preview deployments (AC: #8)
  - [ ] Verify Vercel project settings for PR preview deployments
  - [ ] Document preview database strategy (shared or isolated)
- [ ] Task 9: Write example tests (AC: #9)
  - [ ] Write one unit test (e.g., utility function or component render)
  - [ ] Write one integration test (e.g., tRPC router with test DB)
  - [ ] Write one E2E test (e.g., landing page loads successfully)
  - [ ] Verify all pass locally and in CI

## Dev Notes

- Vitest is preferred over Jest for T3/Next.js projects due to native ESM support and faster execution
- Integration tests need a test database — use a separate Supabase project or local PostgreSQL
- Playwright should test against the Next.js dev server or a production build
- Sentry source maps require the `SENTRY_AUTH_TOKEN` during build — document this in deployment notes
- pino logs should be JSON in production, pretty-printed in development

### Project Structure Notes

- `vitest.config.ts` — Vitest configuration
- `playwright.config.ts` — Playwright configuration
- `__tests__/integration/` — Integration tests
- `__tests__/helpers/` — Test utilities (DB setup, factories)
- `e2e/` — End-to-end tests
- `.github/workflows/ci.yml` — CI pipeline
- `.github/workflows/e2e.yml` — E2E pipeline
- `src/server/logger.ts` — pino logger instance
- `sentry.client.config.ts`, `sentry.server.config.ts` — Sentry configuration

### References

- [Source: _bmad-output/planning-artifacts/architecture.md] — CI/CD via GitHub Actions, Vitest, Playwright
- [Source: _bmad-output/planning-artifacts/architecture.md] — Sentry for error tracking, Vercel Analytics, pino logging
- [Source: _bmad-output/planning-artifacts/architecture.md] — Test organization: co-located, integration, E2E, helpers
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.8] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
