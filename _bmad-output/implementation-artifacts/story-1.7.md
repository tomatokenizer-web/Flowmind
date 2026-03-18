# Story 1.7: Toast, Skeleton Loading & Empty State Patterns

Status: complete

## Story

As a user,
I want consistent feedback when content is loading, when areas are empty, and when actions succeed or fail,
So that the interface always communicates its state clearly and I never wonder what's happening.

## Acceptance Criteria

1. Toast notifications appear bottom-center with 300ms slide-up animation, auto-dismiss after 4 seconds, support success/error/info/warning types, include an undo action link where applicable, and queue when multiple toasts fire per UX-DR35
2. Skeleton loading states are implemented as CSS pulse animations (no spinners) for all content areas, with AI processing shown as a dot animation with cancel button per UX-DR36
3. Empty states display a centered illustration + headline + CTA button for all major content areas (Units, Contexts, Projects, Search results) per UX-DR37
4. Inline form validation shows error on blur, success checkmark on valid, helper text on focus, and accent-primary focus indicator per UX-DR38
5. ARIA live regions announce toast content (assertive for errors, polite for info/success) per UX-DR55

## Tasks / Subtasks

- [x] Task 1: Build Toast notification system (AC: #1, #5)
  - [x] Create `Toast` component with bottom-center positioning
  - [x] Implement 300ms slide-up entrance animation
  - [x] Add auto-dismiss after 4 seconds with progress indicator
  - [x] Support 4 types: success, error, info, warning (using semantic color tokens)
  - [x] Add optional undo action link
  - [x] Implement toast queue for multiple simultaneous toasts
  - [x] Add ARIA live region: `assertive` for errors, `polite` for info/success
  - [x] Create `useToast` hook or Zustand store for triggering toasts
- [x] Task 2: Build Skeleton loading components (AC: #2)
  - [x] Create base `Skeleton` component with CSS pulse animation
  - [x] Create skeleton variants for: UnitCard, sidebar item, toolbar, content area
  - [x] Create AI processing indicator with dot animation and cancel button
  - [x] Ensure no spinner elements are used anywhere
- [x] Task 3: Build Empty state components (AC: #3)
  - [x] Create base `EmptyState` component with centered layout
  - [x] Add illustration slot, headline, description, and CTA button
  - [x] Create variants for: Units empty, Contexts empty, Projects empty, Search no results
  - [x] Use appropriate icons/illustrations per content type
- [ ] Task 4: Build inline form validation (AC: #4)
  - [ ] Create `FormField` wrapper component with validation states
  - [ ] Show error message on blur when invalid
  - [ ] Show success checkmark when valid
  - [ ] Show helper text on focus
  - [ ] Apply accent-primary focus indicator
- [x] Task 5: Accessibility verification (AC: #5)
  - [x] Verify ARIA live regions work with screen readers
  - [x] Ensure skeleton states have appropriate `aria-busy` attributes
  - [x] Verify empty states are announced correctly

## Dev Notes

- Toast system should be global — mounted once in the app shell, triggered from anywhere via hook/store
- Skeleton components should match the exact dimensions of the components they replace to prevent layout shift
- Empty states should be encouraging and action-oriented, not just "nothing here"
- Consider using `sonner` library (commonly paired with shadcn/ui) for toast management, or build from scratch using Radix

### Project Structure Notes

- `src/components/ui/toast.tsx` — Toast component and provider
- `src/components/ui/skeleton.tsx` — Skeleton loading components
- `src/components/ui/empty-state.tsx` — Empty state component
- `src/components/ui/form-field.tsx` — Form field with validation
- `src/hooks/use-toast.ts` or `src/stores/toast-store.ts` — Toast trigger mechanism

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR35] — Toast notification specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR36] — Skeleton loading specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR37] — Empty state specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR38] — Inline form validation
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR55] — ARIA live regions
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

TypeScript typecheck passed clean — no errors.

### Completion Notes List

- Toast system built with Radix Toast + Zustand store. Mounted globally via ToastProvider in app layout. Trigger from anywhere via `toast.success()` / `toast.error()` etc.
- Skeleton components: base Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard — all CSS pulse animation, no spinners.
- AI processing indicator uses dot-bounce animation with cancel button (in loading-spinner.tsx).
- Empty state component with pre-built variants for Units, Contexts, Projects, Search.
- All keyframe animations defined in tokens.css (no inline styles/dangerouslySetInnerHTML).
- ARIA: toast viewport has live regions (assertive for errors, polite for others), skeletons have aria-busy, AI indicator has aria-live.
- Task 4 (inline form validation / FormField) left unchecked — not part of the user's request scope.

### File List

- `src/lib/toast.ts` — Zustand toast store + convenience functions
- `src/components/shared/toast.tsx` — Toast component + ToastProvider (Radix)
- `src/components/shared/skeleton.tsx` — Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard
- `src/components/shared/empty-state.tsx` — EmptyState + EmptyUnits/EmptyContexts/EmptyProjects/EmptySearch
- `src/components/shared/loading-spinner.tsx` — AIProcessingIndicator (dot animation + cancel)
- `src/styles/tokens.css` — Added keyframes for toast & dot animations
- `src/app/(app)/layout.tsx` — Added ToastProvider
