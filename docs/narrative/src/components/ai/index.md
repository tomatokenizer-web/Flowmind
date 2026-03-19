# AI Components Module Index

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/ai/index.ts`
> **Status**: Active

---

## Context & Purpose

This barrel export file serves as the public interface for Flowmind's AI transparency and interaction components. It exists to simplify imports across the application -- instead of consumers needing to know the exact file structure inside the `ai/` folder, they can import everything they need from a single path: `~/components/ai`.

**Business Need**: AI assistance in Flowmind is meant to be transparent, not hidden. This module groups all AI-related UI components in one place, making it easy for other parts of the application to integrate AI visibility features consistently. The components exported here share a common purpose: showing users exactly how AI participates in their knowledge work.

**When Used**:
- **Any component importing AI widgets**: Pages, layouts, or feature components that need to display AI suggestions or contribution metrics
- **Build time**: The bundler uses this as the entry point for tree-shaking unused exports
- **IDE navigation**: Developers can jump to the index to see all available AI components at a glance

---

## Microscale: Direct Relationships

### Re-exports (What This Provides)

| Export | Source File | Purpose |
|--------|-------------|---------|
| `ContributionTransparency` | `./contribution-transparency.tsx` | Visual indicator showing human vs AI contribution ratio |
| `AISuggestionCard` | `./ai-suggestion-card.tsx` | Interactive card displaying AI type/relation suggestions with accept/dismiss actions |
| `AIInferenceBadge` | `./ai-suggestion-card.tsx` | Small inline badge indicating AI-generated values |

### Dependencies (What This Needs)

- `./contribution-transparency.tsx`: The component file containing the human-AI balance visualization. Itself depends on tRPC for data fetching and Popover for the breakdown display.

- `./ai-suggestion-card.tsx`: The component file containing both suggestion cards and inference badges. Uses Framer Motion for animations and lucide-react for icons.

### Dependents (What Needs This)

Currently, the AI components are defined but not yet integrated into higher-level views. Planned consumers include:

- **Context Canvas** (planned): Will import `ContributionTransparency` for the toolbar header
- **Unit Detail Panel** (planned): Will import `AISuggestionCard` to show type inference suggestions
- **Unit Type Badges** (planned): Will import `AIInferenceBadge` to mark AI-inferred values
- **Dashboard Cards** (planned): Will import `ContributionTransparency` (compact variant) for project overview

### Data Flow

```
Consumer component imports from "~/components/ai"
    |
    v
TypeScript/bundler resolves to this index.ts
    |
    v
Re-exports point to actual implementation files
    |
    v
Tree-shaking removes unused exports at build time
    |
    v
Consumer receives only the components it imported
```

---

## Macroscale: System Integration

### Architectural Layer

This index operates as a **module boundary** at **Layer 4 (Feature Components)** in Flowmind's frontend architecture:

- **Layer 5: Pages** (route-level containers)
- **Layer 4: Feature Components** -- **You are here** (AI module public interface)
- **Layer 3: Domain Components** (Unit cards, Relation lines)
- **Layer 2: Composite UI** (Popover, Dialog, Command)
- **Layer 1: Primitive UI** (Button, Input, Badge)

The `ai/` folder represents a cohesive feature module. This index defines what that module exposes to the rest of the application.

### Big Picture Impact

This module boundary enables:

- **Encapsulation**: Internal implementation details (helper functions, sub-components like `ContributionBreakdown`) stay hidden
- **Refactorability**: File restructuring inside `ai/` does not break external imports as long as the index re-exports remain stable
- **Discoverability**: All AI components are colocated -- developers know where to look for AI-related UI
- **Consistent AI presence**: Every AI transparency feature comes from the same module, ensuring consistent styling and behavior

**Design Philosophy Connection**:
Flowmind distinguishes AI assistance from core knowledge operations. The `ai/` module boundary reinforces this separation -- AI is a helper layer, not embedded invisibly throughout the codebase.

### Critical Path Analysis

**Importance Level**: Structural (module organization), Non-blocking (no runtime logic)

- **If this file is deleted**: All imports from `~/components/ai` break -- easy to detect, easy to fix
- **If an export is removed**: TypeScript compilation fails where that component was used -- clear feedback loop
- **No runtime behavior**: This file is purely a compile-time organizational tool. It adds zero bytes to production bundles (re-exports are resolved statically)

---

## Technical Concepts (Plain English)

### Barrel Export Pattern

**Technical**: A TypeScript/JavaScript pattern where an `index.ts` file re-exports symbols from multiple files within a directory, allowing consumers to import from the directory path rather than individual files.

**Plain English**: Think of it like a reception desk. Instead of visitors wandering the building looking for specific offices, they go to the front desk and say "I need X." The desk directs them (or delivers what they need). This index file is that desk for the `ai/` folder.

**Why We Use It**: Cleaner imports (`~/components/ai` instead of `~/components/ai/contribution-transparency`), easier refactoring, and clear module boundaries.

### Tree-Shaking

**Technical**: A bundler optimization where unused exports are eliminated from the final production build, reducing bundle size.

**Plain English**: If you only import `AISuggestionCard` from this module, the bundler will not include `ContributionTransparency` in your production code. It "shakes off" the unused branches.

**Why It Matters Here**: Even though this index re-exports everything, consumers only pay for what they use. The barrel pattern does not bloat bundles when tree-shaking is enabled (Flowmind uses Next.js with webpack/turbopack, both support this).

### Named vs Default Exports

**Technical**: This file uses named exports (`export { X }`) rather than a default export. Each component is individually importable by name.

**Plain English**: Like a toolbox where each tool has a label. You can take exactly the tools you need by name, rather than getting "the tool" (singular) and figuring out which one it is.

**Why We Use It**: Named exports work better with tree-shaking, produce clearer import statements, and make it obvious what a module provides.

---

## Module Contents Summary

### ContributionTransparency

A visual indicator displaying the ratio of human-written vs AI-generated content in a context. Available in "bar" (full progress bar with legend) and "compact" (minimal percentage badge) variants. Includes a popover breakdown showing exact counts. Displays a warning when AI contribution exceeds 40%.

See: [contribution-transparency.md](./contribution-transparency.md)

### AISuggestionCard

An interactive card component that presents AI-inferred suggestions (type classifications, relation proposals) with confidence scores. Users can view the AI's reasoning, then accept or dismiss the suggestion. Uses animated transitions for a polished interaction feel.

### AIInferenceBadge

A minimal inline badge (pill-shaped, with sparkle icon) that marks values as AI-suggested. Used alongside form fields or labels where the displayed value came from AI inference rather than direct user input.

---

## Change History

### 2026-03-19 - Initial Module Setup (Story 5.11)
- **What Changed**: Created barrel export index for AI components module, re-exporting ContributionTransparency, AISuggestionCard, and AIInferenceBadge
- **Why**: Story 5.11 establishes the AI transparency UI layer. This index provides a clean import path for all AI-related components.
- **Impact**: Consumers can now import AI components from `~/components/ai` without knowing internal file structure
