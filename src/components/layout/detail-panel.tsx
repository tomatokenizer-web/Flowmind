"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { usePanelStore } from "~/stores/panel-store";
import { UnitDetailPanel, type UnitDetailData } from "~/components/panels/UnitDetailPanel";
import type { MetadataValues } from "~/components/unit/metadata-editor";
import { toast } from "~/lib/toast";

const PANEL_WIDTH = 360;

interface DetailPanelProps {
  className?: string;
  /** Whether this panel renders as full-screen overlay (tablet) */
  fullScreenOverlay?: boolean;
}

export function DetailPanel({ className, fullScreenOverlay = false }: DetailPanelProps) {
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const detailPanelOpen = usePanelStore((s) => s.isOpen);
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
        sourceSpan: unitData.sourceSpan as Record<string, unknown> | null | undefined,
        aiTrustLevel: unitData.aiTrustLevel ?? undefined,
        certainty: unitData.certainty ?? undefined,
        completeness: unitData.completeness ?? undefined,
        evidenceDomain: unitData.evidenceDomain ?? undefined,
        scope: unitData.scope ?? undefined,
        stance: unitData.stance ?? undefined,
        branchPotential: unitData.branchPotential ?? undefined,
        versionCount: unitData.versions?.length ?? 0,
        relationCount: unitData.perspectives?.reduce(
          (sum, p) => sum + (p.relations?.length ?? 0),
          0,
        ) ?? 0,
        resources: unitData.resources?.map((ur) => ({
          id: ur.resource.id,
          resourceType: ur.resource.resourceType,
          url: ur.resource.url,
          fileName: ur.resource.fileName ?? null,
          mimeType: ur.resource.mimeType ?? null,
          fileSize: ur.resource.fileSize ?? null,
          metadata: ur.resource.metadata as Record<string, unknown> | null | undefined,
        })) ?? [],
      }
    : null;

  const handleClose = React.useCallback(() => {
    closePanel();
  }, [closePanel]);

  const utils = api.useUtils();
  const updateMutation = api.unit.update.useMutation({
    onSuccess: () => { void utils.unit.getById.invalidate({ id: selectedUnitId! }); },
    onError: (err) => { toast.error("Failed to save changes", { description: err.message }); },
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
    onError: (err) => { toast.error("Failed to update lifecycle", { description: err.message }); },
  });

  const handleLifecycleChange = React.useCallback((lifecycle: string) => {
    if (!selectedUnitId) return;
    lifecycleMutation.mutate({ id: selectedUnitId, targetState: lifecycle as "draft" | "pending" | "confirmed" | "archived" });
  }, [selectedUnitId, lifecycleMutation]);

  const deleteMutation = api.unit.delete.useMutation({
    onSuccess: () => {
      closePanel();
      void utils.unit.list.invalidate();
      void utils.context.getById.invalidate();
      void utils.relation.listByUnit.invalidate();
      void utils.navigator.list.invalidate();
      void utils.project.getProjectStats.invalidate();
      toast.success("Unit deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete unit", { description: err.message });
    },
  });

  const handleDelete = React.useCallback((unitId: string) => {
    deleteMutation.mutate({ id: unitId });
  }, [deleteMutation]);

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

  const panelContent = (
    <UnitDetailPanel
      unit={unit}
      isLoading={isLoading}
      onClose={handleClose}
      onContentChange={handleContentChange}
      onMetadataChange={handleMetadataChange}
      onLifecycleChange={handleLifecycleChange}
      onDelete={handleDelete}
    />
  );

  // Overlay mode (tablet / mobile)
  if (fullScreenOverlay) {
    return (
      <AnimatePresence>
        {detailPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={handleClose}
              aria-hidden="true"
            />
            <motion.aside
              key="detail-overlay"
              ref={panelRef}
              role="complementary"
              aria-label="Detail panel"
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={cn(
                "fixed inset-y-0 right-0 z-50 w-full bg-bg-primary shadow-modal",
                "focus-visible:outline-none",
                "md:w-[360px]",
                className,
              )}
            >
              {panelContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Inline slide-in (desktop) with Framer Motion
  return (
    <AnimatePresence initial={false}>
      {detailPanelOpen && (
        <motion.aside
          key="detail-inline"
          ref={panelRef}
          role="complementary"
          aria-label="Detail panel"
          tabIndex={-1}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: PANEL_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className={cn(
            "h-full shrink-0 overflow-hidden border-l border-border bg-bg-primary",
            "focus-visible:outline-none",
            className,
          )}
        >
          <div className="h-full" style={{ width: PANEL_WIDTH }}>
            {panelContent}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
