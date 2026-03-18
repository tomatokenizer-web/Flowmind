"use client";

import { cn } from "~/lib/utils";

interface SkipToContentProps {
  /** The target element id (without #). Defaults to "main-content". */
  targetId?: string;
  /** Label text. Defaults to "Skip to content". */
  label?: string;
}

/**
 * Accessible skip-to-content link that becomes visible on keyboard focus.
 * Allows keyboard users to bypass navigation and jump to main content.
 */
export function SkipToContent({
  targetId = "main-content",
  label = "Skip to content",
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed left-space-4 top-space-2 z-[100]",
        "rounded-lg bg-accent-primary px-space-4 py-space-2",
        "text-sm font-medium text-white",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        "transition-opacity duration-fast",
      )}
    >
      {label}
    </a>
  );
}
