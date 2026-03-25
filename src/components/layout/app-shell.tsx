"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { useFocusModeStore } from "~/stores/focusModeStore";
import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";
import { DetailPanel } from "./detail-panel";
import { CaptureBar } from "~/components/unit/capture-bar";
import { CaptureOverlay } from "~/components/unit/capture-mode";
import { CommandPalette } from "~/components/search";
import { useProjectId } from "~/contexts/project-context";
import { useSidebarStore } from "~/stores/sidebar-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);
  const focusMode = useFocusModeStore((s) => s.focusMode);
  const projectId = useProjectId();
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  React.useEffect(() => {
    const xl = window.matchMedia("(min-width: 1280px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    function handleResize() {
      if (xl.matches) { setSidebarOpen(true); setMobileMenuOpen(false); }
      else if (lg.matches) { setSidebarOpen(false); setMobileMenuOpen(false); }
      else { setSidebarOpen(false); setMobileMenuOpen(false); }
    }
    handleResize();
    xl.addEventListener("change", handleResize);
    lg.addEventListener("change", handleResize);
    return () => { xl.removeEventListener("change", handleResize); lg.removeEventListener("change", handleResize); };
  }, [setSidebarOpen]);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen]);

  const mobileSidebarRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed left-4 top-2 z-[100] rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white focus-visible:outline-none"
      >
        Skip to content
      </a>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — uses project context internally */}
        {!focusMode && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}

        {/* Mobile sidebar overlay */}
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
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar className="w-full" />
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            showHamburger
            onHamburgerClick={() => setMobileMenuOpen((p) => !p)}
          />

          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <main id="main-content" role="main" className="relative flex-1 overflow-y-auto">
                <div className="mx-auto min-h-full max-w-content p-space-6">
                  {children}
                </div>
              </main>

              {/* CaptureBar — sticky to the bottom of the main column, never scrolls away */}
              <div className="sticky bottom-0 z-40 border-t border-border-subtle bg-bg-primary py-3">
                <CaptureBar />
              </div>
            </div>

            {!focusMode && (
              <>
                <div className="hidden xl:block"><DetailPanel /></div>
                <div className="xl:hidden"><DetailPanel fullScreenOverlay /></div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Global overlays */}
      {projectId && (
        <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />
      )}
      <CommandPalette />
    </div>
  );
}
