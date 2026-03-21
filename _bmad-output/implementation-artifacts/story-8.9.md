# Story 8.9: Energy-Level Metacognitive Feedback

**Status: pending**

## Description
As a user,
I want to tag my current energy and focus level when capturing thoughts,
So that the system can surface appropriate activities — e.g., low energy suggests reviewing the incubation queue, high energy suggests tackling complex decomposition or compression work.

## Acceptance Criteria

**Given** the user is in the thought capture flow
**When** they optionally tag their current energy level (low / medium / high)
**Then** the tag is stored on the capture session and associated with the Units created during that session
**And** the system uses the energy level to suggest appropriate next activities:
  - Low energy → surface Incubation Queue for light review or show Orphan Recovery list
  - Medium energy → suggest Relations editing, Context organization, or Compression review
  - High energy → prompt complex decomposition, Gap Detection review, or Compression detection run
**And** the energy tag is optional and non-blocking — users can dismiss without selecting
**And** energy history is shown as a metadata heatmap in user settings (last 30 days)
**And** the suggestion is non-interrupting and dismissible per NFR24

## Tasks
- [ ] Add `EnergyLevel` enum to Prisma: `low | medium | high`
- [ ] Add `CaptureSession` Prisma model: `id`, `user_id`, `energy_level` (EnergyLevel?), `started_at`, `ended_at`, `unit_ids` (Json array)
- [ ] Update Unit model with `capture_session_id` String? FK to CaptureSession
- [ ] Create `server/repositories/captureSessionRepository.ts` — CRUD for CaptureSessions, energy history aggregation
- [ ] Create `server/services/energyFeedbackService.ts` — energy-to-suggestion mapping logic, suggestion generation per energy level
- [ ] Add tRPC procedures: `captureSession.start`, `captureSession.end`, `captureSession.setEnergyLevel`, `captureSession.getSuggestions`, `captureSession.getEnergyHistory`
- [ ] Create `components/energy/EnergyLevelPicker.tsx` — compact three-option picker (Low / Medium / High with icons) shown in capture toolbar
- [ ] Create `components/energy/EnergySuggestionBanner.tsx` — non-interrupting suggestion card below capture area, dismissible, links to suggested activity
- [ ] Create `components/energy/EnergyHeatmap.tsx` — 30-day calendar heatmap for user settings page showing energy level per day
- [ ] Add Zustand store slice: `captureSession` (active session id, current energy level, pending suggestions)
- [ ] Write unit tests for energy-to-suggestion mapping
- [ ] Write integration tests for session start/end with energy tagging

## Dev Notes
- Key files: `server/services/energyFeedbackService.ts`, `server/api/routers/captureSession.ts`, `components/energy/EnergyLevelPicker.tsx`, `components/energy/EnergySuggestionBanner.tsx`
- Dependencies: Story 2.1 (Unit model), Story 8.1 (Incubation Queue — low-energy suggestion), Story 8.3 (Orphan Recovery — low-energy suggestion), Story 8.2 (Compression — high-energy suggestion), Story 9.4 (Scaffold/Gap Detection — high-energy suggestion)
- Technical approach: CaptureSession is a lightweight model tracking a group of Units created in one focused session. Energy level is set once per session via the picker; defaults to null (no selection). Suggestion engine is a simple deterministic rule map — no AI needed. EnergySuggestionBanner appears for 10 seconds then auto-dismisses (NFR24 compliance). Heatmap uses a CSS grid approach with color intensity mapped to energy level (grey=none, green=high, yellow=medium, blue=low).

## References
- Epic 8: Feedback Loop & Thought Evolution (goal mentions "energy-level metacognitive feedback")
- NFR24: Non-interrupting notification policy
- Related: Story 8.1 (Incubation Queue), Story 8.2 (Compression), Story 8.3 (Orphan Recovery), Story 9.4 (Gap Detection)
