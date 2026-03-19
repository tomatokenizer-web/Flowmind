"use client";

import * as React from "react";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import { useLayoutStore } from "~/stores/layout-store";
import { useCaptureStore } from "~/stores/capture-store";
import { announceToScreenReader } from "~/lib/accessibility";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { openCommandPalette } from "~/components/search";

/**
 * Registers all global keyboard shortcuts and renders the help overlay.
 * Mounted once in the app layout.
 */
export function GlobalKeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const captureToggle = useCaptureStore((s) => s.toggle);
  const captureToggleMode = useCaptureStore((s) => s.toggleMode);
  const captureIsOpen = useCaptureStore((s) => s.isOpen);

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
        id: "view-focus",
        label: "Focus View",
        keys: "mod+2",
        group: "Navigation",
        action: () => {
          setViewMode("focus");
          announceToScreenReader("Switched to Focus view");
        },
      },
      {
        id: "view-graph",
        label: "Graph View",
        keys: "mod+3",
        group: "Navigation",
        action: () => {
          setViewMode("graph");
          announceToScreenReader("Switched to Graph view");
        },
      },
      {
        id: "view-4",
        label: "View 4",
        keys: "mod+4",
        group: "Navigation",
        action: () => {
          // Placeholder for a fourth view
          announceToScreenReader("View 4 (placeholder)");
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
    [setViewMode, captureToggle, captureToggleMode, captureIsOpen],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
  );
}
