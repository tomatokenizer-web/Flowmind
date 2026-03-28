import { useEffect } from "react";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";

interface ShortcutOptions {
  enabled?: boolean;
}

/**
 * Registers global keyboard shortcuts for the application.
 * Should be mounted once at the app layout level.
 */
export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Don't intercept shortcuts when typing in inputs
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd/Ctrl+K -> toggle command palette (always active)
      if (mod && e.key === "k") {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
        return;
      }

      // Escape -> close command palette, clear selection, close panels
      if (e.key === "Escape") {
        const cmdPalette = useCommandPaletteStore.getState();
        if (cmdPalette.open) {
          cmdPalette.setOpen(false);
          return;
        }

        const selection = useUnitSelectionStore.getState();
        if (selection.selectedUnitIds.size > 0) {
          selection.clearSelection();
          return;
        }

        const workspace = useWorkspaceStore.getState();
        if (workspace.rightPanelOpen) {
          workspace.setRightPanelContent(null);
          return;
        }
        return;
      }

      // Skip remaining shortcuts if typing in an input
      if (isInput) return;

      // Cmd/Ctrl+\ -> toggle sidebar
      if (mod && e.key === "\\") {
        e.preventDefault();
        useWorkspaceStore.getState().toggleSidebar();
        return;
      }

      // Cmd/Ctrl+Shift+G -> toggle graph panel
      if (mod && e.shiftKey && e.key === "G") {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        ws.setRightPanelContent(
          ws.rightPanelContent === "graph" ? null : "graph",
        );
        return;
      }

      // Cmd/Ctrl+Shift+I -> toggle inspector panel
      if (mod && e.shiftKey && e.key === "I") {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        ws.setRightPanelContent(
          ws.rightPanelContent === "inspector" ? null : "inspector",
        );
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
