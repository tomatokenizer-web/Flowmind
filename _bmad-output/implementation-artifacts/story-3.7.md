# Story 3.7: Project Dashboard with Context Grid

Status: complete

## Story

As a user,
I want a dashboard showing all my Contexts at a glance with their status indicators,
So that I can pick up any thread of thinking and see which areas need attention.

## Acceptance Criteria

1. **Given** the user has created multiple Contexts, **When** they navigate to the Project Dashboard, **Then** a grid of Context cards is displayed, each showing: Context name, Unit count, unresolved question count, last modified date, and a mini Completeness Compass indicator (placeholder circle) per UX-DR33
2. A "New Context" button is prominently placed per UX-DR33
3. An AI suggestions panel (placeholder) shows recommended next actions per UX-DR33
4. Context cards are clickable and navigate to the Context View for that Context
5. The dashboard is the default landing page after onboarding is complete

## Tasks / Subtasks

- [ ] Task 1: Create dashboard data service → `src/server/services/dashboardService.ts` (AC: #1)
  - [ ] `getDashboardData(userId)` — returns:
    - List of contexts with aggregated data: `id`, `name`, `unitCount` (from `unit_context` count), `unresolvedQuestionCount` (from `unresolved_questions` JSON array length), `lastModifiedAt` (max of context `updatedAt` or latest unit modification), `parentContextId`
    - Sort by `lastModifiedAt` descending (most recently active first)
  - [ ] Use a single optimized query with `_count` aggregations to avoid N+1 queries

- [ ] Task 2: Create tRPC procedure (AC: #1)
  - [ ] `dashboard.getData` — input: none (uses session userId), calls `dashboardService.getDashboardData`
  - [ ] Returns typed response with context cards array and metadata
  - [ ] Register router in `src/server/api/root.ts`

- [ ] Task 3: Create ContextCard component → `src/components/dashboard/ContextCard.tsx` (AC: #1, #4)
  - [ ] Card layout using Radix UI Card or custom div with consistent styling
  - [ ] Display Context name (truncated with Tooltip for long names)
  - [ ] Display Unit count with icon (e.g., cube icon)
  - [ ] Display unresolved question count with icon (e.g., question mark icon) — highlight if > 0
  - [ ] Display last modified date as relative time (e.g., "2 hours ago")
  - [ ] Mini Completeness Compass placeholder: a small circle with a static percentage or progress ring (placeholder for Epic 6)
  - [ ] Entire card is clickable — navigates to `/context/[id]` via Next.js router
  - [ ] Hover state with subtle elevation/shadow change (Framer Motion)
  - [ ] Show parent context name as a subtle label if nested

- [ ] Task 4: Create ProjectDashboard page → `src/app/(app)/dashboard/page.tsx` (AC: #1, #2, #3, #5)
  - [ ] Fetch dashboard data via `trpc.dashboard.getData`
  - [ ] Render header: "Your Contexts" or project name
  - [ ] Render "New Context" button prominently (top-right or hero area) per AC #2
    - Click opens the CreateContextDialog from Story 3.3
  - [ ] Render Context cards in a responsive grid layout:
    - Desktop: 3 columns
    - Tablet: 2 columns
    - Mobile: 1 column
  - [ ] Empty state: illustration/text encouraging the user to create their first Context
  - [ ] AI Suggestions panel (placeholder) per AC #3:
    - Sidebar or bottom section with static suggestions like "You have 5 open questions across 3 Contexts" or "Context X hasn't been visited in 7 days"
  - [ ] Loading skeleton for cards while data fetches

- [ ] Task 5: Set dashboard as default landing page (AC: #5)
  - [ ] Update the main app route redirect: after onboarding is complete, redirect to `/dashboard`
  - [ ] Update `src/app/(app)/page.tsx` or layout to redirect authenticated + onboarded users to dashboard
  - [ ] Preserve existing onboarding redirect for users who haven't completed onboarding

- [ ] Task 6: Create DashboardSkeleton → `src/components/dashboard/DashboardSkeleton.tsx`
  - [ ] Skeleton grid matching the ContextCard layout
  - [ ] Pulse animation on skeleton cards
  - [ ] Show 6 skeleton cards as default loading state

- [ ] Task 7: Write tests
  - [ ] Test `getDashboardData` returns correct context counts and metadata
  - [ ] Test dashboard renders context cards with correct data
  - [ ] Test "New Context" button opens create dialog
  - [ ] Test context card click navigates to context view
  - [ ] Test empty state renders when no contexts exist
  - [ ] Test dashboard is shown as default landing page after onboarding
  - [ ] Test responsive grid layout at different breakpoints
  - [ ] Test loading skeleton displays while data is fetching

## Dev Notes

- The dashboard query should be optimized to avoid N+1. Use Prisma's `include` with `_count` for `unitContext` and compute `unresolvedQuestionCount` from the JSON field in the service layer.
- The Completeness Compass is a placeholder for now — just render a static circle or progress ring with a fixed value (e.g., 0%). Real compass logic comes in Epic 6.
- AI suggestions panel is static placeholder text for MVP. Real AI-driven suggestions come in Epic 5.
- The "New Context" button should reuse the `CreateContextDialog` component from Story 3.3 to maintain consistency.
- Consider using `React.Suspense` with the DashboardSkeleton as fallback for a clean loading experience.
- The responsive grid can use Tailwind CSS grid utilities: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.

### Architecture References

- [Source: architecture.md] — Feature module isolation: dashboard as a feature module
- [Source: architecture.md] — tRPC router naming: camelCase verb-first procedures
- [Source: architecture.md] — Next.js App Router for page routing
- [Source: epics.md#Story 3.7] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — UX-DR33: Project Dashboard with Context grid, Completeness Compass, and AI suggestions
- [Source: project-context.md] — Tailwind CSS for responsive layouts, Framer Motion for hover animations
- [Source: project-context.md] — Radix UI primitives for accessible components
