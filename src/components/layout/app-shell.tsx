"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";
import { DetailPanel } from "./detail-panel";

/**
 * AppShell — root layout for all authenticated pages.
 *
 * Responsive breakpoints:
 * - xl (1280px+): Full three-column — sidebar + main + inline detail panel
 * - lg (1024–1279px): Collapsed sidebar (60px icon-only) + overlay detail panel
 * - md (768–1023px): Hamburger sidebar + full-screen overlay detail panel
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

  // Auto-collapse sidebar at lg breakpoint, hide at md
  React.useEffect(() => {
    const xlQuery = window.matchMedia("(min-width: 1280px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");

    function handleResize() {
      if (xlQuery.matches) {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      } else if (lgQuery.matches) {
        setSidebarOpen(false);
        setMobileMenuOpen(false);
      } else {
        setSidebarOpen(true); // full-width when shown via hamburger
        setMobileMenuOpen(false);
      }
    }

    handleResize();
    xlQuery.addEventListener("change", handleResize);
    lgQuery.addEventListener("change", handleResize);
    return () => {
      xlQuery.removeEventListener("change", handleResize);
      lgQuery.removeEventListener("change", handleResize);
    };
  }, [setSidebarOpen]);

  // Close mobile menu on escape
  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen]);

  // Focus trap for mobile sidebar
  const mobileSidebarRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const first = mobileSidebarRef.current?.querySelector<HTMLElement>(
          "button, a, [tabindex]",
        );
        first?.focus();
      });
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg-primary">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only",
          "fixed left-space-4 top-space-2 z-[100]",
          "rounded-lg bg-accent-primary px-space-4 py-space-2 text-sm font-medium text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        )}
      >
        Skip to content
      </a>

      {/* Shell body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (lg+) */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay (below lg) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          ref={mobileSidebarRef}
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden",
            "transition-transform duration-sidebar ease-default",
            "motion-reduce:transition-none",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar className="w-full" />
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            showHamburger={true}
            onHamburgerClick={() => setMobileMenuOpen((prev) => !prev)}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Main content */}
            <main
              id="main-content"
              role="main"
              className="flex-1 overflow-y-auto"
            >
              <div className="mx-auto min-h-full max-w-content p-space-6">
                {children}
              </div>
            </main>

            {/* Detail panel — inline at xl, overlay below */}
            <div className="hidden xl:block">
              <DetailPanel />
            </div>
            <div className="xl:hidden">
              <DetailPanel fullScreenOverlay />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
