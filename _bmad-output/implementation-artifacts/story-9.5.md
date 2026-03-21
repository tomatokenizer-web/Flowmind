# Story 9.5: Completeness Compass

**Status: pending**

## Description
As a user,
I want a radial progress visualization showing what's confirmed, what's missing, and what outputs I can produce at what completeness,
So that I always know where I stand and what's achievable right now.

## Acceptance Criteria

**Given** a Project with a Domain Template and gap detection
**When** the Completeness Compass renders
**Then** a radial progress visualization shows category breakdown (e.g., Evidence: 60%, Claims: 80%, Questions Resolved: 40%) per FR70, UX-DR14
**And** each category includes action suggestions (e.g., "Add 2 more evidence Units to reach 80%")
**And** the Compass reports: what has been confirmed, what is still missing, and what outputs (Assemblies) can be produced at the current completeness percentage per FR70
**And** the Compass has two states: collapsed (small indicator in the toolbar) and expanded (popover with full details) per UX-DR14
**And** in freeform template mode, the Compass only provides "Assemblies that can be created now" without completeness conditions per FR71
**And** the Compass auto-refreshes periodically and is invocable on-demand per NFR14
**And** progress updates follow non-interrupting notification policy per NFR24

## Tasks
- [ ] Create `server/services/compassService.ts` — computes CompassData from gap detection results: `{ categories: { name, filled, total, percentage, suggestions[] }[], availableAssemblies: AssemblyOption[], overallPercentage: number }`
- [ ] Add tRPC procedure `compass.getData` — returns CompassData for a project, includes `availableAssemblies` list
- [ ] Create `components/compass/CompletenessCompass.tsx` — main component with collapsed/expanded states
- [ ] Create `components/compass/CompassRadial.tsx` — SVG radial chart (donut/spider) showing category breakdown with color coding
- [ ] Create `components/compass/CompassCategoryRow.tsx` — row showing category name, fill bar, percentage, action suggestion text
- [ ] Create `components/compass/CompassAssemblyList.tsx` — list of Assemblies available to create at current completeness, with "Create" CTA buttons
- [ ] Create `components/compass/CompassMiniIndicator.tsx` — collapsed state: small circular progress ring shown in toolbar with overall percentage
- [ ] Add CompassMiniIndicator to Context toolbar (clicking expands to CompassPopover)
- [ ] Implement freeform mode variant: when project has no template, show only available Assemblies section, hide radial categories
- [ ] Add Zustand store slice for compass state: `isExpanded`, `lastComputedAt`, `compassData`
- [ ] Subscribe compass data to gap detection job completions (event bus) for auto-refresh
- [ ] Write unit tests for compassService.computeData covering freeform and template modes
- [ ] Write visual regression tests for CompassRadial component (if Storybook is configured)

## Dev Notes
- Key files: `server/services/compassService.ts`, `server/api/routers/compass.ts`, `components/compass/CompletenessCompass.tsx`, `components/compass/CompassRadial.tsx`
- Dependencies: Story 9.4 (GapDetectionService provides filled/missing slots), Story 9.2 (template config provides `availableAssemblies` and category definitions), Story 9.3 (constraint level affects compass display)
- Technical approach: CompassRadial uses SVG paths for the donut segments — no chart library required (reduces bundle size). Category data comes from template's `gapDetectionRules` grouped by `category` field. Available Assemblies logic: from template's `availableAssemblies` config, each Assembly has a `requiredCompleteness` threshold — show if `overallPercentage >= threshold`. Auto-refresh: use `setInterval` with 30s in Zustand store for periodic `compass.getData` refetch, cleared when component unmounts.

## References
- Epic 9: Projects & Domain Templates
- FR70: Completeness Compass with radial visualization
- FR71: Freeform mode Compass shows available Assemblies only
- UX-DR14: CompletenessCompass — collapsed and expanded states
- NFR14: Compass invocable on-demand and auto-refreshes
- NFR24: Non-interrupting notification policy
- Related: Story 9.4 (Gap Detection data source), Story 9.7 (Compass mini indicators in Project Dashboard), Story 9.3 (constraint level integration)
