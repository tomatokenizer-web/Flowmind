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
import { ResizeHandle } from "./resize-handle";

interface DetailPanelProps {
  className?: string;
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function DetailPanel({ className }: DetailPanelProps) {
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const detailPanelOpen = usePanelStore((s) => s.isOpen);
  const closePanel = usePanelStore((s) => s.closePanel);
  const panelWidth = usePanelStore((s) => s.panelWidth);
  const setPanelWidth = usePanelStore((s) => s.setPanelWidth);
  const viewMode = useLayoutStore((s) => s.viewMode);
  const suppressed = viewMode === "navigate";
  const isMobile = useIsMobile();
  const panelRef = React.useRef<HTMLElement>(null);

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

  // Escape to close
  React.useEffect(() => {
    if (!detailPanelOpen || suppressed) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailPanelOpen, handleClose, suppressed]);

  const handleResize = React.useCallback(
    (deltaX: number) => {
      setPanelWidth(panelWidth + deltaX);
    },
    [panelWidth, setPanelWidth],
  );

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

  // Mobile: bottom sheet overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {detailPanelOpen && !suppressed && (
          <>
            <motion.div
              key="detail-backdrop-mobile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={handleClose}
              aria-hidden="true"
            />
            <motion.aside
              key="detail-sheet-mobile"
              ref={panelRef}
              role="dialog"
              aria-label="Unit detail"
              aria-modal="true"
              tabIndex={-1}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50",
                "h-[85vh] rounded-t-2xl",
                "border-t border-border bg-bg-primary shadow-modal",
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

  // Desktop: inline split panel (right column)
  return (
    <AnimatePresence>
      {detailPanelOpen && !suppressed && (
        <motion.aside
          key="detail-panel"
          ref={panelRef}
          role="complementary"
          aria-label="Unit detail"
          tabIndex={-1}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
          className={cn(
            "relative flex h-full shrink-0 flex-col overflow-hidden",
            "border-l border-border bg-bg-primary",
            "focus-visible:outline-none",
            className,
          )}
        >
          <ResizeHandle onResize={handleResize} />
          {panelContent}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
