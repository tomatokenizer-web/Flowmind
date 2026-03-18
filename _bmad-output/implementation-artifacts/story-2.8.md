# Story 2.8: Unit Detail Panel with Tabbed Layout

Status: ready-for-dev

## Story

As a user,
I want a comprehensive detail panel for any Unit where I can edit content, view metadata, manage relations, and see AI suggestions,
So that I have full control over every aspect of my thoughts in one place.

## Acceptance Criteria

1. **Given** a Unit is selected in any view, **When** the Unit Detail Panel opens (360px slide-in from the right), **Then** it displays 4 tabs: Content, Relations (placeholder), Metadata, AI (placeholder) per UX-DR32
2. The Content tab shows inline-editable content (using Tiptap 3.x rich text editor), unit type selector dropdown, and lifecycle controls (Draft/Pending/Confirmed buttons)
3. The Metadata tab shows: creation date, last modified, origin_type, source_span, version count, lifecycle state, and all FR73 metadata fields that are populated
4. The Relations tab shows a list of connected Units (placeholder — populated in Epic 4)
5. The AI tab shows AI suggestions (placeholder — populated in Epic 5)
6. The panel slides in with 300ms animation per UX-DR42
7. The panel has a close button and responds to Escape key per UX-DR53
8. At tablet breakpoint (768px–1023px), the panel opens as a full-screen overlay per UX-DR49

## Tasks / Subtasks

- [ ] Task 1: Create UnitDetailPanel container (AC: #1, #6, #7)
  - [ ] Create `src/components/panels/UnitDetailPanel.tsx`
  - [ ] Implement 360px slide-in from right with 300ms ease animation
  - [ ] Add close button (X icon) in top-right
  - [ ] Handle Escape key to close
  - [ ] Add backdrop overlay (semi-transparent) for tablet mode
  - [ ] Manage open/close state via Zustand store
- [ ] Task 2: Implement tab system (AC: #1)
  - [ ] Create tab bar with 4 tabs: Content, Relations, Metadata, AI
  - [ ] Use accessible tab pattern: `role="tablist"`, `role="tab"`, `role="tabpanel"`
  - [ ] Keyboard navigation: arrow keys to switch tabs
  - [ ] Persist active tab in panel state
- [ ] Task 3: Implement Content tab (AC: #2)
  - [ ] Initialize Tiptap 3.x editor with unit content
  - [ ] Configure basic extensions: StarterKit (bold, italic, lists, headings)
  - [ ] Auto-save on blur or after 1s debounce of inactivity
  - [ ] Integrate UnitTypeSelector dropdown (from Story 2.2)
  - [ ] Integrate lifecycle control buttons (Draft/Pending/Confirmed from Story 2.5)
  - [ ] Show character count and word count
- [ ] Task 4: Implement Metadata tab (AC: #3)
  - [ ] Show creation date (absolute + relative)
  - [ ] Show last modified date
  - [ ] Show origin_type with human-readable label
  - [ ] Show source_span details (if populated)
  - [ ] Show version count with link to History tab (Story 2.7)
  - [ ] Show lifecycle state badge
  - [ ] Show ai_trust_level indicator
  - [ ] Show any populated FR73 metadata fields
- [ ] Task 5: Create Relations tab placeholder (AC: #4)
  - [ ] Show empty state: "Relations will appear here when you connect this Unit to others"
  - [ ] Include illustration or icon
  - [ ] Add "Learn about Relations" link placeholder
- [ ] Task 6: Create AI tab placeholder (AC: #5)
  - [ ] Show empty state: "AI suggestions will appear here as you build your knowledge"
  - [ ] Include illustration or icon
  - [ ] Show branch potential placeholder (●●●○)
- [ ] Task 7: Implement responsive behavior (AC: #8)
  - [ ] At desktop (≥1024px): 360px slide-in panel alongside content
  - [ ] At tablet (768px–1023px): full-screen overlay with backdrop
  - [ ] At mobile (<768px): full-screen overlay
  - [ ] Use CSS media queries or Tailwind responsive utilities
- [ ] Task 8: Create Zustand store for panel state
  - [ ] Create `src/stores/panelStore.ts`
  - [ ] Track: `isOpen`, `selectedUnitId`, `activeTab`
  - [ ] Actions: `openPanel(unitId)`, `closePanel()`, `setActiveTab(tab)`
- [ ] Task 9: Write tests
  - [ ] Test panel opens with slide-in animation
  - [ ] Test all 4 tabs render correct content
  - [ ] Test Tiptap editor loads and saves content
  - [ ] Test Escape key and close button
  - [ ] Test responsive behavior at different breakpoints
  - [ ] Test tab keyboard navigation

## Dev Notes

- Tiptap 3.x is already installed (Story 1.1) — initialize with StarterKit for basic formatting
- The panel should not unmount when closed — use CSS transform for the slide animation to preserve editor state
- Auto-save via debounced mutation prevents data loss while avoiding excessive API calls
- Relations and AI tabs are placeholders now — design the tab system to be extensible so new content can be added without structural changes
- The 360px width is from the UX spec — at smaller screens it becomes full-width
- Consider adding a resize handle for desktop users to adjust panel width (future enhancement)

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Zustand for panel state
- [Source: _bmad-output/planning-artifacts/architecture.md] — Tiptap 3.x for rich text editing
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.8] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR32: Detail panel tabbed layout
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR42: Animation timing (300ms slide-in)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR49: Responsive breakpoints
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR53: Panel close behavior
