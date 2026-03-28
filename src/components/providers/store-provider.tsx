"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Hydration provider for Zustand stores with SSR.
 * Prevents hydration mismatches by deferring client-only store state
 * until after the first client render.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    // Render children immediately but with a CSS class that signals
    // "not yet hydrated" so components can show default/skeleton states.
    // We don't block rendering — Zustand stores return defaults on SSR.
    return (
      <div data-store-hydrated="false" className="contents">
        {children}
      </div>
    );
  }

  return (
    <div data-store-hydrated="true" className="contents">
      {children}
    </div>
  );
}
