"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import { useLayoutStore } from "~/stores/layout-store";
import { useCaptureStore } from "~/stores/capture-store";
import { usePanelStore } from "~/stores/panel-store";
import { useFocusModeStore } from "~/stores/focusModeStore";
import { useUnitLifecycle } from "~/hooks/use-unit-lifecycle";
import { useUndoRedo } from "~/hooks/use-undo-redo";
import { announceToScreenReader } from "~/lib/accessibility";
import { toast } from "~/lib/toast";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { openCommandPalette } from "~/components/search";
import { api } from "~/trpc/react";
import type { UndoEntry } from "~/lib/undo-actions";

/**
 * Registers all global keyboard shortcuts and renders the help overlay.
 * Mounted once in the app layout.
 */
export function GlobalKeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const router = useRouter();
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const captureToggle = useCaptureStore((s) => s.toggle);
  const captureToggleMode = useCaptureStore((s) => s.toggleMode);
  const captureIsOpen = useCaptureStore((s) => s.isOpen);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const toggleFocusMode = useFocusModeStore((s) => s.toggleFocusMode);

  // Lifecycle transitions for D/P/C shortcuts
  const { transition: lifecycleTransition } = useUnitLifecycle({
    onSuccess: (unitId, newState) => {
      announceToScreenReader(`Unit transitioned to ${newState}`);
    },
    onError: (_error) => {
      toast.error("Lifecycle transition failed");
    },
  });

  // Undo/redo system — wired into the global undo store
  const { handleUndo, handleRedo } = useUndoRedo({
    onUndo: (entry: UndoEntry) => {
      announceToScreenReader(`Undone: ${entry.action.description}`);
    },
    onRedo: (entry: UndoEntry) => {
      announceToScreenReader(`Redone: ${entry.action.description}`);
    },
    // Disable the hook's own keydown listener — we register via the shortcut system instead
    disabled: true,
  });

  // Fetch the selected unit data for lifecycle key shortcuts
  const { data: selectedUnit } = api.unit.getById.useQuery(
    { id: selectedUnitId! },
    { enabled: !!selectedUnitId },
  );

  const shortcuts = React.useMemo(
    () => [
      {
        id: "command-palette",
        label: "Command Palette",
        keys: "mod+k",
        group: "General",
        global: true,
        action: () => {
          openCommandPalette();
          announceToScreenReader("Command palette opened");
        },
      },
      {
        id: "capture-mode",
        label: "New Thought",
        keys: "mod+n",
        group: "General",
        global: true,
        action: () => {
          captureToggle();
          announceToScreenReader(
            captureIsOpen ? "Capture mode closed" : "Capture mode activated",
          );
        },
      },
      {
        id: "capture-organize-toggle",
        label: "Toggle Organize Mode",
        keys: "mod+shift+n",
        group: "General",
        global: true,
        action: () => {
          if (!captureIsOpen) {
            useCaptureStore.getState().open();
            useCaptureStore.getState().setMode("organize");
            announceToScreenReader("Organize mode activated");
          } else {
            captureToggleMode();
            const newMode = useCaptureStore.getState().mode;
            announceToScreenReader(
              `Switched to ${newMode === "capture" ? "Capture" : "Organize"} mode`,
            );
          }
        },
      },
      {
        id: "view-canvas",
        label: "Canvas View",
        keys: "mod+1",
        group: "Navigation",
        action: () => {
          setViewMode("canvas");
          announceToScreenReader("Switched to Canvas view");
        },
      },
      {
        id: "view-graph",
        label: "Graph View",
        keys: "mod+2",
        group: "Navigation",
        action: () => {
          setViewMode("graph");
          announceToScreenReader("Switched to Graph view");
        },
      },
      {
        id: "view-thread",
        label: "Thread View",
        keys: "mod+3",
        group: "Navigation",
        action: () => {
          setViewMode("thread");
          announceToScreenReader("Switched to Thread view");
        },
      },
      {
        id: "view-assembly",
        label: "Assembly View",
        keys: "mod+4",
        group: "Navigation",
        action: () => {
          setViewMode("assembly");
          announceToScreenReader("Switched to Assembly view");
        },
      },
      // ── Lifecycle transition shortcuts (require selected unit) ──
      {
        id: "lifecycle-draft",
        label: "Set Draft (selected unit)",
        keys: "d",
        group: "Lifecycle",
        action: () => {
          if (!selectedUnitId || !selectedUnit) {
            announceToScreenReader("No unit selected");
            return;
          }
          if (selectedUnit.lifecycle === "draft") {
            announceToScreenReader("Unit is already Draft");
            return;
          }
          void lifecycleTransition(
            selectedUnitId,
            "draft",
            selectedUnit.content?.slice(0, 40),
            selectedUnit.lifecycle,
          );
        },
      },
      {
        id: "lifecycle-pending",
        label: "Set Pending (selected unit)",
        keys: "p",
        group: "Lifecycle",
        action: () => {
          if (!selectedUnitId || !selectedUnit) {
            announceToScreenReader("No unit selected");
            return;
          }
          if (selectedUnit.lifecycle === "pending") {
            announceToScreenReader("Unit is already Pending");
            return;
          }
          void lifecycleTransition(
            selectedUnitId,
            "pending",
            selectedUnit.content?.slice(0, 40),
            selectedUnit.lifecycle,
          );
        },
      },
      {
        id: "lifecycle-confirmed",
        label: "Set Confirmed (selected unit)",
        keys: "c",
        group: "Lifecycle",
        action: () => {
          if (!selectedUnitId || !selectedUnit) {
            announceToScreenReader("No unit selected");
            return;
          }
          if (selectedUnit.lifecycle === "confirmed") {
            announceToScreenReader("Unit is already Confirmed");
            return;
          }
          void lifecycleTransition(
            selectedUnitId,
            "confirmed",
            selectedUnit.content?.slice(0, 40),
            selectedUnit.lifecycle,
          );
        },
      },
      // ── Undo / Redo ──
      {
        id: "undo",
        label: "Undo",
        keys: "mod+z",
        group: "General",
        global: true,
        action: () => {
          handleUndo();
        },
      },
      {
        id: "redo",
        label: "Redo",
        keys: "mod+shift+z",
        group: "General",
        global: true,
        action: () => {
          handleRedo();
        },
      },
      // ── Focus mode ──
      {
        id: "focus-mode-toggle",
        label: "Toggle Focus Mode",
        keys: "ctrl+shift+f",
        group: "General",
        global: true,
        action: () => {
          toggleFocusMode();
          const newState = useFocusModeStore.getState().focusMode;
          announceToScreenReader(
            newState ? "Focus mode enabled" : "Focus mode disabled",
          );
        },
      },
      {
        id: "close-overlay",
        label: "Close Overlay",
        keys: "Escape",
        group: "General",
        global: true,
        action: () => {
          // Escape is handled locally by each overlay/dialog via focus trap.
          // This registration is for the help overlay listing only.
        },
      },
      {
        id: "open-settings",
        label: "Open Settings",
        keys: "mod+,",
        group: "Navigation",
        global: true,
        action: () => {
          router.push("/settings");
          announceToScreenReader("Navigating to settings");
        },
      },
      {
        id: "shortcut-help",
        label: "Keyboard Shortcuts",
        keys: "mod+/",
        group: "General",
        global: true,
        action: () => {
          setHelpOpen((prev) => !prev);
        },
      },
    ],
    [
      setViewMode,
      captureToggle,
      captureToggleMode,
      captureIsOpen,
      selectedUnitId,
      selectedUnit,
      lifecycleTransition,
      handleUndo,
      handleRedo,
      toggleFocusMode,
      router,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
  );
}
