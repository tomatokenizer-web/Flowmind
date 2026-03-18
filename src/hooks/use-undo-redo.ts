"use client";

import { useEffect, useCallback } from "react";
import { useUndoStore } from "~/stores/undo-store";
import type { UndoEntry } from "~/lib/undo-actions";

interface UseUndoRedoOptions {
  /** Called when an undo is performed — execute the reverse operation */
  onUndo?: (entry: UndoEntry) => void;
  /** Called when a redo is performed — re-execute the operation */
  onRedo?: (entry: UndoEntry) => void;
  /** Disable keyboard shortcuts (e.g. when an input is focused) */
  disabled?: boolean;
}

/**
 * Hook that registers Cmd+Z / Cmd+Shift+Z keyboard shortcuts
 * for undo/redo and calls the provided handlers.
 */
export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { onUndo, onRedo, disabled = false } = options;
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const canUndo = useUndoStore((s) => s.canUndo);
  const canRedo = useUndoStore((s) => s.canRedo);
  const pushAction = useUndoStore((s) => s.pushAction);

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) onUndo?.(entry);
  }, [undo, onUndo]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) onRedo?.(entry);
  }, [redo, onRedo]);

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Ignore when typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "z" && e.shiftKey) {
        // Cmd+Shift+Z → Redo
        e.preventDefault();
        handleRedo();
      } else if (e.key === "z") {
        // Cmd+Z → Undo
        e.preventDefault();
        handleUndo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, handleUndo, handleRedo]);

  return {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    pushAction,
  };
}
