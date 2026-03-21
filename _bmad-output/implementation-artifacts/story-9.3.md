# Story 9.3: Constraint Levels — Strict, Guided, Open

**Status: pending**

## Description
As a user,
I want to choose how strictly the template guides my workflow when starting a project,
So that I can get strong guidance when I'm new to a domain or work freely when I'm experienced.

## Acceptance Criteria

**Given** a Project is being created with a Domain Template
**When** the user selects a constraint level per FR68
**Then** Strict mode: all template slots must be filled before Assemblies can be created; gap detection is enforced; AI live guide actively prompts missing elements
**And** Guided mode: template slots are suggested but not required; gap detection provides recommendations; AI live guide suggests but doesn't block
**And** Open mode: template structure is visible as reference only; no enforcement; AI live guide is passive (available on-demand)
**And** the constraint level can be changed at any time during the project lifecycle
**And** the Project Dashboard visually indicates the active constraint level

## Tasks
- [ ] Verify `constraint_level` enum (strict, guided, open) is on Project model from Story 9.1
- [ ] Create `server/services/constraintService.ts` — enforces constraint rules per level: `canCreateAssembly(projectId)` checks slot completion in Strict mode, `getGapSuggestions(projectId)` returns warnings/recommendations based on level, `getAiGuideMode(projectId)` returns active|suggest|passive
- [ ] Add tRPC procedures: `constraint.check`, `constraint.getGapSuggestions`, `constraint.changeLevel`
- [ ] Update Assembly creation flow — call `constraint.check` before allowing Assembly creation; in Strict mode, block and show missing slots
- [ ] Create `components/constraint/ConstraintLevelBadge.tsx` — badge shown in Project Dashboard and project header (Strict=red, Guided=yellow, Open=green)
- [ ] Create `components/constraint/ConstraintLevelSelector.tsx` — segmented control (Strict / Guided / Open) for project settings and creation wizard
- [ ] Create `components/constraint/StrictBlockerModal.tsx` — modal shown in Strict mode when user tries to create Assembly with unfilled required slots; lists missing slots with direct links
- [ ] Create `components/constraint/GuidedSuggestionBanner.tsx` — non-blocking suggestion banner in Guided mode listing recommended-but-missing template elements
- [ ] Create `components/constraint/AiLiveGuide.tsx` — context-aware guide panel; in Active mode shows proactive next-step prompts, in Suggest mode shows on-hover tooltips, in Passive mode shows only when explicitly opened
- [ ] Add constraint level change to Project Settings page (with warning that Strict mode may block current workflows)
- [ ] Write unit tests for constraintService.canCreateAssembly at all three levels
- [ ] Write integration tests for the Strict mode block flow

## Dev Notes
- Key files: `server/services/constraintService.ts`, `server/api/routers/constraint.ts`, `components/constraint/StrictBlockerModal.tsx`, `components/constraint/AiLiveGuide.tsx`
- Dependencies: Story 9.1 (Project.constraint_level), Story 9.2 (template config has contextSlots and gapDetectionRules), Story 9.4 (Scaffold Units provide the slot fill detection), Story 5.x (Assembly creation procedure to intercept)
- Technical approach: ConstraintService is purely read-based — it doesn't mutate but returns enforcement decisions. Strict mode's `canCreateAssembly` check: count unfilled required `contextSlots` from template config (slots that have no confirmed Unit with matching type in the Context). AiLiveGuide prompts come from template's `aiGuidePrompts[]` config array, filtered by current gaps and constraint level. Guide is rendered as a collapsible sidebar panel.

## References
- Epic 9: Projects & Domain Templates
- FR68: Constraint Levels — Strict, Guided, Open
- Related: Story 9.2 (template config), Story 9.4 (gap detection), Story 9.5 (Completeness Compass shows constraint-level-aware progress)
