# Onboarding Project Bridge

> **Last Updated**: 2026-03-22
> **Code Location**: `src/components/onboarding/onboarding-project-bridge.tsx`
> **Status**: Active

---

## Context & Purpose

This component exists to solve a timing and dependency problem between two parts of the application: the onboarding overlay (which needs a `projectId` to function) and the project context (which provides that `projectId` asynchronously). The OnboardingOverlay component requires a valid `projectId` as a prop, but that value only becomes available after the ProjectProvider has finished loading the user's default project from the server.

**Business Need**: New users must see a guided onboarding experience (first-capture screen, tooltip tour, AI hints) the first time they use the app. This experience is project-scoped, meaning the system needs to know which project to associate with the user's first actions. The bridge ensures the onboarding UI never appears in a broken or incomplete state -- it waits until a project is ready before rendering anything.

**When Used**: On every authenticated page load. The bridge is mounted inside the app layout and runs silently in the background. For most returning users, it resolves the project, passes it to OnboardingOverlay, and the overlay itself renders nothing (because onboarding is already complete). For first-time users, this is the component that gates the onboarding flow until the project context is ready.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/contexts/project-context.tsx`: `useProjectId()` -- retrieves the currently active project ID from React context
- `src/contexts/project-context.tsx`: `useProjectLoading()` -- checks whether the project is still being fetched from the server
- `src/components/onboarding/onboarding-overlay.tsx`: `OnboardingOverlay` -- the full onboarding orchestration component that this bridge conditionally renders

### Dependents (What Needs This)
- `src/app/(app)/layout.tsx`: Mounts this component inside the `ProjectProvider` and `AppShell` wrapper, making it available on every authenticated route

### Data Flow

```
ProjectProvider (fetches default project from server)
    |
    v
useProjectId() --> projectId (string | undefined)
useProjectLoading() --> isLoading (boolean)
    |
    v
OnboardingProjectBridge (guards rendering)
    |
    +-- isLoading=true OR projectId=undefined --> renders null (nothing visible)
    +-- isLoading=false AND projectId exists --> renders <OnboardingOverlay projectId={projectId} />
```

---

## Macroscale: System Integration

### Architectural Layer

This component is a **glue layer** -- a thin adapter that sits between a context provider and a feature component. In the application's component hierarchy:

- **Layer 1**: `ProjectProvider` (context provider, wraps the entire authenticated app)
- **Layer 2**: `AppShell` (layout frame with sidebar, header, etc.)
- **Layer 3**: **This bridge** (adapter that extracts context and passes it as props) -- You are here
- **Layer 4**: `OnboardingOverlay` (feature component that orchestrates the onboarding flow)

The bridge pattern exists because `OnboardingOverlay` was designed to receive `projectId` as an explicit prop rather than consuming context directly. This keeps the overlay testable and decoupled from the specific context implementation, while the bridge handles the wiring.

### Big Picture Impact

Without this bridge, the onboarding system would need to either:
1. Consume the ProjectContext directly inside OnboardingOverlay (coupling it to a specific context shape), or
2. Be mounted only on specific pages that already have the projectId available (fragmenting the onboarding experience)

The bridge allows the onboarding overlay to remain a clean, prop-driven component while still being mounted at the layout level where it can appear on any page.

**What breaks if this fails**: The onboarding experience for new users would not appear. No crash would occur (the bridge simply renders null on failure), but first-time users would land on an empty dashboard with no guidance, significantly hurting activation and retention.

### Critical Path Analysis

**Importance Level**: Medium-High

This is not a runtime-critical component (the app functions without it), but it is **activation-critical**. The entire first-time user experience depends on this bridge correctly resolving the project and rendering the overlay. If it silently fails (e.g., `projectId` never resolves), new users get no onboarding -- a silent UX failure that is hard to detect without monitoring.

---

## Technical Concepts (Plain English)

### Bridge / Adapter Component
**Technical**: A component whose sole purpose is to translate between two interfaces -- extracting values from one source (context) and passing them as props to another component.

**Plain English**: Like a power adapter when you travel abroad. The wall outlet (ProjectContext) has one shape, and your device plug (OnboardingOverlay's props) has another. The bridge is the adapter that connects them so electricity flows.

**Why We Use It**: It keeps the OnboardingOverlay independent of how the project ID is provided. If the project source changes (e.g., from context to URL params), only the bridge needs updating.

### Conditional Rendering Guard
**Technical**: The `if (isLoading || !projectId) return null;` pattern that prevents rendering child components until prerequisites are met.

**Plain English**: Like a bouncer at a venue who checks your ID before letting you in. If the project data hasn't arrived yet (still loading) or doesn't exist (no project), the bouncer turns you away and nothing is shown.

**Why We Use It**: Prevents the OnboardingOverlay from receiving `undefined` as its projectId, which would cause broken API calls and a corrupted onboarding experience.

---

## Change History

### 2026-03-22 - Initial Documentation
- **What Changed**: Created narrative documentation for existing bridge component
- **Why**: Part of Shadow Map documentation initiative for the onboarding system
- **Impact**: Improves discoverability and understanding of the onboarding architecture
