# ConfirmDeleteDialog

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/dialogs/ConfirmDeleteDialog.tsx`
> **Status**: Active

---

## Context & Purpose

This component is a confirmation gate that prevents accidental unit deletion. Rather than immediately destroying data when a user clicks "delete," it presents a modal dialog that shows a preview of the content about to be removed and asks for explicit confirmation.

**Business Need**: Destructive actions in a knowledge management tool can cause significant frustration if triggered accidentally. Users need a safety net that lets them pause and verify before losing content, while still being able to recover via undo if they proceed.

**When Used**: Triggered whenever a user initiates deletion of a unit (the core content entity in FlowMind). The parent component controls visibility through the `open` and `onOpenChange` props, passing in the target unit's data and a callback to execute the actual deletion.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/components/ui/dialog.tsx`: Provides the **Radix UI Dialog primitives** (the underlying accessible modal infrastructure) -- Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
- `src/components/ui/button.tsx`: Provides styled Button component used for "Cancel" and "Delete" actions
- `src/stores/undo-store.ts`: **Zustand store** (a lightweight global state container) that manages the undo/redo stack -- specifically the `pushAction` method to record the deletion before it happens
- `src/lib/undo-actions.ts`: Defines the `UnitSnapshot` type that captures all the data needed to restore a deleted unit later

### Dependents (What Needs This)
- Currently not yet integrated into any parent component. Expected consumers are unit card components or context menus that offer a "Delete" action on individual units.

### Data Flow
```
Parent triggers open=true with unit data
    --> Dialog renders with content preview (first 80 chars)
    --> User confirms (click "Delete" or press Enter)
        --> Unit snapshot pushed to undo stack (preserving restoration data)
        --> onConfirm callback fires (parent handles actual API deletion)
        --> Dialog closes
    --> User cancels (click "Cancel", press Escape, or click overlay)
        --> Dialog closes, nothing happens
```

---

## Macroscale: System Integration

### Architectural Layer
This component sits in the **UI Safety Layer** of the application, between user intent and data mutation:
- **Layer 1**: User interaction (clicking delete on a unit card)
- **Layer 2**: This dialog (confirmation gate + undo preparation)
- **Layer 3**: Parent callback + API layer (actual deletion)
- **Layer 4**: Undo store (recovery mechanism if user changes their mind)

### Big Picture Impact
This dialog is part of FlowMind's **non-destructive editing philosophy**. It works in tandem with the undo system to ensure that users always have a path to recovery. The dialog itself does not perform the deletion -- it prepares the safety net (undo snapshot) and then delegates the actual mutation to the parent via `onConfirm`. This separation of concerns means the dialog remains reusable regardless of how deletion is implemented (optimistic UI, server-first, batch operations, etc.).

### Critical Path Analysis
**Importance Level**: Medium-High
- If this component is bypassed, units could be deleted without undo snapshots being captured, making recovery impossible.
- The undo snapshot is pushed **before** `onConfirm` fires -- this ordering is critical. If the deletion API call succeeds but the snapshot was never saved, the user loses their safety net.
- The dialog is not on the critical rendering path (it only mounts when deletion is requested), so it has zero performance impact during normal browsing.

---

## Technical Concepts (Plain English)

### Controlled Dialog (open/onOpenChange pattern)
**Technical**: The dialog's visibility is managed externally via React **controlled component** props rather than internal state.
**Plain English**: The parent component holds the "light switch" for this dialog. The dialog itself never decides when to appear or disappear -- it just follows instructions. This makes it predictable and testable.
**Why We Use It**: Allows the parent to coordinate dialog visibility with other UI state (e.g., disabling background interactions, tracking which unit is selected for deletion).

### Undo Stack (pushAction before mutation)
**Technical**: Before executing the destructive operation, the component captures a **UnitSnapshot** (a serializable record of the unit's current state) and pushes it onto a **Zustand-managed undo stack** (a global, in-memory list of reversible actions).
**Plain English**: Like photocopying a document before shredding it -- the copy goes into a filing cabinet (the undo stack) so you can reconstruct the original if needed.
**Why We Use It**: Enables "Ctrl+Z" style undo for deletions. The snapshot contains everything needed to recreate the unit: its content, type, lifecycle stage, and project association.

### Keyboard Interaction (Enter to confirm, Escape to cancel)
**Technical**: A **keyDown event handler** on the DialogContent intercepts the Enter key to trigger confirmation. Escape is handled natively by the Radix Dialog primitive.
**Plain English**: Power users can confirm deletion by pressing Enter without reaching for the mouse. Pressing Escape dismisses the dialog safely, which is the standard expectation for modal windows.
**Why We Use It**: Accessibility and efficiency. Keyboard-driven workflows are faster, and matching platform conventions (Escape = cancel) reduces cognitive load.

### Content Preview Truncation
**Technical**: The unit's content string is truncated to 80 characters with an ellipsis appended if it exceeds that length.
**Plain English**: Like a newspaper headline that gives you enough of the story to know which article it is, without showing the whole thing. Keeps the dialog compact while still letting users verify they are deleting the right unit.
**Why We Use It**: Units can contain arbitrarily long text. Without truncation, a long unit would blow out the dialog layout.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created ConfirmDeleteDialog with Radix Dialog primitives, undo stack integration, content preview, and keyboard shortcuts
- **Why**: Units needed a safe, recoverable deletion flow as part of the broader undo/redo system
- **Impact**: Enables non-destructive unit deletion across the application once integrated into unit card and context menu components
