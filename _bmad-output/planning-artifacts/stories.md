# Flowmind User Stories — Epic 1: Foundation & User Access

## Epic 1: Foundation & User Access

Users can register, log in via Google or GitHub OAuth, and access the Flowmind application with a polished, responsive app shell. This epic delivers the complete technical foundation — T3 Stack initialization, Supabase/pgvector database provisioning, Auth.js authentication, design system tokens, base UI component library (Radix wrappers), responsive app shell layout, CI/CD pipeline, testing infrastructure, and monitoring — so that all subsequent epics build on a solid, production-ready platform.

---

### Story 1.1: T3 Stack Project Initialization

As a developer,
I want a fully initialized T3 Stack project with TypeScript strict mode, Next.js App Router, tRPC, Prisma, Tailwind CSS, and Turbopack,
So that all subsequent development builds on a consistent, production-ready foundation.

**Acceptance Criteria:**

**Given** a fresh repository with no application code
**When** the project is initialized via `pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql`
**Then** the project structure contains `src/app/`, `src/server/`, `prisma/schema.prisma`, `tailwind.config.ts`, and `package.json` with pnpm lockfile
**And** TypeScript strict mode is enabled in `tsconfig.json` (`"strict": true`)
**And** `pnpm dev` starts the development server with Turbopack without errors

**Given** the initialized project
**When** environment validation is checked
**Then** `@t3-oss/env-nextjs` is configured in `src/env.js` with `DATABASE_URL` as a required server variable
**And** `.env.example` documents all required environment variables

**Given** the initialized project
**When** the project structure is reviewed
**Then** the following directories exist: `src/app/`, `src/server/api/routers/`, `src/server/api/trpc.ts`, `src/server/api/root.ts`, `src/server/db.ts`, `prisma/`
**And** ESLint configuration includes Next.js and TypeScript rules
**And** path aliases (`@/` mapping to `src/`) are configured in `tsconfig.json`

**Given** the initialized project
**When** additional foundational packages are installed
**Then** `pnpm add zustand date-fns pino` and `pnpm add -D vitest @testing-library/react playwright` complete without dependency conflicts
**And** the feature module directory structure is created: `src/features/`, `src/components/`, `src/lib/`, `src/types/`, `src/hooks/`, `src/stores/`

---

### Story 1.2: Supabase PostgreSQL + pgvector Database Provisioning

As a developer,
I want a Supabase-managed PostgreSQL 16 database with the pgvector extension enabled and Prisma configured to connect to it,
So that the application has a production-ready database with vector search capability from the start (NFR5).

**Acceptance Criteria:**

**Given** a Supabase project has been created
**When** the pgvector extension is enabled via `CREATE EXTENSION IF NOT EXISTS vector`
**Then** the extension is confirmed active via `SELECT * FROM pg_extension WHERE extname = 'vector'`

**Given** the Supabase connection string is available
**When** `DATABASE_URL` is set in `.env` using the PgBouncer pooled connection string (port 6543)
**And** `DIRECT_URL` is set using the direct connection string (port 5432)
**Then** `prisma/schema.prisma` is configured with `provider = "postgresql"` and both `url` and `directUrl` datasource properties
**And** `pnpm prisma db push` succeeds without errors

**Given** the Prisma schema has a minimal `User` model with `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`
**When** `pnpm prisma generate` is run
**Then** the Prisma client is generated with TypeScript types matching the schema
**And** `pnpm prisma studio` can connect and display the empty tables

**Given** the database is provisioned
**When** a raw SQL query `SELECT '[1,2,3]'::vector` is executed via Prisma `$queryRaw`
**Then** the query succeeds, confirming pgvector is operational

**Given** the database configuration
**When** the `prisma/seed.ts` file is created with a placeholder seed function
**Then** `"prisma": { "seed": "tsx prisma/seed.ts" }` is configured in `package.json`
**And** `pnpm prisma db seed` executes without error

---

### Story 1.3: Auth.js v5 Authentication with Google and GitHub OAuth

As a user,
I want to sign in using my Google or GitHub account,
So that I can securely access my Flowmind workspace without creating a new password.

**Acceptance Criteria:**

**Given** the application is running and the user is not authenticated
**When** the user navigates to any protected route
**Then** the user is redirected to the sign-in page at `/auth/signin`
**And** the page displays "Sign in with Google" and "Sign in with GitHub" buttons

**Given** the user is on the sign-in page
**When** the user clicks "Sign in with Google"
**Then** the user is redirected to Google's OAuth consent screen
**And** upon granting consent, the user is redirected back to the application
**And** a `users` record is created in the database with `name`, `email`, and `image` from the Google profile
**And** Auth.js session and account records are created in the corresponding Prisma tables

**Given** the user is on the sign-in page
**When** the user clicks "Sign in with GitHub"
**Then** the OAuth flow completes identically to Google, creating user and session records

**Given** the user has previously signed in
**When** the user returns and their session is still valid
**Then** the user is automatically authenticated without re-entering credentials

**Given** the user is authenticated
**When** the user clicks "Sign out"
**Then** the session is destroyed, the user is redirected to the sign-in page
**And** accessing protected routes redirects to sign-in

**Given** the Auth.js configuration
**When** the Prisma schema is reviewed
**Then** it includes the `Account`, `Session`, `User`, and `VerificationToken` models required by `@auth/prisma-adapter`
**And** all tRPC procedures in `src/server/api/trpc.ts` use a `protectedProcedure` that checks `ctx.session`

**Given** an unauthenticated request to any tRPC procedure
**When** the procedure uses `protectedProcedure`
**Then** a `TRPCError` with code `UNAUTHORIZED` is returned

---

### Story 1.4: Design System Tokens

As a developer,
I want a comprehensive design token system defining colors, typography, spacing, elevation, animation, and breakpoints,
So that all UI components share a consistent visual language aligned with the Flowmind UX specification (UX-DR1 through UX-DR9).

**Acceptance Criteria:**

**Given** the `tailwind.config.ts` file
**When** base color tokens are defined (UX-DR1)
**Then** CSS custom properties are available: `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border-default`, `--border-focus`, `--accent-primary`
**And** each maps to the hex values specified in the UX design specification

**Given** the design token system
**When** unit-type color tokens are defined (UX-DR2)
**Then** all 9 unit types (Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action) have `background-tint` and `dark-accent` color pairs
**And** tokens are accessible via Tailwind classes like `bg-unit-claim-tint`, `border-unit-claim-accent`

**Given** the design token system
**When** lifecycle state visual tokens are defined (UX-DR3)
**Then** Draft state has dashed border and 80% opacity
**And** Pending state has yellow left border and yellow tint
**And** Confirmed state has solid border and full opacity
**And** tokens are composable as Tailwind utility classes

**Given** the design token system
**When** semantic color tokens are defined (UX-DR4)
**Then** `--success: #34C759`, `--warning: #FF9500`, `--error: #FF3B30`, `--info: #5AC8FA` are available

**Given** the design token system
**When** typography tokens are defined (UX-DR5)
**Then** three font stacks are configured: primary (sans-serif), heading (serif or display), mono (monospace)
**And** a 7-step type scale is defined (11px, 12px, 14px, 16px, 20px, 28px, 39px) with corresponding weights, line heights, and letter-spacing

**Given** the design token system
**When** spacing scale tokens are defined (UX-DR6)
**Then** a 4px base unit produces 10 steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
**And** these are available as Tailwind spacing utilities

**Given** the design token system
**When** elevation tokens are defined (UX-DR7)
**Then** 4 levels exist: `flat` (no shadow), `resting` (subtle shadow), `elevated` (medium shadow), `high` (prominent shadow)
**And** card `border-radius` is set to 12px globally
**And** hover and selected state shadow transitions are defined

**Given** the design token system
**When** animation duration tokens are defined (UX-DR8)
**Then** `--duration-view: 300ms`, `--duration-sidebar: 250ms`, `--duration-focus: 150ms`, `--duration-drag: 200ms` are set
**And** a `prefers-reduced-motion` media query override sets all durations to 0ms

