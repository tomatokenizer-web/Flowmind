"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useLayoutStore } from "~/stores/layout-store";
import { usePanelStore } from "~/stores/panel-store";
import { UnitDetailPanel, type UnitDetailData } from "~/components/panels/UnitDetailPanel";
import type { MetadataValues } from "~/components/unit/metadata-editor";

const PANEL_WIDTH = 360;

interface DetailPanelProps {
  className?: string;
  /** Whether this panel renders as full-screen overlay (tablet) */
  fullScreenOverlay?: boolean;
}

export function DetailPanel({ className, fullScreenOverlay = false }: DetailPanelProps) {
  const setDetailPanelOpen = useLayoutStore((s) => s.setDetailPanelOpen);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const detailPanelOpen = usePanelStore((s) => s.isOpen); // use panelStore as source of truth
  const closePanel = usePanelStore((s) => s.closePanel);
  const panelRef = React.useRef<HTMLElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // Fetch real unit data when a unit is selected
  const { data: unitData, isLoading } = api.unit.getById.useQuery(
    { id: selectedUnitId! },
    { enabled: !!selectedUnitId },
  );
  const unit: UnitDetailData | null = unitData
    ? {
        id: unitData.id,
        content: unitData.content,
        projectId: unitData.projectId,
        unitType: unitData.unitType,
        lifecycle: unitData.lifecycle,
        createdAt: unitData.createdAt,
        modifiedAt: unitData.modifiedAt,
        originType: unitData.originType ?? undefined,
        sourceUrl: unitData.sourceUrl ?? undefined,
        sourceTitle: unitData.sourceTitle ?? undefined,
      }
    : null;

  const handleClose = React.useCallback(() => {
    setDetailPanelOpen(false);
    closePanel();
  }, [setDetailPanelOpen, closePanel]);

  const utils = api.useUtils();
  const updateMutation = api.unit.update.useMutation({
    onSuccess: () => { void utils.unit.getById.invalidate({ id: selectedUnitId! }); },
  });

  const handleContentChange = React.useCallback((content: string) => {
    if (!selectedUnitId) return;
    updateMutation.mutate({ id: selectedUnitId, content });
  }, [selectedUnitId, updateMutation]);

  const handleMetadataChange = React.useCallback(
    (field: keyof MetadataValues, value: string | null) => {
      if (!selectedUnitId) return;
      updateMutation.mutate({ id: selectedUnitId, [field]: value ?? undefined });
    },
    [selectedUnitId, updateMutation],
  );

  const lifecycleMutation = api.unit.lifecycleTransition.useMutation({
    onSuccess: () => { void utils.unit.getById.invalidate({ id: selectedUnitId! }); },
  });

  const handleLifecycleChange = React.useCallback((lifecycle: string) => {
    if (!selectedUnitId) return;
    lifecycleMutation.mutate({ id: selectedUnitId, targetState: lifecycle as "draft" | "pending" | "confirmed" | "archived" });
  }, [selectedUnitId, lifecycleMutation]);

  // Track element that opened the panel for focus return
  React.useEffect(() => {
    if (detailPanelOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;
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
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailPanelOpen, handleClose]);

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
            onClick={handleClose}
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
          <UnitDetailPanel
            unit={unit}
            isLoading={isLoading}
            onClose={handleClose}
            onContentChange={handleContentChange}
            onMetadataChange={handleMetadataChange}
            onLifecycleChange={handleLifecycleChange}
          />
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
        <UnitDetailPanel
          unit={unit}
          isLoading={isLoading}
          onClose={handleClose}
          onContentChange={handleContentChange}
          onMetadataChange={handleMetadataChange}
          onLifecycleChange={handleLifecycleChange}
        />
      </div>
    </aside>
  );
}
