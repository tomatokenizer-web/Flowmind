"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";

const PANEL_WIDTH = 360;

interface DetailPanelProps {
  className?: string;
  /** Whether this panel renders as full-screen overlay (tablet) */
  fullScreenOverlay?: boolean;
}

export function DetailPanel({ className, fullScreenOverlay = false }: DetailPanelProps) {
  const detailPanelOpen = useLayoutStore((s) => s.detailPanelOpen);
  const setDetailPanelOpen = useLayoutStore((s) => s.setDetailPanelOpen);
  const panelRef = React.useRef<HTMLElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // Track element that opened the panel for focus return
  React.useEffect(() => {
    if (detailPanelOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      // Focus the panel on open
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [detailPanelOpen]);

  // Escape to close
  React.useEffect(() => {
    if (!detailPanelOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDetailPanelOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailPanelOpen, setDetailPanelOpen]);

  // Focus trap for overlay mode
  React.useEffect(() => {
    if (!detailPanelOpen || !fullScreenOverlay) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement | undefined;
      const last = focusable[focusable.length - 1] as HTMLElement | undefined;
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [detailPanelOpen, fullScreenOverlay]);

  if (fullScreenOverlay) {
    return (
      <>
        {/* Backdrop */}
        {detailPanelOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-slow ease-default motion-reduce:transition-none"
            onClick={() => setDetailPanelOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          ref={panelRef}
          role="complementary"
          aria-label="Detail panel"
          tabIndex={-1}
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full bg-bg-primary shadow-modal",
            "transition-transform duration-slow ease-default",
            "focus-visible:outline-none",
            "motion-reduce:transition-none",
            "md:w-[360px]",
            detailPanelOpen ? "translate-x-0" : "translate-x-full",
            className,
          )}
        >
          <PanelContent onClose={() => setDetailPanelOpen(false)} />
        </aside>
      </>
    );
  }

  // Inline slide-in (desktop)
  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label="Detail panel"
      tabIndex={-1}
      className={cn(
        "h-full shrink-0 overflow-hidden border-l border-border bg-bg-primary",
        "transition-[width] duration-slow ease-default",
        "focus-visible:outline-none",
        "motion-reduce:transition-none",
        className,
      )}
      style={{ width: detailPanelOpen ? PANEL_WIDTH : 0 }}
    >
      <div className="h-full" style={{ width: PANEL_WIDTH }}>
        <PanelContent onClose={() => setDetailPanelOpen(false)} />
      </div>
    </aside>
  );
}

function PanelContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-space-4">
        <h2 className="text-sm font-medium text-text-primary">Details</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close detail panel"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel body placeholder */}
      <div className="flex flex-1 flex-col items-center justify-center gap-space-4 p-space-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-bg-secondary" />
        <p className="text-sm text-text-secondary">
          Select a thought unit to see its details
        </p>
      </div>
    </div>
  );
}
