# Story 1.3: Authentication with OAuth & Email Magic Links

Status: complete

## Story

As a user,
I want to sign in with Google, GitHub, or a magic email link,
So that I can securely access my Flowmind workspace without managing another password.

## Acceptance Criteria

1. Auth.js v5 is integrated with Google OAuth provider
2. Auth.js v5 is integrated with GitHub OAuth provider
3. Email magic link sign-in sends a one-time link that creates a session when clicked
4. Sessions are persisted via secure HTTP-only cookies
5. CSRF protection is enabled by default via Auth.js
6. A user record is created in the database on first sign-in with `id`, `email`, `name`, `image`, `created_at`
7. Subsequent sign-ins with the same email (regardless of provider) link to the same user account
8. Unauthenticated users are redirected to the sign-in page when accessing protected routes
9. A sign-out action clears the session and redirects to the landing page

## Tasks / Subtasks

- [x] Task 1: Configure Auth.js v5 (AC: #1, #2, #3)
  - [x] Install and configure `next-auth@beta` (Auth.js v5)
  - [x] Set up Google OAuth provider with client ID/secret
  - [x] Set up GitHub OAuth provider with client ID/secret
  - [x] Set up Email provider with magic link functionality (Resend)
  - [x] Configure Resend email service for magic link delivery
- [x] Task 2: Configure session management (AC: #4, #5)
  - [x] Set session strategy to database sessions
  - [x] Ensure cookies are secure, HTTP-only, SameSite (Auth.js defaults)
  - [x] Verify CSRF token is included in Auth.js forms (built-in)
- [x] Task 3: Set up Prisma adapter for Auth.js (AC: #6, #7)
  - [x] Install `@auth/prisma-adapter` (already in package.json)
  - [x] Add User, Account, Session, VerificationToken models to Prisma schema (already existed from Story 1.2)
  - [x] Configure account linking for same-email across providers (allowDangerousEmailAccountLinking)
  - [x] Run migration for auth tables (schema already has auth tables)
- [x] Task 4: Implement route protection (AC: #8)
  - [x] Create Next.js middleware for auth route protection
  - [x] Define public routes (landing, sign-in) vs protected routes
  - [x] Redirect unauthenticated users to sign-in page
- [x] Task 5: Build sign-in and sign-out UI (AC: #1, #2, #3, #9)
  - [x] Create sign-in page with Google, GitHub, and email options
  - [x] Style sign-in page using Flowmind design tokens
  - [x] Implement sign-out action with session clearing and redirect (via Auth.js signOut)
- [x] Task 6: Add environment variables (AC: #1, #2, #3)
  - [x] Document `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env.example`
  - [x] Document `GITHUB_ID`, `GITHUB_SECRET` in `.env.example`
  - [x] Document `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` in `.env.example`

## Dev Notes

- Auth.js v5 (NextAuth.js v5) uses the new `auth()` function pattern instead of `getServerSession`
- Account linking by email is critical — a user who signs in with Google then later with GitHub (same email) must see the same account
- The Prisma adapter handles user/account/session storage automatically
- Protected routes should use Next.js middleware for server-side redirect, not client-side checks

### Project Structure Notes

- `src/server/auth.ts` or `src/auth.ts` — Auth.js configuration (follows T3 convention)
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js API route handler
- `src/app/(auth)/sign-in/page.tsx` — Sign-in page
- `src/middleware.ts` — Route protection middleware

### References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Auth.js v5 with OAuth providers (Google, GitHub) and magic links
- [Source: _bmad-output/planning-artifacts/architecture.md] — CSRF protection via Auth.js, security requirements
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, no debugging required.

### Completion Notes List

- Auth.js v5 configured with Google, GitHub, and Resend (email magic link) providers
- PrismaAdapter wired to shared db singleton (`src/lib/db.ts`)
- Database session strategy (not JWT) for secure server-side sessions
- `allowDangerousEmailAccountLinking: true` on OAuth providers enables same-email account linking (AC #7)
- Middleware protects all routes except `/`, `/sign-in`, and `/api/auth/*`
- Sign-in page uses Flowmind design tokens with Apple-like minimal aesthetic
- tRPC context updated with `db` and `session`; `protectedProcedure` added for authenticated endpoints

### File List

- `src/lib/db.ts` — Prisma client singleton
- `src/lib/auth.ts` — Auth.js v5 configuration (providers, adapter, callbacks)
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `src/app/(auth)/sign-in/page.tsx` — Sign-in page UI
- `src/middleware.ts` — Route protection middleware
- `src/server/api/trpc.ts` — Updated with auth session in context + protectedProcedure
- `.env.example` — Updated with OAuth and email provider env vars
