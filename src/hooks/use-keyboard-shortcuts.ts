"use client";

import { useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { isMac } from "~/lib/accessibility";

/* ── Types ── */

export interface KeyboardShortcut {
  /** Unique id, e.g. "command-palette" */
  id: string;
  /** Human-readable label shown in help overlay */
  label: string;
  /** Keys: use "mod" for Cmd/Ctrl. e.g. "mod+k", "Escape", "mod+1" */
  keys: string;
  /** Handler invoked when the shortcut fires */
  action: () => void;
  /** Group label for the help overlay (e.g. "Navigation", "General") */
  group?: string;
  /** If true, shortcut is active even when an input/textarea is focused */
  global?: boolean;
}

/* ── Registry (singleton, lives outside React) ── */

type Listener = () => void;

const shortcuts = new Map<string, KeyboardShortcut>();
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((fn) => fn());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Stable snapshot — new reference on every change so useSyncExternalStore detects updates
let cachedSnapshot: ReadonlyMap<string, KeyboardShortcut> = new Map();

// Server snapshot must be a stable reference (never changes on server)
const SERVER_SNAPSHOT: ReadonlyMap<string, KeyboardShortcut> = new Map();

function getSnapshot(): ReadonlyMap<string, KeyboardShortcut> {
  return cachedSnapshot;
}

function getServerSnapshot(): ReadonlyMap<string, KeyboardShortcut> {
  return SERVER_SNAPSHOT;
}

export function registerShortcut(shortcut: KeyboardShortcut): () => void {
  shortcuts.set(shortcut.id, shortcut);
  cachedSnapshot = new Map(shortcuts);
  emitChange();
  return () => {
    shortcuts.delete(shortcut.id);
    cachedSnapshot = new Map(shortcuts);
    emitChange();
  };
}

/* ── Hook: access the registry reactively ── */

export function useShortcutRegistry(): ReadonlyMap<string, KeyboardShortcut> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ── Hook: register + listen for keyboard shortcuts ── */

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function matchesShortcut(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split("+");
  const modRequired = parts.includes("mod");
  const shiftRequired = parts.includes("shift");
  const altRequired = parts.includes("alt");

  const key = parts.filter((p) => !["mod", "shift", "alt"].includes(p))[0];
  if (!key) return false;

  const modPressed = isMac() ? e.metaKey : e.ctrlKey;
  if (modRequired !== modPressed) return false;
  if (shiftRequired !== e.shiftKey) return false;
  if (altRequired !== e.altKey) return false;

  // Handle number keys: e.key for "1" through "9"
  if (e.key.toLowerCase() === key) return true;
  // Handle "/" which may need special handling
  if (key === "/" && e.key === "/") return true;

  return false;
}

/**
 * Registers an array of keyboard shortcuts and handles keydown events.
 * Shortcuts are automatically cleaned up on unmount.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { id: "palette", label: "Command Palette", keys: "mod+k", action: openPalette, group: "General" },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  defs: KeyboardShortcut[],
  enabled = true,
): void {
  const defsRef = useRef(defs);
  defsRef.current = defs;

  // Register all shortcuts in the global registry
  useEffect(() => {
    if (!enabled) return;
    const unregisters = defsRef.current.map((s) => registerShortcut(s));
    return () => unregisters.forEach((fn) => fn());
  }, [enabled, defs]);

  // Listen for keydown events
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of defsRef.current) {
        if (matchesShortcut(e, shortcut.keys)) {
          // Skip non-global shortcuts when focus is in an editable field
          if (!shortcut.global && isEditableTarget(e.target)) continue;

          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [enabled]);
}
