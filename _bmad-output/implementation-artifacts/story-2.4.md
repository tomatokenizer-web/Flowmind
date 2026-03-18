# Story 2.4: Capture Mode — Distraction-Free Thought Input

Status: ready-for-dev

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

- [ ] Task 1: Create CaptureMode component (AC: #1, #2)
  - [ ] Create `src/components/capture/CaptureMode.tsx`
  - [ ] Implement full-screen overlay with centered textarea
  - [ ] Set placeholder: "What are you thinking about?"
  - [ ] Hide all app chrome (sidebar, toolbar) when active
  - [ ] Auto-focus textarea on open
  - [ ] Handle Escape key to close
  - [ ] Animate entry/exit (fade in 200ms) per UX-DR42
- [ ] Task 2: Implement keyboard shortcut activation (AC: #1)
  - [ ] Register Cmd+N (Mac) / Ctrl+N (Windows) global shortcut
  - [ ] Register Cmd+Shift+N / Ctrl+Shift+N for Organize Mode toggle
  - [ ] Use existing keyboard shortcut infrastructure from Story 1.9
- [ ] Task 3: Implement thought submission (AC: #3, #4, #5, #7)
  - [ ] On Enter (or Cmd+Enter for multiline), call `unit.create` mutation
  - [ ] Set defaults: `lifecycle: "draft"`, `origin_type: "direct_write"`, `unit_type: "observation"`
  - [ ] Use optimistic update to show the new Unit immediately
  - [ ] Clear input after successful submission
  - [ ] Keep Capture Mode open for next thought (rapid-fire)
  - [ ] No AI processing — store raw text as-is
- [ ] Task 4: Handle text input without limits (AC: #6)
  - [ ] Use auto-expanding textarea (grows with content)
  - [ ] No character count or limit indicator
  - [ ] Support paste of large text blocks
- [ ] Task 5: Create mode toggle (AC: #8, #9)
  - [ ] Create `src/components/capture/ModeToggle.tsx`
  - [ ] Show toggle switch: "Capture" (left, default) | "Organize" (right)
  - [ ] Position in Capture Mode header area
  - [ ] In Capture Mode: submit stores as-is
  - [ ] In Organize Mode: submit routes to AI decomposition pipeline (placeholder — wired in Epic 5)
  - [ ] Show mode indicator label: "No AI" for Capture, "AI-Assisted" for Organize
- [ ] Task 6: Create Zustand store for capture state (AC: #1, #8)
  - [ ] Create `src/stores/captureStore.ts`
  - [ ] Track: `isOpen`, `mode` ("capture" | "organize"), `pendingText`
  - [ ] Actions: `open()`, `close()`, `toggleMode()`, `setText()`, `submit()`
- [ ] Task 7: Write tests
  - [ ] Test Cmd+N opens Capture Mode
  - [ ] Test Escape closes Capture Mode
  - [ ] Test Enter submits and creates Unit with correct defaults
  - [ ] Test input clears after submission (rapid-fire)
  - [ ] Test mode toggle switches between Capture and Organize
  - [ ] Test no AI processing in Capture Mode
  - [ ] Test optimistic UI shows Unit immediately

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
