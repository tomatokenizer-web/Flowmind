# Story 6.9: Relation Type Glossary

**Status: pending**

## Description
As a user,
I want an always-accessible glossary of all relation types with descriptions and examples,
So that I understand the meaning of each relation type when building connections between my thoughts.

## Acceptance Criteria

**Given** the system has 23 system relation types and potentially custom types
**When** the user clicks the "Relation Types" help icon (accessible from Graph View toolbar, Context Dashboard, and Unit Detail Panel Relations tab)
**Then** a glossary panel/popover opens showing all available relation types per NFR15

**Given** the glossary is open
**When** the user views it
**Then** relation types are grouped by category: Argument-centered (8), Creative/Research (7), Structure/Containment (8)
**And** each entry shows: type name, icon, color, direction description, and a one-line usage example
**And** custom relation types (if any) are shown in a separate "Custom" section

**Given** the glossary is open
**When** the user searches within it
**Then** a filter input narrows the list by type name or description

**Given** the glossary
**When** it is rendered
**Then** it is keyboard navigable (Tab through entries, Escape to close)
**And** screen readers can access all type descriptions via ARIA labels

## Tasks
- [ ] Create `components/shared/RelationTypeGlossary.tsx` with grouped type list
- [ ] Create `components/shared/RelationTypeEntry.tsx` for individual type display
- [ ] Add glossary trigger button to Graph View toolbar
- [ ] Add glossary trigger to Context Dashboard help section
- [ ] Add glossary trigger to Unit Detail Panel Relations tab header
- [ ] Create relation type descriptions data file `lib/relationTypeDescriptions.ts`
- [ ] Add filter/search input within glossary
- [ ] Add keyboard navigation and ARIA labels
- [ ] Write unit tests for glossary rendering and filtering

## Dev Notes
- Key files: `components/shared/RelationTypeGlossary.tsx`, `lib/relationTypeDescriptions.ts`
- Dependencies: Story 4.2 (system relation types seeded)
- Technical approach: Use Radix Popover for the glossary container. Relation type data comes from the SystemRelationType table (already seeded) enriched with static descriptions from a local data file. The glossary is a read-only reference view.

## References
- NFR15: Relation Type Glossary must be accessible from within the app at any time
- Epic 6: Navigation, Search & Discovery
- Related: Story 4.1 (Relation API), Story 4.2 (System relation types)
