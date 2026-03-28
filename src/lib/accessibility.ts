/**
 * Accessibility utilities for Flowmind.
 *
 * Provides screen reader announcements, focus management,
 * and platform detection helpers.
 */

/* ── Live Region Announcer ── */

// eslint-disable-next-line prefer-const
let liveRegion: HTMLElement | null = null;

function getOrCreateLiveRegion(
  politeness: "polite" | "assertive" = "polite",
): HTMLElement {
  const id = `flowmind-live-${politeness}`;
  const existing = document.getElementById(id);
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = id;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  Object.assign(el.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });
  document.body.appendChild(el);
  return el;
}

/**
 * Announce a message to screen readers via an ARIA live region.
 *
 * @param message - The text to announce
 * @param politeness - "polite" (default) or "assertive" for urgent messages
 */
export function announceToScreenReader(
  message: string,
  politeness: "polite" | "assertive" = "polite",
): void {
  const region = getOrCreateLiveRegion(politeness);
  // Clear then set after a tick so repeated identical messages are still announced
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/* ── Focus Management ── */

/**
 * Move focus to a specific element, optionally scrolling it into view.
 */
export function manageFocus(
  target: HTMLElement | string,
  options?: { scroll?: boolean; preventScroll?: boolean },
): void {
  const el =
    typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;

  // Make non-focusable elements temporarily focusable
  if (!el.hasAttribute("tabindex") && el.tabIndex < 0) {
    el.setAttribute("tabindex", "-1");
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }

  el.focus({ preventScroll: options?.preventScroll });

  if (options?.scroll) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * Get all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.closest("[inert]") && el.offsetParent !== null,
  );
}

/* ── Platform Detection ── */

/**
 * Returns true if the user is on macOS / iOS.
 * Used to display ⌘ vs Ctrl in shortcut labels.
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  // Modern API first
  if ("userAgentData" in navigator) {
    const uad = navigator as Navigator & {
      userAgentData?: { platform: string };
    };
    if (uad.userAgentData?.platform) {
      return uad.userAgentData.platform === "macOS";
    }
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");
}

/**
 * Return the platform-appropriate modifier key label.
 */
export function modifierKey(): string {
  return isMac() ? "⌘" : "Ctrl";
}

/**
 * Format a shortcut for display (e.g., "mod+k" → "⌘K" or "Ctrl+K").
 */
export function formatShortcut(shortcut: string): string {
  const mod = modifierKey();
  return shortcut
    .replace(/mod\+/gi, `${mod}+`)
    .replace(/ctrl\+/gi, "Ctrl+")
    .replace(/\+([a-z0-9])/gi, (_m, key: string) => `+${key.toUpperCase()}`)
    .replace(/\+/g, "")
    .replace("Escape", "Esc");
}
