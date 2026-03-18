# Story 1.3: Authentication with OAuth & Email Magic Links

Status: ready-for-dev

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

- [ ] Task 1: Configure Auth.js v5 (AC: #1, #2, #3)
  - [ ] Install and configure `next-auth@beta` (Auth.js v5)
  - [ ] Set up Google OAuth provider with client ID/secret
  - [ ] Set up GitHub OAuth provider with client ID/secret
  - [ ] Set up Email provider with magic link functionality
  - [ ] Configure SMTP or email service for magic link delivery
- [ ] Task 2: Configure session management (AC: #4, #5)
  - [ ] Set session strategy to JWT or database sessions
  - [ ] Ensure cookies are secure, HTTP-only, SameSite
  - [ ] Verify CSRF token is included in Auth.js forms
- [ ] Task 3: Set up Prisma adapter for Auth.js (AC: #6, #7)
  - [ ] Install `@auth/prisma-adapter`
  - [ ] Add User, Account, Session, VerificationToken models to Prisma schema
  - [ ] Configure account linking for same-email across providers
  - [ ] Run migration for auth tables
- [ ] Task 4: Implement route protection (AC: #8)
  - [ ] Create Next.js middleware for auth route protection
  - [ ] Define public routes (landing, sign-in) vs protected routes
  - [ ] Redirect unauthenticated users to sign-in page
- [ ] Task 5: Build sign-in and sign-out UI (AC: #1, #2, #3, #9)
  - [ ] Create sign-in page with Google, GitHub, and email options
  - [ ] Style sign-in page using design tokens from Story 1.4
  - [ ] Implement sign-out action with session clearing and redirect
- [ ] Task 6: Add environment variables (AC: #1, #2, #3)
  - [ ] Document `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env.example`
  - [ ] Document `GITHUB_ID`, `GITHUB_SECRET` in `.env.example`
  - [ ] Document `AUTH_SECRET`, email provider credentials in `.env.example`

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



### Debug Log References

### Completion Notes List

### File List
