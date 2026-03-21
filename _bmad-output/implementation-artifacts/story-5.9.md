# Story 5.9: AI Intervention Intensity Levels

**Status: pending**

## Description
As a user,
I want to configure how aggressively the AI intervenes in my thinking process,
So that I can choose minimal assistance for focused work or generative help for brainstorming.

## Acceptance Criteria

**Given** the user opens AI settings (accessible from the toolbar or project settings)
**When** the settings panel renders
**Then** four intervention intensity levels are displayed: Minimal, Moderate, Exploratory, Generative
**And** each level has a clear description of what it does

**Given** the user selects "Minimal" intensity
**When** they work in the active Context
**Then** AI only alerts on clear logical gaps (Story 5.8 alerts for missing evidence, unanswered questions)
**And** no proactive suggestions, no type proposals, no relation suggestions are generated

**Given** the user selects "Moderate" intensity
**When** they work in the active Context
**Then** AI suggests exploration directions (Story 5.7) on high-potential Units
**And** AI proposes types for new Units (Story 5.4)
**And** no Socratic questions or draft generation occurs

**Given** the user selects "Exploratory" intensity
**When** they work in the active Context
**Then** all Moderate features are active PLUS AI asks Socratic questions (e.g., "What assumption underlies this claim?", "What would disprove this?")
**And** Socratic questions appear as suggestion cards (UX-DR39) that can be dismissed

**Given** the user selects "Generative" intensity
**When** they work in the active Context
**Then** all Exploratory features are active PLUS AI directly generates branch draft Units
**And** generated drafts appear with dashed border / gray background (Draft lifecycle per UX-DR3)
**And** safety guard limits (max 3 per request, 3 consecutive) still apply

**Given** the intensity level is set
**When** it is stored
**Then** it persists per-project (not global) so different projects can have different levels
**And** the active level is shown as a subtle indicator in the toolbar

## Tasks
- [ ] Add `ai_intensity_level` column (`enum: minimal | moderate | exploratory | generative`) to `projects` table with default `moderate`
- [ ] Create tRPC mutation `project.updateAIIntensity` accepting `{ projectId, level }` with zod enum validation
- [ ] Build `components/settings/AIIntensitySettings.tsx` panel with four radio/button options, each showing the level name and description
- [ ] Add descriptions to each level: Minimal ("Logical gap alerts only"), Moderate ("Type suggestions + exploration directions"), Exploratory ("+ Socratic questions"), Generative ("+ AI drafts branch Units")
- [ ] Add AI settings access point in the toolbar (small icon/button) and in project settings page
- [ ] Show current intensity level as a subtle toolbar indicator (e.g., small colored dot or text label)
- [ ] Create `useAIIntensity` hook in `hooks/useAIIntensity.ts` that reads the project's `ai_intensity_level` and exposes boolean flags: `showFlowAlerts`, `showTypeSuggestions`, `showExplorationDirections`, `showSocraticQuestions`, `showGenerativeDrafts`
- [ ] Gate Story 5.8 flow alerts behind `showFlowAlerts` (active for all levels)
- [ ] Gate Story 5.4 type/relation suggestions behind `showTypeSuggestions` (Moderate and above)
- [ ] Gate Story 5.7 exploration directions behind `showExplorationDirections` (Moderate and above)
- [ ] Implement Socratic question generation in `server/ai/socraticService.ts`: prompt generates 1-2 challenge questions for a Unit based on its type and content
- [ ] Create Trigger.dev job that fires on Unit confirmation for Exploratory/Generative levels to generate Socratic questions
- [ ] Gate Socratic questions behind `showSocraticQuestions` (Exploratory and above)
- [ ] In Generative level: after exploration direction click, auto-create the draft Unit (rather than just opening an empty editor)
- [ ] Gate generative draft auto-creation behind `showGenerativeDrafts`

## Dev Notes
- The `ai_intensity_level` persists per-project so users can have a brainstorming project on Generative and a focused-writing project on Minimal
- The `useAIIntensity` hook should be reactive — if the user changes the level in settings, all gated features update without page refresh
- Socratic question suggestions should follow the same `AISuggestionCard` (UX-DR39) pattern as type/relation suggestions
- Safety guard limits from Story 5.1 apply regardless of intensity level — Generative does not bypass them
- Default level is `moderate` — this matches what most users expect without being intrusive

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: Safety guard limits apply across all intensity levels
- Story 5.4: Type/relation suggestions are gated by intensity level
- Story 5.7: Branch potential exploration is gated by intensity level
- Story 5.8: Flow alerts are the only AI feature active at Minimal level
