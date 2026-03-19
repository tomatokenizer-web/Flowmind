"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { Layers } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useContextUnits } from "~/hooks/use-context-units";
import { useContextBriefing } from "~/hooks/use-context-briefing";
import { usePanelStore } from "~/stores/panel-store";
import type { LifecycleState } from "~/components/unit/lifecycle-indicator";
import { UnitCard, type UnitCardUnit } from "~/components/unit/unit-card";
import { UnitCardSkeleton } from "~/components/unit/unit-card-skeleton";
import { EmptyState } from "~/components/shared/empty-state";
import { BulkApprovalBar } from "~/components/unit/bulk-approval-bar";
import { ContextHeader, ContextHeaderSkeleton } from "./context-header";
import { ContextBriefing } from "./context-briefing";
import { AddUnitToContext } from "./add-unit-to-context";

// ─── Props ───────────────────────────────────────────────────────────

interface ContextViewProps {
  projectId: string | undefined;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function ContextView({ projectId, className }: ContextViewProps) {
  const {
    context,
    units,
    perspectiveMap,
    activeContextId,
    isLoading,
    isContextLoading,
  } = useContextUnits({ projectId });

  const openPanel = usePanelStore((s) => s.openPanel);
  const utils = api.useUtils();

  // Multi-select state for bulk operations
  const [selectedUnitIds, setSelectedUnitIds] = React.useState<Set<string>>(new Set());

  const lifecycleMutation = api.unit.lifecycleTransition.useMutation({
    onSuccess: () => void utils.unit.list.invalidate({ projectId: projectId! }),
  });

  const handleLifecycleAction = React.useCallback(
    (unitId: string, action: "approve" | "reject" | "reset") => {
      const targetState = action === "approve" ? "confirmed" : action === "reject" ? "archived" : "draft";
      lifecycleMutation.mutate({ id: unitId, targetState: targetState as "draft" | "pending" | "confirmed" | "archived" });
    },
    [lifecycleMutation],
  );

  // Bulk approve all selected units
  const handleBulkApprove = React.useCallback(async () => {
    const promises = Array.from(selectedUnitIds).map((id) =>
      lifecycleMutation.mutateAsync({ id, targetState: "confirmed" })
    );
    await Promise.all(promises);
    setSelectedUnitIds(new Set());
  }, [selectedUnitIds, lifecycleMutation]);

  // Bulk reject all selected units
  const handleBulkReject = React.useCallback(async () => {
    const promises = Array.from(selectedUnitIds).map((id) =>
      lifecycleMutation.mutateAsync({ id, targetState: "archived" })
    );
    await Promise.all(promises);
    setSelectedUnitIds(new Set());
  }, [selectedUnitIds, lifecycleMutation]);

  // Clear multi-selection
  const handleDismissSelection = React.useCallback(() => {
    setSelectedUnitIds(new Set());
  }, []);

  const { briefing, isLoading: isBriefingLoading } =
    useContextBriefing(activeContextId);

  // Remove unit from context mutation
  const removeUnit = api.context.removeUnit.useMutation({
    onSuccess: async () => {
      if (activeContextId) {
        await utils.unit.list.invalidate({ projectId: projectId! });
        await utils.context.getById.invalidate({ id: activeContextId });
      }
    },
  });

  // Handle unit click - Shift+click for multi-select, normal click opens panel
  const handleUnitClick = React.useCallback(
    (unit: UnitCardUnit, event?: React.MouseEvent) => {
      if (event?.shiftKey) {
        // Shift+click: toggle selection
        setSelectedUnitIds((prev) => {
          const next = new Set(prev);
          if (next.has(unit.id)) {
            next.delete(unit.id);
          } else {
            next.add(unit.id);
          }
          return next;
        });
      } else {
        // Normal click: clear multi-select and open panel
        setSelectedUnitIds(new Set());
        openPanel(unit.id);
      }
    },
    [openPanel],
  );

  const handleContinueWhereLeftOff = React.useCallback(() => {
    if (briefing?.lastViewedUnitId) {
      const el = document.getElementById(`unit-${briefing.lastViewedUnitId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [briefing?.lastViewedUnitId]);

  const handleStartFresh = React.useCallback(() => {
    // Briefing dismisses itself internally
  }, []);

  // Map units to UnitCardUnit, applying perspective overrides
  const cardUnits: UnitCardUnit[] = React.useMemo(() => {
    return units.map((unit) => {
      const perspective = activeContextId
        ? perspectiveMap.get(unit.id)
        : undefined;

      return {
        id: unit.id,
        content: unit.content,
        unitType:
          ((perspective as { type?: string | null } | undefined)
            ?.type as UnitType) ?? unit.unitType,
        lifecycle: unit.lifecycle as LifecycleState,
        createdAt: unit.createdAt,
        branchPotential: (unit as { branchPotential?: number }).branchPotential,
        relationCount: (unit as { _count?: { perspectives?: number } })._count
          ?.perspectives,
        originType: unit.originType ?? undefined,
        sourceSpan: (unit as { sourceSpan?: string | null }).sourceSpan,
      };
    });
  }, [units, perspectiveMap, activeContextId]);

  return (
    <div className={cn("flex flex-col gap-space-4 p-space-4", className)}>
      {/* Context header — only when a context is active */}
      {activeContextId &&
        (isContextLoading ? (
          <ContextHeaderSkeleton />
        ) : context ? (
          <div className="flex flex-col gap-2">
            <ContextHeader
              name={context.name}
              snapshot={context.snapshot ?? ""}
              unitCount={context._count?.unitContexts ?? 0}
              perspectiveCount={context._count?.perspectives ?? 0}
            />
            {/* Add Unit to Context button */}
            <div className="flex justify-end">
              <AddUnitToContext
                contextId={activeContextId}
                projectId={projectId!}
                onAdded={() => {
                  void utils.unit.list.invalidate({ projectId: projectId! });
                }}
              />
            </div>
          </div>
        ) : null)}

      {/* Context briefing — auto-displays on re-entry */}
      {activeContextId && !isBriefingLoading && briefing && (
        <ContextBriefing
          briefing={briefing}
          onContinue={handleContinueWhereLeftOff}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Unit list */}
      {isLoading ? (
        <div
          className="flex flex-col gap-space-3"
          role="list"
          aria-label="Loading units"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <UnitCardSkeleton key={i} />
          ))}
        </div>
      ) : cardUnits.length === 0 ? (
        <EmptyState
          icon={Layers}
          headline={
            activeContextId ? "No units in this context" : "No thought units yet"
          }
          description={
            activeContextId
              ? "Add units to this context to see them here."
              : "Capture your first thought to get started."
          }
        />
      ) : (
        <div
          className="flex flex-col gap-space-3"
          role="list"
          aria-label={
            activeContextId && context
              ? `Units in ${context.name}`
              : "All units"
          }
        >
          {cardUnits.map((unit) => (
            <div
              key={unit.id}
              id={`unit-${unit.id}`}
              role="listitem"
              onClick={(e) => handleUnitClick(unit, e)}
            >
              <UnitCard
                unit={unit}
                selected={selectedUnitIds.has(unit.id)}
                onClick={() => {/* handled by parent div for event access */}}
                onLifecycleAction={handleLifecycleAction}
                projectId={projectId}
                onRemoveFromContext={
                  activeContextId
                    ? () =>
                        removeUnit.mutate({
                          unitId: unit.id,
                          contextId: activeContextId,
                        })
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Bulk approval bar for multi-select */}
      <BulkApprovalBar
        selectedCount={selectedUnitIds.size}
        onApproveAll={handleBulkApprove}
        onRejectAll={handleBulkReject}
        onDismiss={handleDismissSelection}
        disabled={lifecycleMutation.isPending}
      />
    </div>
  );
}
