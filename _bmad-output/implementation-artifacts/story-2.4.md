# Story 2.4: Capture Mode — Distraction-Free Thought Input

Status: complete

## Story

As a user,
I want a minimal, distraction-free input mode where I can just type my thoughts,
So that I can capture ideas at the speed of thinking without any UI friction.

## Acceptance Criteria

1. **Given** the user is anywhere in the app, **When** they press Cmd+N or click the Capture button, **Then** Capture Mode activates: all chrome hides except a centered text input with the placeholder "What are you thinking about?" per UX-DR59, FR24
2. Pressing Escape exits Capture Mode and returns to the previous view
3. Pressing Enter (or a submit button) creates a new Thought Unit with `lifecycle: "draft"`, `origin_type: "direct_write"`, and `unit_type: "observation"` (default)
4. The created Unit appears immediately in the UI via optimistic update per UX-DR58
5. No AI intervention occurs in Capture Mode — the text is stored as-is per FR24
6. Input accepts text of any length without a character limit per FR18
7. After submission, the input clears and remains open for the next thought (rapid-fire capture)
8. A mode indicator distinguishes Capture Mode (no AI) from Organize Mode (AI-assisted); the user can toggle between them via a toolbar switch or Cmd+Shift+N per FR24
9. In Organize Mode, submitted text is immediately routed to the AI decomposition pipeline (Epic 5, Story 5.2) instead of being stored as a single Unit

## Tasks / Subtasks

- [x] Task 1: Create CaptureMode component (AC: #1, #2)
  - [x] Create `src/components/unit/capture-mode.tsx`
  - [x] Implement full-screen overlay with centered textarea
  - [x] Set placeholder: "What are you thinking about?"
  - [x] Hide all app chrome (sidebar, toolbar) when active
  - [x] Auto-focus textarea on open
  - [x] Handle Escape key to close
  - [x] Animate entry/exit (fade in 200ms) per UX-DR42
- [x] Task 2: Implement keyboard shortcut activation (AC: #1)
  - [x] Register Cmd+N (Mac) / Ctrl+N (Windows) global shortcut
  - [x] Register Cmd+Shift+N / Ctrl+Shift+N for Organize Mode toggle
  - [x] Use existing keyboard shortcut infrastructure from Story 1.9
- [x] Task 3: Implement thought submission (AC: #3, #4, #5, #7)
  - [x] On Enter (or Cmd+Enter for multiline), call `capture.submit` mutation
  - [x] Set defaults: `lifecycle: "draft"`, `origin_type: "direct_write"`, `unit_type: "observation"`
  - [x] Use optimistic update to show the new Unit immediately (invalidates unit.list)
  - [x] Clear input after successful submission
  - [x] Keep Capture Mode open for next thought (rapid-fire)
  - [x] No AI processing — store raw text as-is
- [x] Task 4: Handle text input without limits (AC: #6)
  - [x] Use auto-expanding textarea (grows with content)
  - [x] No character count or limit indicator
  - [x] Support paste of large text blocks
- [x] Task 5: Create mode toggle (AC: #8, #9)
  - [x] Create ModeToggle inline in `src/components/unit/capture-mode.tsx`
  - [x] Show toggle button: "Capture" (green dot) | "Organize" (blue dot)
  - [x] Position in Capture Mode header area (top center)
  - [x] In Capture Mode: submit stores as-is
  - [x] In Organize Mode: submit sets `meta.pendingDecomposition: true` (placeholder for Epic 5)
  - [x] Show mode indicator label: "No AI" for Capture, "AI-Assisted" for Organize
- [x] Task 6: Create Zustand store for capture state (AC: #1, #8)
  - [x] Create `src/stores/capture-store.ts`
  - [x] Track: `isOpen`, `mode` ("capture" | "organize"), `pendingText`
  - [x] Actions: `open()`, `close()`, `toggle()`, `toggleMode()`, `setText()`, `clearText()`
- [x] Task 7: Write tests
  - [x] Test capture store open/close/toggle
  - [x] Test mode toggle switches between Capture and Organize
  - [x] Test capture.submit creates Unit with correct defaults (draft, observation, direct_write)
  - [x] Test no AI processing in Capture Mode (no meta flag)
  - [x] Test organize mode sets pendingDecomposition flag
  - [x] Test text stored as-is without modification
  - [x] Test empty content rejection
  - [x] Test authentication guard

## Dev Notes

- Capture Mode is the core "first action" in Flowmind — it must feel instant and frictionless
- Use Zustand for local capture state rather than server state — the Unit is only created on submit
- Enter vs Cmd+Enter: Consider Enter for quick single-line thoughts, Cmd+Enter for multiline. Or use Shift+Enter for newlines within the textarea
- The Organize Mode toggle is a placeholder for Epic 5 integration — for now, it should be visually present but the Organize path just creates a regular Unit with a flag
- The overlay should use `z-50` or higher to ensure it covers all app chrome
- Consider adding a subtle submission animation (the text "flies" into the sidebar as a new card)

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Zustand for client state management
- [Source: _bmad-output/planning-artifacts/architecture.md] — tRPC optimistic mutations
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR59: Capture Mode specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR58: Optimistic UI updates
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR42: Animation timing specifications
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR43: Keyboard shortcuts
