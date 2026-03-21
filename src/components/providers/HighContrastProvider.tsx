"use client";

import { useEffect } from "react";
import { initTheme } from "~/lib/theme";

/**
 * ThemeProvider — mounts once and applies the persisted theme preference
 * (localStorage / prefers-color-scheme media query) to the document root.
 *
 * Place inside the root layout, outside of Suspense boundaries.
 */
export function HighContrastProvider() {
  useEffect(() => {
    initTheme();
  }, []);

  return null;
}
