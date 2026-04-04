"use client";

import { useEffect, useRef } from "react";
import { getFocusableElements } from "~/lib/accessibility";

interface UseFocusTrapOptions {
  /** Whether the trap is currently active */
  active: boolean;
  /** Called when the user presses Escape inside the trap */
  onEscape?: () => void;
  /** If true, return focus to the previously focused element on deactivate */
  returnFocus?: boolean;
  /** Initial element to focus when the trap activates (selector or element) */
  initialFocus?: string | HTMLElement;
}

/**
 * Traps keyboard focus within a container element.
 * Tab and Shift+Tab cycle through focusable children.
 * Escape optionally calls `onEscape`.
 *
 * @returns A ref to attach to the container element.
 *
 * @example
 * ```tsx
 * const trapRef = useFocusTrap({ active: isOpen, onEscape: close, returnFocus: true });
 * return <div ref={trapRef}>…</div>;
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions,
) {
  const { active, onEscape, returnFocus = true, initialFocus } = options;
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save + restore focus
  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Move focus into the trap
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      let target: HTMLElement | null = null;

      if (initialFocus) {
        target =
          typeof initialFocus === "string"
            ? container.querySelector<HTMLElement>(initialFocus)
            : initialFocus;
      }

      if (!target) {
        const focusable = getFocusableElements(container);
        target = focusable[0] ?? container;
      }

      if (target && !target.hasAttribute("tabindex") && target.tabIndex < 0) {
        target.setAttribute("tabindex", "-1");
      }
      target?.focus();
    });

    return () => {
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [active, returnFocus, initialFocus]);

  // Trap Tab + handle Escape
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);

  return containerRef;
}
