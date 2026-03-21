# Story 9.7: Project Dashboard Enhancement with Template Integration

**Status: pending**

## Description
As a user,
I want the Project Dashboard to show template-aware information including scaffold progress and AI live guide,
So that my dashboard reflects the full richness of my project's domain template.

## Acceptance Criteria

**Given** a Project with an active Domain Template
**When** the enhanced Project Dashboard renders
**Then** it shows: project title, active template name, constraint level badge, Context card grid with Completeness Compass mini indicators per UX-DR33
**And** a scaffold progress section shows: total scaffold questions, answered count, and unanswered list
**And** the AI live guide panel shows context-aware suggestions based on the template, constraint level, and current gaps per FR67
**And** the "New Context" button suggests template-recommended context names per FR67
**And** the recommended navigation order from the template is reflected in Context card ordering per FR67

## Tasks
- [ ] Update `components/dashboard/ProjectDashboard.tsx` (from Story 3.7) to accept template context: fetch `project.getById` with template config included
- [ ] Create `components/dashboard/TemplateInfoHeader.tsx` — shows template name badge, constraint level badge (from Story 9.3), and "Change Template" / "Change Constraint Level" quick action links
- [ ] Create `components/dashboard/ScaffoldProgressSection.tsx` — shows progress bar (X of Y scaffold questions answered), expandable list of unanswered scaffold Units with "Answer" CTA links
- [ ] Create `components/dashboard/AiLiveGuidePanel.tsx` — collapsible panel in dashboard; in Active mode shows top 3 AI suggestions from template's `aiGuidePrompts` filtered by current gaps; in Suggest mode shows as collapsed with badge; in Passive mode hidden
- [ ] Update Context card grid to order by `template.navigationOrder` when a template is active
- [ ] Update "New Context" dialog: when template is active, show template-recommended context names as quick-select options (from template config `contextSlots[].suggestedName`)
- [ ] Add Completeness Compass mini indicator to each Context card (from Story 9.5 — CompassMiniIndicator per context)
- [ ] Create `components/dashboard/DashboardEmptyState.tsx` — shown when project has template but zero non-scaffold Units: prompt with template-specific onboarding message and first scaffold question
- [ ] Fetch all dashboard data in a single tRPC query combining project, contexts, scaffold status, gap results, and compass data
- [ ] Update Zustand dashboard store slice with template-aware fields: `templateName`, `constraintLevel`, `scaffoldProgress`, `aiGuideVisible`
- [ ] Write unit tests for scaffold progress calculation
- [ ] Write integration tests for dashboard rendering with and without active template

## Dev Notes
- Key files: `components/dashboard/ProjectDashboard.tsx`, `components/dashboard/ScaffoldProgressSection.tsx`, `components/dashboard/AiLiveGuidePanel.tsx`
- Dependencies: Story 3.7 (base Project Dashboard), Story 9.1 (Project with template_id), Story 9.2 (template config), Story 9.3 (constraint level and AiLiveGuide), Story 9.4 (scaffold Units and gap detection), Story 9.5 (Completeness Compass mini indicator)
- Technical approach: Create a combined `dashboard.getProjectDashboardData` tRPC procedure that batches: project + template config, all Contexts (ordered by navigationOrder), scaffold Unit status, gap detection results, and compass data. This avoids N+1 fetches. Context card ordering: if template has `navigationOrder: ["Research", "Analysis", "Synthesis"]`, sort Contexts by index in this array; unmatched Contexts go to end. AiLiveGuidePanel prompts filtered by: (1) current unfilled gaps, (2) constraint level (Active shows all, Suggest shows top 3, Passive hides panel).

## References
- Epic 9: Projects & Domain Templates
- FR67: Template-aware dashboard with scaffold progress and AI live guide
- UX-DR33: Project Dashboard enhanced with template integration
- Related: Story 3.7 (base dashboard from Epic 3), Story 9.3 (constraint level), Story 9.4 (scaffold/gap), Story 9.5 (Completeness Compass)
