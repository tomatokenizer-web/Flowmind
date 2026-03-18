# Story 1.7: Toast, Skeleton Loading & Empty State Patterns

Status: ready-for-dev

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

- [ ] Task 1: Build Toast notification system (AC: #1, #5)
  - [ ] Create `Toast` component with bottom-center positioning
  - [ ] Implement 300ms slide-up entrance animation
  - [ ] Add auto-dismiss after 4 seconds with progress indicator
  - [ ] Support 4 types: success, error, info, warning (using semantic color tokens)
  - [ ] Add optional undo action link
  - [ ] Implement toast queue for multiple simultaneous toasts
  - [ ] Add ARIA live region: `assertive` for errors, `polite` for info/success
  - [ ] Create `useToast` hook or Zustand store for triggering toasts
- [ ] Task 2: Build Skeleton loading components (AC: #2)
  - [ ] Create base `Skeleton` component with CSS pulse animation
  - [ ] Create skeleton variants for: UnitCard, sidebar item, toolbar, content area
  - [ ] Create AI processing indicator with dot animation and cancel button
  - [ ] Ensure no spinner elements are used anywhere
- [ ] Task 3: Build Empty state components (AC: #3)
  - [ ] Create base `EmptyState` component with centered layout
  - [ ] Add illustration slot, headline, description, and CTA button
  - [ ] Create variants for: Units empty, Contexts empty, Projects empty, Search no results
  - [ ] Use appropriate icons/illustrations per content type
- [ ] Task 4: Build inline form validation (AC: #4)
  - [ ] Create `FormField` wrapper component with validation states
  - [ ] Show error message on blur when invalid
  - [ ] Show success checkmark when valid
  - [ ] Show helper text on focus
  - [ ] Apply accent-primary focus indicator
- [ ] Task 5: Accessibility verification (AC: #5)
  - [ ] Verify ARIA live regions work with screen readers
  - [ ] Ensure skeleton states have appropriate `aria-busy` attributes
  - [ ] Verify empty states are announced correctly

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



### Debug Log References

### Completion Notes List

### File List