**Given** the design token system
**When** responsive breakpoints are defined (UX-DR9)
**Then** Tailwind config includes: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`

---

### Story 1.5: Base UI Component Library (Radix Primitive Wrappers)

As a developer,
I want Radix UI primitives wrapped with Flowmind's design tokens and styling,
So that all feature components use consistent, accessible building blocks (UX-DR18 through UX-DR26).

**Acceptance Criteria:**

**Given** the `src/components/ui/` directory
**When** the Dialog component is built wrapping `@radix-ui/react-dialog` (UX-DR18)
**Then** it applies Level 3 elevation shadow, 12px border-radius, 300ms entrance animation
**And** focus is trapped within the dialog when open
**And** a `destructive` variant exists with red-tinted confirmation styling
**And** pressing Escape closes the dialog and returns focus to the trigger element

**Given** the component library
**When** DropdownMenu wraps `@radix-ui/react-dropdown-menu` (UX-DR19)
**Then** menu items support type-colored indicator dots, keyboard shortcut hint text, and separator lines
**And** Level 2 elevation shadow is applied to the menu panel
**And** keyboard navigation (arrow keys, Enter, Escape) works correctly

**Given** the component library
**When** Tooltip wraps `@radix-ui/react-tooltip` (UX-DR20)
**Then** tooltips appear after 300ms delay with Level 2 shadow and `--text-sm` font size
**And** tooltips are dismissed on Escape and on pointer leave

**Given** the component library
**When** Popover wraps `@radix-ui/react-popover` (UX-DR21)
**Then** it applies Level 2 shadow and 12px border-radius
**And** popover content is focusable and closes on Escape

**Given** the component library
**When** Tabs wraps `@radix-ui/react-tabs` (UX-DR22)
**Then** the active tab has a 2px `accent-primary` underline indicator
**And** panel transitions use a 300ms cross-fade animation
**And** tabs are keyboard navigable with arrow keys

**Given** the component library
**When** ScrollArea wraps `@radix-ui/react-scroll-area` (UX-DR23)
**Then** the scrollbar is 4px wide and only visible on hover or during active scroll

**Given** the component library
**When** ContextMenu wraps `@radix-ui/react-context-menu` (UX-DR24)
**Then** it shares the same visual styling as DropdownMenu (consistent menu appearance)

**Given** the component library
**When** the Command Palette is built using `cmdk` (UX-DR25)
**Then** it is triggered globally via Cmd+K (or Ctrl+K on Windows)
**And** it supports fuzzy search across actions, units, contexts, and projects
**And** it displays recent actions by default when opened
**And** keyboard navigation (arrow keys, Enter, Escape) works correctly
**And** Level 3 elevation shadow is applied

**Given** the component library
**When** Toggle wraps `@radix-ui/react-toggle` (UX-DR26)
**Then** active state uses `accent-primary` fill and inactive uses `bg-surface`

**Given** any wrapped component
**When** rendered in a test
**Then** the component has appropriate ARIA attributes provided by Radix primitives
**And** all interactive elements are keyboard accessible

---

### Story 1.6: Responsive App Shell Layout

As a user,
I want a responsive application layout with a title bar, collapsible sidebar, toolbar, main content area, and slide-in detail panel,
So that I can navigate Flowmind comfortably across desktop and tablet screen sizes (UX-DR27, UX-DR47 through UX-DR50).

**Acceptance Criteria:**

**Given** a viewport width of 1280px or greater (UX-DR47)
**When** the app shell renders
**Then** the layout displays: title bar (40px height), sidebar (260px width, collapsible), toolbar (48px with breadcrumb placeholder and view switcher placeholder), main content (fluid 600-1200px), and detail panel (360px slide-in, non-pushing)
**And** the three-column layout does not cause horizontal scrolling

**Given** a viewport width between 1024px and 1279px (UX-DR48)
**When** the app shell renders
**Then** the sidebar is collapsed by default (60px icon-only mode)
**And** the detail panel overlays the content area instead of pushing it

**Given** a viewport width between 768px and 1023px (UX-DR49)
**When** the app shell renders
**Then** the sidebar is hidden by default with a hamburger menu button to toggle it
**And** the detail panel opens as a full-screen overlay
**And** all interactive elements have a minimum 48px touch target

**Given** the browser text zoom is set to 200% (UX-DR50)
**When** any layout mode is rendered
**Then** all content remains usable with no horizontal scrolling
**And** no text is clipped or overlapped

**Given** the sidebar is expanded (260px)
**When** the user clicks the collapse toggle
**Then** the sidebar animates to collapsed state (60px) over 250ms
**And** the main content area expands to fill the freed space

**Given** the sidebar is collapsed or hidden
**When** the user clicks the expand toggle or hamburger button
**Then** the sidebar animates open over 250ms

**Given** the detail panel is closed
**When** the detail panel is triggered to open
**Then** it slides in from the right over 300ms
**And** pressing Escape closes it

**Given** the app shell layout component
**When** it is rendered
**Then** it uses semantic HTML: `<nav>` for sidebar, `<main>` for content area, `<aside>` for detail panel
**And** a skip-to-content link is the first focusable element in the DOM

---

### Story 1.7: Core Interaction Patterns

As a user,
I want consistent toast notifications, skeleton loading states, empty states, form validation feedback, and smooth view transitions,
So that the application feels polished and responsive during all interactions (UX-DR35 through UX-DR38, UX-DR42).

**Acceptance Criteria:**

**Given** an action that requires user notification (UX-DR35)
**When** a toast is triggered
**Then** it appears at bottom-center with a 300ms slide-up animation
**And** it auto-dismisses after 4 seconds
**And** it supports 4 types: success, error, info, warning (with corresponding semantic colors)
**And** destructive or undoable actions include an "Undo" action link in the toast
**And** multiple toasts queue vertically rather than overlapping

**Given** content is loading (UX-DR36)
**When** a skeleton loading state is displayed
**Then** it uses a CSS pulse animation matching the expected content layout shape
**And** no spinner elements are used anywhere in the application
**And** AI-specific processing shows a dot animation with a cancel button

**Given** a content area has no items (UX-DR37)
**When** an empty state is displayed
**Then** it shows a centered illustration, headline text explaining the empty state, and a primary CTA button to create the first item
**And** the messaging is contextual to the specific area (e.g., "No thoughts captured yet" vs. "No contexts created")

**Given** a form field with validation (UX-DR38)
**When** the user blurs a field with invalid input
**Then** an inline error message appears below the field with `--error` color
**When** the user corrects the input
**Then** a success checkmark appears
**When** the user focuses an empty required field
**Then** helper text appears below the field
**And** the focused field has an `accent-primary` border indicator

**Given** the user switches between views (UX-DR42)
**When** a view transition occurs
**Then** a 300ms cross-fade animation plays between the old and new view content
**And** the sidebar transition takes 250ms
**And** the detail panel transition takes 300ms
**And** card hover effects take 150ms

**Given** the user has `prefers-reduced-motion: reduce` enabled
**When** any animation would play
**Then** the animation duration is 0ms (instant transition) per UX-DR8

---

### Story 1.8: Accessibility Foundations

As a user who relies on assistive technology,
I want the application to meet WCAG 2.1 AA standards with proper contrast, focus indicators, focus management, ARIA landmarks, and semantic HTML,
So that I can use Flowmind effectively regardless of ability (UX-DR51 through UX-DR54).

**Acceptance Criteria:**

**Given** the application's color system (UX-DR51)
**When** body text is rendered on any background
**Then** the contrast ratio meets or exceeds 4.5:1 (WCAG AA)
**When** large text (18px+) or interactive elements are rendered
**Then** the contrast ratio meets or exceeds 3:1
**And** a high-contrast mode toggle is available in user settings that increases all contrast ratios

**Given** any interactive element in the application (UX-DR52)
**When** the element receives keyboard focus
**Then** a 2px solid `accent-primary` outline with 2px offset is visible around the element
**And** the focus indicator is never hidden or suppressed on keyboard navigation
**And** focus indicators may be hidden for mouse interactions using `:focus-visible`

**Given** a modal dialog or overlay is opened (UX-DR53)
**When** focus management is evaluated
**Then** focus is trapped within the overlay (Tab/Shift+Tab cycle within)
**And** when the overlay closes, focus returns to the element that triggered it
**And** Escape key closes the overlay

**Given** the application's HTML structure (UX-DR54)
**When** the page is analyzed by a screen reader
**Then** ARIA landmarks are present: `navigation` (sidebar), `main` (content area), `complementary` (detail panel)
**And** semantic HTML elements are used: `<nav>`, `<main>`, `<aside>`, `<article>` (for unit cards), `<section>` (for content groups)
**And** a "Skip to main content" link is the first focusable element and jumps focus to the `<main>` region

**Given** a dynamic content update (e.g., toast notification)
**When** the update occurs
**Then** appropriate `aria-live` regions announce the change to screen readers
**And** toast notifications use `aria-live="assertive"` for errors and `aria-live="polite"` for info/success

**Given** any page in the application
**When** an accessibility audit is run (axe-core or Lighthouse)
**Then** no critical or serious WCAG 2.1 AA violations are reported

---

### Story 1.9: CI/CD Pipeline and Testing Infrastructure

As a developer,
I want GitHub Actions CI/CD pipelines, Vitest unit test configuration, Playwright E2E configuration, Sentry error tracking, and pino structured logging,
So that code quality is enforced automatically and production errors are tracked.

**Acceptance Criteria:**

**Given** the GitHub repository
**When** a pull request is opened or updated
**Then** `.github/workflows/ci.yml` runs: ESLint linting, TypeScript type checking (`tsc --noEmit`), and Vitest unit tests
**And** the workflow fails if any step fails, blocking merge

**Given** the GitHub repository
**When** code is merged to the `main` branch
**Then** `.github/workflows/e2e.yml` runs Playwright end-to-end tests
**And** the workflow reports test results as a GitHub check

**Given** the Vitest configuration
**When** `pnpm test` is run
**Then** Vitest discovers and runs `*.test.ts` and `*.test.tsx` files co-located with source code
**And** path aliases (`@/`) resolve correctly in test files
**And** React component tests use `@testing-library/react` with jsdom environment
**And** a basic smoke test exists and passes (e.g., testing the env validation or a utility function)

**Given** the Playwright configuration
**When** `pnpm test:e2e` is run
**Then** Playwright discovers and runs tests in the `e2e/` directory
**And** a basic smoke test exists that loads the sign-in page and verifies it renders
**And** the configuration targets Chromium, Firefox, and WebKit browsers

**Given** the test infrastructure
**When** the project's test helper directory is reviewed
**Then** `__tests__/helpers/` contains a database setup/teardown utility for integration tests
**And** a factory pattern file exists for creating test fixtures (e.g., `createTestUser()`)

**Given** the Sentry SDK is configured
**When** an unhandled error occurs in production
**Then** the error is reported to Sentry with stack trace, user context, and request metadata
**And** the Sentry DSN is configured via environment variable `SENTRY_DSN`
**And** source maps are uploaded during the build step

**Given** the pino logger is configured
**When** server-side code logs a message via `logger.info()`, `logger.error()`, etc.
**Then** the output is structured JSON with `timestamp`, `level`, `message`, and optional `context` fields
**And** the logger is configured at `src/server/logger.ts` and importable across all server modules

**Given** the CI pipeline and development scripts
**When** `package.json` scripts are reviewed
**Then** the following scripts exist: `dev`, `build`, `start`, `lint`, `test`, `test:e2e`, `db:push`, `db:seed`, `db:studio`
# Flowmind User Stories — Epic 2: Thought Capture & Unit Management

## Epic 2: Thought Capture & Unit Management

Users can capture thoughts freely in Capture Mode, view them as typed Unit cards with full metadata, manage their lifecycle (Draft -> Pending -> Confirmed), version their thinking, and work with Resource Units for non-text content. This is the core "first experience" — the user types a thought, and Flowmind preserves it as a first-class cognitive unit.

---

### Story 2.1: Thought Unit Data Model and CRUD API

As a developer,
I want the Thought Unit database schema and tRPC CRUD router,
So that Units can be created, read, updated, and deleted with full metadata support (FR1, FR73).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the `units` table is defined
**Then** it includes: `id` (UUID, PK), `content` (TEXT, NOT NULL), `createdAt` (TIMESTAMPTZ), `modifiedAt` (TIMESTAMPTZ), `lastAccessed` (TIMESTAMPTZ), `originType` (VARCHAR — direct_write, external_excerpt, external_inspiration, external_summary, ai_generated, ai_refined), `lifecycle` (VARCHAR — draft, pending, confirmed, archived), `quality` (VARCHAR — raw, refined, verified, published), `sourceUrl` (TEXT, nullable), `sourceTitle` (TEXT, nullable), `isQuote` (BOOLEAN, default false), `aiTrustLevel` (VARCHAR, nullable), `embedding` (vector(1536), nullable), `projectId` (UUID, FK to projects), `userId` (UUID, FK to users), `meta` (JSONB, nullable)
**And** indexes exist on `projectId`, `userId`, `lifecycle`, `createdAt`
**And** `pnpm prisma migrate dev` succeeds

**Given** the `projects` table is also created (minimal: `id`, `name`, `userId`, `createdAt`)
**When** migrations run
**Then** both `units` and `projects` tables exist with proper foreign keys

**Given** the tRPC `unitRouter`
**When** `createUnit` is called with valid `content` and `projectId`
**Then** a new Unit is created with `lifecycle: "confirmed"` (user-written default), `originType: "direct_write"`, `quality: "raw"`, current timestamps, and the authenticated user's ID
**And** the created Unit is returned with all fields

**Given** the tRPC `unitRouter`
**When** `getUnit` is called with a valid `unitId`
**Then** the full Unit record is returned
**And** `lastAccessed` is updated to the current timestamp

**Given** the tRPC `unitRouter`
**When** `updateUnit` is called with a `unitId` and partial fields (e.g., `content`, `quality`)
**Then** only the specified fields are updated, `modifiedAt` is set to current timestamp
**And** the updated Unit is returned

**Given** the tRPC `unitRouter`
**When** `deleteUnit` is called with a valid `unitId`
**Then** the Unit is soft-deleted (set to `lifecycle: "archived"`) rather than hard-deleted
**And** the archived Unit no longer appears in default list queries

**Given** the tRPC `unitRouter`
**When** `listUnits` is called with `projectId` and optional filters (`lifecycle`, `originType`, cursor pagination)
**Then** a paginated response is returned: `{ items: Unit[], nextCursor: string | null, totalCount: number }`
**And** archived Units are excluded by default unless `includeArchived: true` is passed

**Given** an unauthenticated request
**When** any unit procedure is called
**Then** a `TRPCError` with code `UNAUTHORIZED` is returned

**Given** a user attempts to access another user's Unit
**When** the `userId` on the Unit does not match `ctx.session.user.id`
**Then** a `TRPCError` with code `FORBIDDEN` is returned

---

### Story 2.2: Unit Type System with 9 Base Types

As a user,
I want each Thought Unit to carry a logical type from 9 base types (Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action),
So that my thoughts are categorized by their cognitive role (FR2).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** a `unitType` field is considered
**Then** since type varies per context (Perspective Layer, FR3/Epic 3), the Unit table itself stores a `defaultType` (VARCHAR, nullable) representing the type outside any context
**And** the 9 valid base types are enforced via Zod schema validation: `claim`, `question`, `evidence`, `counterargument`, `observation`, `idea`, `definition`, `assumption`, `action`

**Given** the `createUnit` mutation
**When** a `defaultType` is provided
**Then** it is validated against the 9 allowed types and stored on the Unit
**When** no `defaultType` is provided
**Then** it defaults to `null` (untyped), indicating type has not been assigned yet

**Given** the `updateUnit` mutation
**When** `defaultType` is changed to a new valid type
**Then** the type is updated and `modifiedAt` is refreshed

**Given** the `updateUnit` mutation
**When** an invalid type string is provided (e.g., `"foo"`)
**Then** a Zod validation error is returned with a descriptive message listing valid types

**Given** the `listUnits` query
**When** a `type` filter parameter is provided
**Then** only Units matching that `defaultType` are returned

**Given** the unit type system
**When** the type constants are defined
**Then** they are exported from `src/features/units/constants.ts` as `UNIT_TYPES` with display labels, descriptions, and color token references for each type
**And** a TypeScript union type `UnitType` is exported from `src/features/units/types.ts`

---

### Story 2.3: UnitCard Component with 3 Variants and 6 States

As a user,
I want to see my thoughts displayed as visually rich cards with type-colored borders, metadata, and clear lifecycle states,
So that I can quickly scan and identify my Units (UX-DR10).

**Acceptance Criteria:**

**Given** the UnitCard component
**When** rendered in **Compact** variant
**Then** it displays: type-colored left border (4px), first line of content (truncated), type badge, and creation date
**And** the card height is minimal (single row)

**Given** the UnitCard component
**When** rendered in **Standard** variant
**Then** it displays: type-colored left border, full content (up to 3 lines with ellipsis), type badge, lifecycle badge, creation date, and a metadata row (origin icon, relation count)

**Given** the UnitCard component
**When** rendered in **Expanded** variant
**Then** it displays: all Standard content plus full content without truncation, tags, provenance info, and action buttons (edit, delete, change type)

**Given** the UnitCard component in **Default** state
**When** no interaction is occurring
**Then** the card has `resting` elevation shadow and `bg-surface` background

**Given** the UnitCard component in **Hover** state
**When** the user hovers over the card
**Then** the card transitions to `elevated` shadow over 150ms and shows a subtle `bg-hover` background

**Given** the UnitCard component in **Selected** state
**When** the card is selected
**Then** it has a 2px `accent-primary` border and `elevated` shadow

**Given** the UnitCard component in **Draft** lifecycle state (UX-DR3)
**When** the Unit has `lifecycle: "draft"`
**Then** the card has a dashed border, 80% opacity, and a "Draft" lifecycle badge (dashed gray — UX-DR17)

**Given** the UnitCard component in **Pending** lifecycle state
**When** the Unit has `lifecycle: "pending"`
**Then** the card has a yellow left border accent, subtle yellow tint, and a "Pending" lifecycle badge (yellow — UX-DR17)

**Given** the UnitCard component in **Confirmed** lifecycle state
**When** the Unit has `lifecycle: "confirmed"`
**Then** the card has a solid border, full opacity, and a subtle checkmark lifecycle badge

**Given** the UnitCard component
**When** rendered
**Then** it has `role="article"` and an `aria-label` with sr-only text describing the unit type and lifecycle
**And** interactive elements within the card are keyboard focusable

---

### Story 2.4: Unit Detail Panel with Inline Editing and Tabbed Layout

As a user,
I want to view and edit a Unit's full details in a slide-in panel with organized tabs,
So that I can manage all aspects of a thought without leaving my current view (UX-DR32).

**Acceptance Criteria:**

**Given** the Unit Detail Panel component
**When** a Unit is selected for detail view
**Then** a 360px panel slides in from the right over 300ms
**And** the panel displays the Unit's content as the primary element

**Given** the Detail Panel is open
**When** the user clicks on the content area
**Then** it becomes an inline editable text field (using Tiptap or textarea)
**And** changes are saved on blur or Cmd+Enter
**And** a cancel action (Escape) reverts unsaved changes

**Given** the Detail Panel
**When** the tabbed layout is rendered
**Then** four tabs are available: Content, Relations, Metadata, AI
**And** the Content tab is active by default
**And** tab switching uses a 300ms cross-fade animation (UX-DR22)

**Given** the Content tab
**When** displayed
**Then** it shows: editable content, type selector dropdown (9 types), lifecycle controls (buttons to advance Draft->Pending->Confirmed)

**Given** the Relations tab
**When** displayed
**Then** it shows a placeholder list reading "Relations will be available in Epic 4"
**And** the tab structure is ready to receive relation data

**Given** the Metadata tab
**When** displayed
**Then** it shows: origin type, quality, creation date, modification date, source URL (if present), quote flag, tags (from meta JSONB)

**Given** the AI tab
**When** displayed
**Then** it shows a placeholder reading "AI suggestions will be available in Epic 5"

**Given** the Detail Panel is open
**When** the user presses Escape or clicks outside the panel
**Then** the panel slides closed over 300ms
**And** focus returns to the previously focused element

**Given** the type selector in the Detail Panel
**When** the user selects a new type
**Then** the Unit's `defaultType` is updated via `updateUnit` mutation
**And** a success toast confirms the change
**And** the UnitCard in the main view reflects the new type color immediately (optimistic update)

---

### Story 2.5: Capture Mode — Distraction-Free Thought Input

As a user,
I want a distraction-free input mode where all UI chrome disappears and I can just type my thought,
So that I can capture ideas with zero friction when inspiration strikes (FR24, UX-DR59).

**Acceptance Criteria:**

**Given** the user is anywhere in the application
**When** the user presses Cmd+N (Mac) or Ctrl+N (Windows)
**Then** Capture Mode activates: sidebar, toolbar, title bar, and detail panel are hidden
**And** only a centered text input area remains with placeholder text "What are you thinking about?"
**And** the input area receives focus immediately

**Given** Capture Mode is active
**When** the user types text and presses Enter (or Cmd+Enter for multi-line)
**Then** a new Unit is created with `originType: "direct_write"`, `lifecycle: "confirmed"`, `quality: "raw"`
**And** the Unit is assigned to the user's currently active project
**And** a subtle success toast appears confirming creation
**And** the input area clears for the next thought

**Given** Capture Mode is active
**When** the user presses Escape
**Then** Capture Mode deactivates and the full application chrome is restored
**And** the view returns to exactly the state before Capture Mode was entered

**Given** Capture Mode is active and the user has typed text but not submitted
**When** the user presses Escape
**Then** a confirmation prompt appears: "Discard unsaved thought?"
**And** "Discard" exits Capture Mode, "Keep editing" returns to the input

**Given** Capture Mode is active
**When** the user submits multiple thoughts in sequence
**Then** each thought is saved as a separate Unit
**And** a counter in the bottom corner shows "N thoughts captured this session"

**Given** Capture Mode
**When** evaluated for accessibility
**Then** the input area has `aria-label="Capture a new thought"`
**And** screen readers announce "Capture Mode activated" when entering and "Capture Mode deactivated" when exiting

**Given** the user has no projects yet
**When** they enter Capture Mode
**Then** a default project named "My Thoughts" is auto-created and used
**And** the user is informed via a subtle toast

---

### Story 2.6: Unit Lifecycle Management — Draft/Pending/Confirmed

As a user,
I want to manage the lifecycle state of Units through Draft, Pending, and Confirmed stages with clear visual indicators,
So that I can distinguish AI-generated proposals from my confirmed thoughts (FR27, UX-DR17).

**Acceptance Criteria:**

**Given** a Unit with `lifecycle: "draft"`
**When** the user views it in any list or card view
**Then** it displays the AILifecycleBadge in Draft state: dashed gray border, "Draft" label
**And** the UnitCard itself has dashed border and 80% opacity (UX-DR3)

**Given** a Unit with `lifecycle: "draft"`
**When** the user clicks "Review" or presses the `P` keyboard shortcut while the card is selected
**Then** the Unit's lifecycle transitions to `"pending"`
**And** the UI updates optimistically (instant visual change)
**And** a toast confirms "Unit moved to Pending review"

**Given** a Unit with `lifecycle: "pending"`
**When** the user clicks "Confirm" or presses the `C` keyboard shortcut
**Then** the lifecycle transitions to `"confirmed"`
**And** the UnitCard updates to solid border, full opacity, subtle checkmark badge

**Given** a Unit with `lifecycle: "confirmed"`
**When** the user clicks "Revert to Draft" (available in the Detail Panel)
**Then** the lifecycle transitions back to `"draft"`
**And** a confirmation dialog appears first: "This will revert the unit to draft status. Proceed?"

**Given** a Unit with `lifecycle: "draft"` (NFR8)
**When** any operation attempts to include it in an Assembly or create a relation from it
**Then** the operation is blocked with an error message: "Draft units cannot be used in assemblies or relations. Confirm the unit first."

**Given** the AILifecycleBadge component (UX-DR17)
**When** rendered in Small size
**Then** it displays as a compact inline badge suitable for card metadata rows
**When** rendered in Medium size
**Then** it displays as a larger badge suitable for the Detail Panel header

**Given** the `updateUnit` mutation
**When** `lifecycle` is changed
**Then** only valid transitions are allowed: draft->pending, pending->confirmed, confirmed->draft, confirmed->archived, any->archived
**And** invalid transitions (e.g., draft->confirmed directly) return a validation error

---

### Story 2.7: Thought Versioning — Preserve Previous Versions on Edit

As a user,
I want previous versions of my thoughts preserved when I edit them,
So that I can track how my thinking evolves over time (FR60).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the `unit_versions` table is defined
**Then** it includes: `id` (UUID, PK), `unitId` (UUID, FK to units, CASCADE delete), `version` (INT, NOT NULL), `content` (TEXT), `meta` (JSONB, nullable), `changeReason` (TEXT, nullable), `diffSummary` (TEXT, nullable), `createdAt` (TIMESTAMPTZ)
**And** a composite index exists on `(unitId, version)`
**And** migrations run successfully

**Given** a Unit is being updated via `updateUnit`
**When** the `content` field is changed
**Then** the previous content is automatically saved as a new version in `unit_versions` with an incremented version number
**And** the first version (original creation) is version 1

**Given** a Unit with version history
**When** `getUnitVersions` is called with `unitId`
**Then** all versions are returned in reverse chronological order: `{ version, content, changeReason, diffSummary, createdAt }[]`

**Given** a Unit with version history
**When** `getUnitVersion` is called with `unitId` and `version` number
**Then** the specific version snapshot is returned

**Given** a Unit's content is updated
**When** the user provides an optional `changeReason` in the update payload
**Then** the reason is stored in the version record (e.g., "Refined wording for clarity")

**Given** a Unit's non-content fields are updated (e.g., type, lifecycle, quality)
**When** the update is processed
**Then** no new version is created (versioning only tracks content changes)

**Given** the Unit Detail Panel (Metadata tab)
**When** the user views a Unit with version history
**Then** a "Version history" section shows the number of versions and a link to expand the version list
**And** each version entry shows version number, creation date, change reason (if any), and a "View" button
**When** the user clicks "View" on a past version
**Then** the previous content is displayed in a read-only view alongside the current content

**Given** the version system
**When** a Unit is archived (soft-deleted)
**Then** version history is preserved and accessible if the Unit is unarchived

---

### Story 2.8: Resource Unit Support with Vercel Blob Storage

As a user,
I want to attach non-text content (images, PDFs, audio, code files) as Resource Units that can be referenced by multiple Thought Units,
So that I can work with diverse content types in my thinking (FR4, FR18).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the `resource_units` table is defined
**Then** it includes: `id` (UUID, PK), `unitId` (UUID, FK to units, unique — each resource is linked to a parent Unit), `resourceType` (VARCHAR — image, table, audio, diagram, link, video, code, pdf), `blobUrl` (TEXT, NOT NULL), `blobKey` (TEXT, NOT NULL), `mimeType` (VARCHAR), `fileSize` (INT), `originalFilename` (TEXT), `metadata` (JSONB, nullable — dimensions, duration, language, etc.)
**And** the parent Unit's `originType` can be `"resource"` to identify it as a Resource Unit

**Given** the tRPC `unitRouter`
**When** `createResourceUnit` is called with a file upload and `projectId`
**Then** the file is uploaded to Vercel Blob storage via `@vercel/blob`
**And** a Unit record is created with `originType: "resource"` and `lifecycle: "confirmed"`
**And** a `resource_units` record is created with the blob URL, key, MIME type, and file size
**And** the combined Unit + ResourceUnit data is returned

**Given** a file upload
**When** the file exceeds 10MB
**Then** the upload is rejected with an error: "File size exceeds the 10MB limit"

**Given** a file upload
**When** the MIME type is not in the allowed list (image/*, audio/*, application/pdf, text/*, video/*)
**Then** the upload is rejected with an error: "Unsupported file type"

**Given** an existing Resource Unit
**When** `getUnit` is called on its parent Unit ID
**Then** the response includes the resource metadata (blob URL, type, filename, size) alongside the Unit data

**Given** an existing Resource Unit
**When** `deleteUnit` archives the parent Unit
**Then** the blob file is NOT deleted from Vercel Blob (retained for potential unarchive)
**When** the Unit is permanently deleted (future hard-delete operation)
**Then** the blob file is also deleted from Vercel Blob

**Given** the `listUnits` query
**When** filtered by `originType: "resource"`
**Then** only Resource Units are returned, each including their resource metadata

**Given** a Resource Unit for an image
**When** displayed in a UnitCard
**Then** the card shows a thumbnail preview of the image, the filename, and file size
**And** clicking the card opens the full image in the Detail Panel

---

### Story 2.9: Provenance Tracking — origin_type and source_span

As a user,
I want every Unit to track where it came from (direct writing, external excerpt, AI-generated, etc.) and its position in source material,
So that I can always trace the provenance of my thoughts (FR20).

**Acceptance Criteria:**

**Given** the Unit data model
**When** `originType` is reviewed
**Then** the following values are supported: `direct_write`, `external_excerpt`, `external_inspiration`, `external_summary`, `ai_generated`, `ai_refined`, `resource`
**And** Zod validation enforces this enum on creation and update

**Given** the Prisma schema
**When** a `source_spans` table is defined
**Then** it includes: `id` (UUID, PK), `unitId` (UUID, FK to units, CASCADE), `parentInputId` (UUID, nullable — references the original input/resource that was decomposed), `startPosition` (INT, nullable), `endPosition` (INT, nullable), `excerptPreview` (VARCHAR(15), nullable — first 15 chars of the source span)
**And** a Unit can have zero or one source span

**Given** a Unit created via Capture Mode
**When** the Unit is saved
**Then** `originType` is set to `direct_write` and no source span is created

**Given** a Unit created from external text (future: web clip, paste with citation)
**When** the Unit is saved with source information
**Then** `originType` is set to the appropriate type (e.g., `external_excerpt`)
**And** a source span is created with `parentInputId`, `startPosition`, `endPosition`, and `excerptPreview`

**Given** the `createUnit` mutation
**When** called with optional `sourceSpan` data
**Then** the source span is created in a transaction with the Unit

**Given** any Unit
**When** `getUnit` is called
**Then** the response includes `originType` and optional `sourceSpan` data (if exists)

**Given** the Unit Detail Panel (Metadata tab)
**When** a Unit with provenance data is displayed
**Then** the origin type is shown with a human-readable label (e.g., "Direct write", "External excerpt")
**And** if a source span exists, the excerpt preview and source reference are displayed

**Given** the `listUnits` query
**When** filtered by `originType`
**Then** only Units with the matching origin type are returned

---

### Story 2.10: Onboarding First-Time Experience

As a new user,
I want a clean, guided first experience that teaches me the Flowmind paradigm through action,
So that I understand how thought capture and decomposition work without feeling overwhelmed (UX-DR34).

**Acceptance Criteria:**

**Given** a user who has just signed in for the first time
**When** the application loads
**Then** instead of the normal dashboard, a clean single-input view is displayed
**And** the view shows a centered text input with placeholder "What are you thinking about?"
**And** no sidebar, toolbar, or other chrome is visible (similar to Capture Mode)

**Given** the onboarding view
**When** the user types their first thought and submits
**Then** the thought is saved as a Unit with `originType: "direct_write"`
**And** a default project "My First Project" is created if none exists
**And** the UI transitions to show the newly created UnitCard with a brief animation

**Given** the user has created their first Unit
**When** the main app interface appears
**Then** a 3-step tooltip tour begins:
**Step 1**: Points to the UnitCard — "This is a Thought Unit — an atomic piece of your thinking"
**Step 2**: Points to the sidebar — "Organize your thoughts into Contexts — exploration spaces for different purposes"
**Step 3**: Points to the Cmd+K shortcut or toolbar — "Use the command palette to quickly capture, search, and navigate"
**And** each tooltip has "Next" and "Skip tour" buttons

**Given** the tooltip tour
**When** the user clicks "Skip tour"
**Then** the tour ends immediately and is not shown again
**And** a preference `hasCompletedOnboarding: true` is stored for the user

**Given** a user who has completed onboarding
**When** they sign in on subsequent sessions
**Then** the onboarding flow is not shown; the normal dashboard/project view loads directly

**Given** user preferences
**When** the user navigates to Settings
**Then** a "Replay onboarding" option is available to re-trigger the first-time experience

---

### Story 2.11: Undo/Redo System and Keyboard Shortcuts

As a user,
I want to undo and redo my recent actions with keyboard shortcuts and see confirmation of what was undone,
So that I can experiment freely without fear of losing work (UX-DR41, UX-DR43).

**Acceptance Criteria:**

**Given** the undo/redo system
**When** the user performs a reversible action (create Unit, update Unit content, change type, change lifecycle)
**Then** the action is pushed onto an undo stack with a description (e.g., "Changed type to Claim")

**Given** the user has performed reversible actions
**When** the user presses Cmd+Z (Mac) or Ctrl+Z (Windows)
**Then** the most recent action is reversed
**And** a toast notification appears: "Undone: [action description]" with a "Redo" link

**Given** the user has undone an action
**When** the user presses Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows)
**Then** the undone action is re-applied
**And** a toast notification appears: "Redone: [action description]"

**Given** a destructive action (delete/archive a Unit)
**When** the user initiates it
**Then** a confirmation dialog appears before execution: "Are you sure you want to archive this unit?"
**And** the dialog has "Archive" (destructive) and "Cancel" buttons

**Given** the keyboard shortcut system (UX-DR43)
**When** the following shortcuts are pressed
**Then** the corresponding actions occur:
- Cmd+K / Ctrl+K: Open Command Palette
- Cmd+N / Ctrl+N: Enter Capture Mode
- Cmd+1: Switch to Canvas/default view
- Cmd+2: Switch to Thread view (placeholder)
- Cmd+3: Switch to Graph view (placeholder)
- Cmd+4: Switch to Assembly view (placeholder)
- D: Set selected Unit to Draft
- P: Set selected Unit to Pending
- C: Set selected Unit to Confirmed
- Cmd+/ / Ctrl+/: Show keyboard shortcut help overlay
- Escape: Close current overlay/panel/mode

**Given** the keyboard shortcut help overlay
**When** the user presses Cmd+/ or Ctrl+/
**Then** a modal displays all available keyboard shortcuts grouped by category
**And** pressing Escape closes the overlay

**Given** a text input is focused (Capture Mode, Detail Panel editing, search)
**When** single-key shortcuts (D, P, C) are pressed
**Then** they are treated as text input, NOT as shortcut triggers
**And** only modifier-key shortcuts (Cmd+X) remain active

---

### Story 2.12: Optimistic UI for All Unit Data Operations

As a user,
I want all create, update, and delete operations on Units to feel instant with no "Saving..." indicators,
So that the application feels fast and responsive (UX-DR58).

**Acceptance Criteria:**

**Given** the user creates a new Unit
**When** the create mutation is fired
**Then** the new UnitCard appears instantly in the list with a locally generated temporary ID
**And** the actual server response replaces the temp ID with the real UUID silently in the background
**And** no loading spinner or "Saving..." text is shown

**Given** the user updates a Unit's content
**When** the update mutation is fired
**Then** the UnitCard and Detail Panel reflect the new content immediately
**And** the server mutation runs in the background via React Query / tRPC

**Given** the user changes a Unit's type or lifecycle
**When** the mutation is fired
**Then** the card's visual state (color, border, badge) updates instantly before server confirmation

**Given** the user archives (deletes) a Unit
**When** the mutation is fired
**Then** the UnitCard is removed from the list immediately with a fade-out animation
**And** an "Undo" toast appears for 4 seconds

**Given** a server mutation fails (network error, validation error)
**When** the optimistic update has already been applied
**Then** the optimistic change is rolled back to the previous state
**And** an error toast appears: "Failed to save changes. Your edit has been reverted."
**And** the previous data is restored in the UI

**Given** the user is offline or has a slow connection
**When** mutations are queued
**Then** tRPC/React Query retries the mutation up to 3 times with exponential backoff
**And** if all retries fail, the rollback and error toast behavior applies

**Given** multiple rapid edits to the same Unit
**When** the user makes several changes before the first mutation resolves
**Then** each optimistic update is applied in sequence
**And** only the latest state is persisted to the server (debounced mutations for content, immediate for lifecycle/type)
# Flowmind User Stories — Epic 3: Context Organization & Perspectives

## Epic 3: Context Organization & Perspectives

Users can create Contexts as exploration spaces, assign Units to them, see different perspectives per Context (type, relations, stance, importance), navigate a hierarchical Context tree, and receive a re-entry briefing when returning to a Context. A single thought can live in multiple Contexts with different roles.

---

### Story 3.1: Context Data Model and CRUD API

As a developer,
I want the Context database schema and tRPC CRUD router,
So that Contexts can be created, read, updated, and deleted as named exploration spaces (FR7).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the `contexts` table is defined
**Then** it includes: `id` (UUID, PK), `name` (TEXT, NOT NULL), `description` (TEXT, nullable), `projectId` (UUID, FK to projects, NOT NULL), `parentId` (UUID, FK to contexts, nullable — for hierarchical structure), `snapshot` (JSONB, nullable — AI-managed summary, future), `openQuestions` (JSONB, nullable — unresolved questions list, future), `contradictions` (JSONB, nullable — internal contradictions, future), `userId` (UUID, FK to users), `createdAt` (TIMESTAMPTZ), `modifiedAt` (TIMESTAMPTZ)
**And** indexes exist on `projectId`, `parentId`, `userId`
**And** `pnpm prisma migrate dev` succeeds

**Given** the tRPC `contextRouter`
**When** `createContext` is called with `name`, `projectId`, and optional `description`, `parentId`
**Then** a new Context is created with current timestamps and the authenticated user's ID
**And** the created Context is returned with all fields

**Given** the tRPC `contextRouter`
**When** `getContext` is called with a valid `contextId`
**Then** the full Context record is returned including child context count and unit count

**Given** the tRPC `contextRouter`
**When** `updateContext` is called with `contextId` and partial fields (`name`, `description`)
**Then** only the specified fields are updated, `modifiedAt` is refreshed
**And** the updated Context is returned

**Given** the tRPC `contextRouter`
**When** `deleteContext` is called with a valid `contextId`
**Then** the Context is soft-deleted (archived)
**And** all unit-context associations (perspectives) are preserved but hidden from default queries
**And** child contexts are NOT cascaded — they become root-level contexts under the project

**Given** the tRPC `contextRouter`
**When** `listContexts` is called with `projectId`
**Then** a list of Contexts is returned, ordered by `createdAt` descending
**And** each Context includes: `id`, `name`, `description`, `parentId`, `unitCount`, `childCount`, `createdAt`
**And** archived Contexts are excluded by default

**Given** a user attempts to create a Context in another user's project
**When** the `projectId` belongs to a different user
**Then** a `TRPCError` with code `FORBIDDEN` is returned

**Given** the `listContexts` query with `parentId` filter
**When** `parentId` is provided
**Then** only direct children of that parent Context are returned
**When** `parentId` is null
**Then** only root-level Contexts (no parent) are returned

---

### Story 3.2: Context Sidebar with Project Selector and Collapsible Tree

As a user,
I want a sidebar showing my projects and their Context trees that I can expand, collapse, and reorder,
So that I can navigate between exploration spaces quickly (UX-DR12, UX-DR45).

**Acceptance Criteria:**

**Given** the ContextSidebar component (UX-DR12)
**When** rendered in expanded state
**Then** it is 260px wide and displays: a project selector dropdown at the top, followed by a hierarchical tree of Contexts for the selected project

**Given** the ContextSidebar
**When** the user clicks the collapse toggle
**Then** the sidebar animates to 60px width (icon-only mode) over 250ms
**And** only project and context icons are visible (no text labels)

**Given** the ContextSidebar on mobile/tablet (< 1024px)
**When** the sidebar is toggled via hamburger menu
**Then** it slides in as an overlay (0px hidden -> 260px visible)

**Given** the project selector
**When** clicked
**Then** a dropdown lists all of the user's projects with names and unit counts
**And** selecting a project loads its Context tree in the sidebar

**Given** the Context tree (UX-DR45)
**When** a project is selected
**Then** root-level Contexts are displayed as expandable tree nodes
**And** child Contexts are nested under their parents with visual indentation
**And** each node shows the Context name and a unit count badge

**Given** a Context tree node
**When** the user clicks the expand/collapse chevron
**Then** the node expands to show children or collapses to hide them with a smooth animation
**And** the expand/collapse state is preserved across navigation

**Given** a Context tree node
**When** the user clicks the Context name (not the chevron)
**Then** the Context is set as the active context in the navigation store
**And** the main content area updates to show that Context's Units
**And** the active Context is highlighted in the sidebar with `accent-primary` background

**Given** a Context tree node
**When** the user right-clicks on it
**Then** a context menu appears (using the ContextMenu component from Story 1.5) with options: Rename, Add child context, Move to..., Archive
**And** each action triggers the appropriate tRPC mutation

**Given** the Context tree
**When** the user drags a Context node to reorder it
**Then** the node moves to the new position with a 200ms spring snap animation
**And** if dropped onto another Context, it becomes a child of that Context (re-parenting)
**And** the `parentId` is updated via `updateContext` mutation

**Given** the sidebar
**When** a "New Context" button is clicked (at the bottom of the tree)
**Then** an inline text input appears in the tree for entering the Context name
**And** pressing Enter creates the Context; pressing Escape cancels

---

### Story 3.3: Perspective Layer — Per-Context Type, Relations, Stance, Importance

As a user,
I want a single Unit to have different types, stances, and importance levels in different Contexts,
So that the same thought can play different roles depending on the exploration space (FR3, FR5, FR12).

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the `unit_perspectives` table is defined
**Then** it includes: `id` (UUID, PK), `unitId` (UUID, FK to units, CASCADE), `contextId` (UUID, FK to contexts, CASCADE), `type` (VARCHAR(50), nullable — overrides defaultType per context), `stance` (VARCHAR(20), nullable — support, oppose, neutral, exploring), `importance` (FLOAT, nullable — 0.0 to 1.0 ThoughtRank within context), `note` (TEXT, nullable — context-specific annotation)
**And** a UNIQUE constraint exists on `(unitId, contextId)`
**And** indexes exist on `unitId`, `contextId`, and `(unitId, contextId)`

**Given** the tRPC `perspectiveRouter` (or extension of `unitRouter`)
**When** `addUnitToContext` is called with `unitId` and `contextId`
**Then** a `unit_perspectives` record is created linking the Unit to the Context
**And** the perspective inherits the Unit's `defaultType` as its initial `type` (if defaultType is set)
**And** `stance` defaults to `"neutral"` and `importance` defaults to `0.5`

**Given** a Unit already in a Context
**When** `addUnitToContext` is called again with the same `unitId` and `contextId`
**Then** a `TRPCError` with code `CONFLICT` is returned: "Unit already exists in this context"

**Given** an existing perspective
**When** `updatePerspective` is called with `perspectiveId` and partial fields (`type`, `stance`, `importance`, `note`)
**Then** only the specified fields are updated
**And** the updated perspective is returned

**Given** an existing perspective
**When** `removePerspective` is called (removing a Unit from a Context)
**Then** the `unit_perspectives` record is deleted
**And** any relations scoped to this perspective (Epic 4 future) are also deleted

**Given** a Unit that belongs to two Contexts
**When** the Unit is queried in Context A
**Then** the response includes the perspective data from Context A (type, stance, importance, note)
**When** the same Unit is queried in Context B
**Then** the response includes Context B's perspective data, which may differ entirely

**Given** the `listUnits` query with `contextId` parameter
**When** called
**Then** only Units that have a perspective in the specified Context are returned
**And** each Unit includes its context-specific perspective data alongside global Unit data

**Given** the UnitCard component
**When** rendered within a Context view
**Then** the type-colored border uses the perspective's `type` (not the Unit's `defaultType`)
**And** if the perspective type differs from the default type, a small indicator shows "typed as [X] in this context"

**Given** the Unit Detail Panel within a Context view
**When** the type selector is changed
**Then** it updates the perspective's `type` for the current Context only, NOT the Unit's `defaultType`
**And** a label clarifies: "Type in [Context Name]" vs. "Default type"

---

### Story 3.4: Context View — Filtered Display of Units per Context

As a user,
I want to see only the Units belonging to a specific Context when I select it,
So that I can focus on one exploration space at a time (FR49).

**Acceptance Criteria:**

**Given** the user has selected a Context from the sidebar
**When** the main content area loads
**Then** it displays only Units that have a perspective record in the selected Context
**And** Units are displayed as UnitCards in Standard variant by default
**And** a header shows the Context name, description, and unit count

**Given** the Context View
**When** there are no Units in the Context
**Then** an empty state is displayed: centered illustration, "No thoughts in this context yet" headline, and a "Capture a thought" CTA button that enters Capture Mode
**And** a secondary action "Add existing unit" is available

**Given** the Context View header
**When** the "Add existing unit" action is triggered
**Then** a search/browse popover appears showing Units from the same project that are NOT in this Context
**And** clicking a Unit adds it to the Context (creates a perspective record via `addUnitToContext`)
**And** the UnitCard appears in the list with an optimistic update

**Given** the Context View
**When** Units are displayed
**Then** each UnitCard shows the context-specific type (from perspective) rather than the default type
**And** the stance is indicated via a subtle icon or label (support/oppose/neutral/exploring)

**Given** the Context View
**When** the user sorts the Unit list
**Then** sorting options include: newest first, oldest first, by type, by importance (perspective importance)
**And** the selected sort is preserved per Context in local state

**Given** the Context View
**When** the user filters the Unit list
**Then** filter options include: by type (perspective type), by lifecycle, by stance
**And** active filters are shown as chips above the list with an "X" to remove each

**Given** a Unit in the Context View
**When** the user right-clicks on a UnitCard
**Then** a context menu appears with: Open detail, Change type (in this context), Change stance, Remove from context, Archive unit
**And** "Remove from context" deletes the perspective record but does NOT archive the Unit itself

**Given** the Context View
**When** a new Unit is captured via Capture Mode while a Context is active
**Then** the Unit is automatically assigned to the active Context (perspective created)
**And** the Unit appears in the Context View immediately

---

### Story 3.5: Hierarchical Context Structure — Split, Merge, Cross-Reference

As a user,
I want to split a Context that has grown too large, merge related Contexts, and cross-reference between Contexts,
So that I can organize my exploration spaces as my thinking evolves (FR8).

**Acceptance Criteria:**

**Given** a Context with many Units
**When** the user selects "Split Context" from the context menu
**Then** a dialog appears asking for the name of the new child Context
**And** a multi-select list of the parent Context's Units is shown
**And** the user selects which Units to move to the new child Context

**Given** the split dialog
**When** the user confirms the split with selected Units
**Then** a new child Context is created with `parentId` set to the original Context
**And** the selected Units' perspective records are moved from parent to child (new perspective records created in child, old ones in parent deleted)
**And** Units NOT selected remain in the parent Context
**And** a success toast confirms: "Split [N] units into [new context name]"

**Given** two sibling Contexts (same parent or both root-level)
**When** the user selects "Merge Contexts" and picks a target
**Then** a confirmation dialog shows: "Merge [Source] into [Target]? All units from [Source] will be added to [Target]."
**When** confirmed
**Then** all perspective records from the source Context are re-pointed to the target Context
**And** if a Unit exists in both Contexts, the target's perspective is preserved (source's perspective is discarded with a note)
**And** the source Context is archived
**And** child Contexts of the source become children of the target

**Given** a Context
**When** the user selects "Cross-reference" and picks another Context
**Then** a cross-reference link is created (stored as metadata in both Contexts' JSONB `meta` or a dedicated `context_links` field)
**And** the sidebar tree shows a subtle link icon on cross-referenced Contexts
**And** the Context header displays "Related: [linked context names]" with clickable links

**Given** the Context tree in the sidebar
**When** a parent Context is displayed
**Then** its child Contexts are shown as nested tree nodes
**And** the parent shows a count of total Units across itself and all descendants

**Given** a Context with children
**When** the parent Context is archived
**Then** child Contexts are promoted to the parent's level (or become root-level)
**And** they are NOT archived

---

### Story 3.6: Context Snapshot Summary and Re-Entry Briefing

As a user,
I want an AI-generated summary and re-entry briefing when I return to a Context I haven't visited recently,
So that I can resume my thinking without cognitive reconstruction cost (FR9, UX-DR16, NFR16).

**Acceptance Criteria:**

**Given** the Context data model
**When** the `snapshot` JSONB field is populated
**Then** it contains: `summary` (string — 2-3 sentence overview of the Context's current state), `unitCount` (number), `lastUpdated` (ISO timestamp), `keyTopics` (string array — top themes)
**And** `openQuestions` JSONB contains an array of `{ unitId, content }` for Units of type "question" that lack answers
**And** `contradictions` JSONB contains an array of `{ unitIds: [id1, id2], description }` (placeholder for Epic 5 AI detection)

**Given** the tRPC `contextRouter`
**When** `generateSnapshot` is called with `contextId`
**Then** for MVP, a simple non-AI snapshot is generated: unit count, list of unit types with counts, most recent 3 units' content previews, questions without linked evidence
**And** the snapshot is stored in the Context's `snapshot` JSONB field
**And** this endpoint is designed to be replaced by AI-generated summaries in Epic 5

**Given** a user navigates to a Context
**When** the Context was last accessed more than 24 hours ago (tracked via a `lastAccessedAt` field on the Context)
**Then** the ContextBriefing component (UX-DR16) is displayed before the Context View

**Given** the ContextBriefing component
**When** displayed
**Then** it shows: session summary from the snapshot, open questions list (if any), a "Continue where I left off" CTA (scrolls to most recently modified Unit), and a "Start fresh" CTA (shows the full Context View from the top)
**And** the briefing can be dismissed and does not block access to the Context

**Given** a user navigates to a Context
**When** the Context was accessed within the last 24 hours
**Then** the ContextBriefing is NOT displayed; the Context View loads directly

**Given** the Context View
**When** the user clicks "Refresh summary" in the Context header
**Then** `generateSnapshot` is called and the snapshot is regenerated
**And** a toast confirms "Context summary updated"

**Given** the Context
**When** `lastAccessedAt` is tracked
**Then** it is updated every time the user navigates to the Context via `getContext` or sidebar click
**And** `lastAccessedAt` is a column on the `contexts` table (add to migration)

---

### Story 3.7: Project Dashboard with Context Card Grid

As a user,
I want a project-level dashboard showing all my Contexts as visual cards with key metrics,
So that I can get an overview of my exploration spaces at a glance (UX-DR33).

**Acceptance Criteria:**

**Given** the Project Dashboard page at `/project/[projectId]`
**When** loaded
**Then** it displays: project title and description at the top, a grid of Context cards below, and a "New Context" button prominently placed

**Given** the Context card in the dashboard grid
**When** rendered
**Then** each card shows: Context name, description (truncated to 2 lines), unit count, creation date, last accessed date, and top 3 unit type badges with counts
**And** the card uses `resting` elevation with `elevated` on hover

**Given** the dashboard grid
**When** the user has 0 Contexts
**Then** an empty state is shown: "Start your first exploration" headline with a "Create Context" CTA and a brief explanation of what Contexts are

**Given** the dashboard
**When** the user clicks on a Context card
**Then** they navigate to the Context View for that Context
**And** the sidebar updates to highlight the selected Context

**Given** the dashboard
**When** the "New Context" button is clicked
**Then** a dialog appears with fields: Context name (required), Description (optional), Parent context (optional dropdown)
**And** on submit, the Context is created and the user is navigated to the new Context View

**Given** the dashboard grid layout
**When** the viewport is >= 1280px
**Then** the grid displays 3 cards per row
**When** the viewport is 768px-1279px
**Then** the grid displays 2 cards per row
**When** the viewport is < 768px
**Then** the grid displays 1 card per row

**Given** the dashboard
**When** the user has many Contexts (> 12)
**Then** the grid is scrollable within the main content area using the ScrollArea component
**And** a search/filter bar appears above the grid for filtering Contexts by name

---

### Story 3.8: Breadcrumb Navigation and Context Preservation

As a user,
I want breadcrumb navigation showing my current location (Project > Context > Unit) and automatic preservation of my navigation state,
So that I can always know where I am and return seamlessly (UX-DR44, UX-DR46).

**Acceptance Criteria:**

**Given** the toolbar breadcrumb component (UX-DR44)
**When** the user is viewing a Project Dashboard
**Then** the breadcrumb shows: `[Project Name]`

**Given** the user is viewing a Context View
**When** the breadcrumb renders
**Then** it shows: `[Project Name] > [Context Name]`
**And** each segment is clickable — clicking the project name navigates to the Project Dashboard

**Given** the user is viewing a Unit Detail within a Context
**When** the breadcrumb renders
**Then** it shows: `[Project Name] > [Context Name] > [Unit content preview (truncated)]`
**And** clicking Context Name returns to the Context View, clicking Project Name returns to the Dashboard

**Given** a breadcrumb segment with a long name (> 30 chars)
**When** rendered
**Then** the name is truncated with ellipsis
**And** hovering shows the full name in a Tooltip

**Given** hierarchical Contexts (parent > child)
**When** the user is in a child Context
**Then** the breadcrumb shows: `[Project] > [Parent Context] > [Child Context]`
**And** all intermediate segments are clickable

**Given** the context preservation system (UX-DR46)
**When** the user navigates away from a Context and later returns
**Then** the following state is restored: scroll position in the Unit list, selected Unit (if any), open/closed state of the Detail Panel, active sort and filter settings
**And** state is stored per-context in a Zustand store (keyed by contextId)

**Given** the context preservation system
**When** the user switches between Contexts rapidly
**Then** each Context's state is independently preserved and restored

**Given** the navigation state store
**When** the browser tab is refreshed
**Then** the active project and context are restored from URL parameters (e.g., `/project/[projectId]/context/[contextId]`)
**And** scroll position and selection state are lost on refresh (acceptable for MVP)

---

### Story 3.9: Focus Mode Toggle

As a user,
I want to toggle Focus Mode to hide the sidebar and detail panel for maximum content space,
So that I can concentrate on my current work without distractions (UX-DR60).

**Acceptance Criteria:**

**Given** the user is in the normal layout
**When** the user clicks the Focus Mode toggle in the toolbar (or uses a keyboard shortcut)
**Then** the sidebar is hidden (animates to 0px over 250ms)
**And** the detail panel is closed if open (animates closed over 300ms)
**And** the toolbar is reduced to minimal elements: breadcrumb, Focus Mode toggle, Capture Mode button
**And** the main content area expands to fill the full width

**Given** Focus Mode is active
**When** the user clicks the Focus Mode toggle again
**Then** the sidebar restores to its previous state (expanded or collapsed, matching what it was before Focus Mode)
**And** the detail panel does NOT auto-reopen (it only opens on explicit action)
**And** the toolbar restores all elements

**Given** Focus Mode is active
**When** the user navigates to a different Context or Project via breadcrumbs or Command Palette
**Then** Focus Mode remains active (persists across navigation within the session)

**Given** Focus Mode state
**When** the user's session ends (tab close, logout)
**Then** Focus Mode state is NOT persisted — the next session starts in normal mode

**Given** Focus Mode is active
**When** the user presses Cmd+K to open the Command Palette
**Then** the Command Palette opens normally (Focus Mode does not block overlays)

**Given** Focus Mode is active
**When** the user presses Cmd+N to enter Capture Mode
**Then** Capture Mode activates on top of Focus Mode
**And** exiting Capture Mode returns to Focus Mode (not normal mode)

**Given** Focus Mode is active
**When** a screen reader user navigates the page
**Then** an `aria-live="polite"` region announces "Focus Mode activated" and "Focus Mode deactivated" on toggle
**And** all keyboard navigation remains fully functional
