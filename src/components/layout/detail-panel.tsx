"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { usePanelStore } from "~/stores/panel-store";
import { useLayoutStore } from "~/stores/layout-store";
import { UnitDetailPanel, type UnitDetailData } from "~/components/panels/UnitDetailPanel";
import type { MetadataValues } from "~/components/unit/metadata-editor";
import { toast } from "~/lib/toast";

interface DetailPanelProps {
  className?: string;
}

export function DetailPanel({ className }: DetailPanelProps) {
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const detailPanelOpen = usePanelStore((s) => s.isOpen);
  const closePanel = usePanelStore((s) => s.closePanel);
  const viewMode = useLayoutStore((s) => s.viewMode);
  // Don't show the detail panel overlay in FlowReader (navigate) view
  const suppressed = viewMode === "navigate";
  const panelRef = React.useRef<HTMLElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // Fetch real unit data when a unit is selected
  const { data: unitData, isLoading, isFetching } = api.unit.getById.useQuery(
    { id: selectedUnitId! },
    { enabled: !!selectedUnitId },
  );
  const showLoading = isLoading || (!!selectedUnitId && !unitData && isFetching);
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
    onSuccess: (_data, variables) => {
      closePanel();
      const projectId = unit?.projectId;
      void utils.unit.list.invalidate(projectId ? { projectId } : undefined);
      void utils.context.getById.invalidate();
      void utils.relation.listByUnit.invalidate({ unitId: variables.id });
      void utils.navigator.list.invalidate();
      void utils.project.getProjectStats.invalidate(projectId ? { projectId } : undefined);
      toast.success("Unit deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete unit", { description: err.message });
    },
  });

  const handleDelete = React.useCallback((unitId: string) => {
    deleteMutation.mutate({ id: unitId });
  }, [deleteMutation]);

  // Track element that opened the panel for focus return — skip when suppressed
  React.useEffect(() => {
    if (suppressed) return;
    if (detailPanelOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [detailPanelOpen, suppressed]);

  // Escape to close — skip when suppressed so other views can handle Escape
  React.useEffect(() => {
    if (!detailPanelOpen || suppressed) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailPanelOpen, handleClose, suppressed]);

  // Focus trap — skip when suppressed
  React.useEffect(() => {
    if (!detailPanelOpen || suppressed) return;

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
  }, [detailPanelOpen, suppressed]);

  const panelContent = (
    <UnitDetailPanel
      unit={unit}
      isLoading={showLoading}
      onClose={handleClose}
      onContentChange={handleContentChange}
      onMetadataChange={handleMetadataChange}
      onLifecycleChange={handleLifecycleChange}
      onDelete={handleDelete}
    />
  );

  return (
    <AnimatePresence>
      {detailPanelOpen && !suppressed && (
        <>
          {/* Backdrop */}
          <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
          {/* Centered card */}
          <motion.aside
            key="detail-card"
            ref={panelRef}
            role="dialog"
            aria-label="Unit detail"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
            className={cn(
              "fixed inset-0 z-50 m-auto",
              "h-[min(85vh,720px)] w-[min(92vw,520px)]",
              "rounded-2xl border border-border bg-bg-primary shadow-modal",
              "flex flex-col overflow-hidden focus-visible:outline-none",
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
