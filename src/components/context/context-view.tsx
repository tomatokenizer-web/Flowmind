"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { ChevronDown, Layers, Loader2, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast, useToastStore } from "~/lib/toast";
import { useContextUnits } from "~/hooks/use-context-units";
import { useContextBriefing } from "~/hooks/use-context-briefing";
import { useViewStatePreservation } from "~/hooks/use-view-state-preservation";
import { usePanelStore } from "~/stores/panel-store";
import type { LifecycleState } from "~/components/unit/lifecycle-indicator";
import { type UnitCardUnit } from "~/components/unit/unit-card";
import { UnitCardSkeleton } from "~/components/unit/unit-card-skeleton";
import { UnitCardList } from "~/components/unit/unit-card-list";
import { EmptyState } from "~/components/shared/empty-state";
import { BulkApprovalBar } from "~/components/unit/bulk-approval-bar";
import { Button } from "~/components/ui/button";
import { AIInsightsPanel } from "~/components/ai/AIInsightsPanel";
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
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useContextUnits({ projectId, limit: 20 });

  // View state preservation — keyed by context (or "all-units" fallback)
  const viewStateId = `context-view:${activeContextId ?? "all-units"}`;
  const {
    restored: restoredViewState,
    saveSelectedUnitIds: persistSelectedIds,
    saveFilterState: persistFilterState,
  } = useViewStatePreservation(viewStateId);

  const openPanel = usePanelStore((s) => s.openPanel);
  const panelIsOpen = usePanelStore((s) => s.isOpen);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const utils = api.useUtils();

  // Multi-select state for bulk operations — restore from preserved state
  const [selectedUnitIds, setSelectedUnitIds] = React.useState<Set<string>>(
    () => new Set(restoredViewState?.selectedUnitIds ?? []),
  );

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
    persistSelectedIds([]);
  }, [persistSelectedIds]);

  // Sync selected unit IDs to view state whenever they change
  React.useEffect(() => {
    persistSelectedIds(Array.from(selectedUnitIds));
  }, [selectedUnitIds, persistSelectedIds]);

  // Sync open panel state to view state preservation
  React.useEffect(() => {
    persistFilterState({
      openPanelUnitId: panelIsOpen ? selectedUnitId : null,
    });
  }, [panelIsOpen, selectedUnitId, persistFilterState]);

  // Restore starred filter from preserved state on mount
  React.useEffect(() => {
    // Restore view state on mount (starred filter removed)
    // Restore open panel if one was open
    const restoredPanelUnit = restoredViewState?.filterState?.openPanelUnitId;
    if (typeof restoredPanelUnit === "string" && restoredPanelUnit) {
      openPanel(restoredPanelUnit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStateId]);

  const [showAiInsights, setShowAiInsights] = React.useState(false);

  const { briefing, isLoading: isBriefingLoading } =
    useContextBriefing(activeContextId);

  // Visit tracking — record a visit whenever the user navigates to a context
  const recordVisitMutation = api.contextVisit.recordVisit.useMutation();
  React.useEffect(() => {
    if (!activeContextId) return;
    recordVisitMutation.mutate({ contextId: activeContextId });
    // Only fire on contextId change, not when mutation reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContextId]);

  // Remove unit from context — with undo toast (5 second delay before actual delete)
  const removeUnitMutation = api.context.removeUnit.useMutation({
    onSuccess: async () => {
      if (activeContextId) {
        await utils.unit.list.invalidate({ projectId: projectId! });
        await utils.context.getById.invalidate({ id: activeContextId });
      }
    },
    onError: (err, vars) => {
      // On failure, remove from pending set so the unit reappears
      setPendingRemovalIds((prev) => {
        const next = new Set(prev);
        next.delete(vars.unitId);
        return next;
      });
      toast.error("Failed to remove unit from context");
    },
  });

  // IDs of units that are optimistically hidden while the undo timer counts down
  const [pendingRemovalIds, setPendingRemovalIds] = React.useState<Set<string>>(new Set());
  // Refs to track undo-timer handles keyed by unitId
  const removalTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleRemoveFromContext = React.useCallback(
    (unitId: string) => {
      if (!activeContextId) return;

      // Optimistically hide the unit immediately
      setPendingRemovalIds((prev) => new Set(prev).add(unitId));

      // Show toast with Undo button; actual delete fires after 5 seconds
      const toastId = toast.info("Unit removed from context", {
        duration: 5000,
        undoAction: () => {
          // Cancel the pending delete timer
          const timer = removalTimersRef.current.get(unitId);
          if (timer) {
            clearTimeout(timer);
            removalTimersRef.current.delete(unitId);
          }
          // Restore the unit in the UI
          setPendingRemovalIds((prev) => {
            const next = new Set(prev);
            next.delete(unitId);
            return next;
          });
          // Dismiss the toast immediately
          useToastStore.getState().removeToast(toastId);
        },
      });

      // Schedule actual server mutation after 5 seconds
      const timer = setTimeout(() => {
        removalTimersRef.current.delete(unitId);
        removeUnitMutation.mutate({ unitId, contextId: activeContextId });
      }, 5000);

      removalTimersRef.current.set(unitId, timer);
    },
    [activeContextId, removeUnitMutation],
  );

  // Cleanup timers on unmount
  React.useEffect(() => {
    const timers = removalTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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

      const perspectiveTyped = perspective as {
        type?: string | null;
        stance?: string | null;
        importance?: number | null;
      } | undefined;

      return {
        id: unit.id,
        content: unit.content,
        unitType:
          (perspectiveTyped?.type as UnitType) ?? unit.unitType,
        lifecycle: unit.lifecycle as LifecycleState,
        createdAt: unit.createdAt,
        branchPotential: (unit as { branchPotential?: number }).branchPotential,
        relationCount: (unit as { _count?: { perspectives?: number } })._count?.perspectives,
        originType: unit.originType ?? undefined,
        sourceSpan: (unit as { sourceSpan?: string | null }).sourceSpan,
        importance: (unit as { importance?: number }).importance,
        pinned: (unit as { pinned?: boolean }).pinned,
        flagged: (unit as { flagged?: boolean }).flagged,
        driftScore: (unit as { driftScore?: number }).driftScore,
        stance: perspectiveTyped?.stance as UnitCardUnit["stance"] ?? null,
        perspectiveImportance: perspectiveTyped?.importance ?? null,
      };
    });
  }, [units, perspectiveMap, activeContextId]);

  // Apply starred filter and hide units that are pending removal (undo window)
  const visibleUnits = React.useMemo(() => {
    return pendingRemovalIds.size > 0
      ? cardUnits.filter((u) => !pendingRemovalIds.has(u.id))
      : cardUnits;
  }, [cardUnits, pendingRemovalIds]);

  return (
    <div className={cn("flex flex-col gap-space-4 p-space-4", className)}>
      {/* Context header — only when a context is active */}
      {activeContextId &&
        (isContextLoading ? (
          <ContextHeaderSkeleton />
        ) : context ? (
          <div className="flex flex-col gap-2">
            <ContextHeader
              contextId={activeContextId}
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


      {/* AI Insights — collapsible panel, only when a context is active */}
      {activeContextId && !isLoading && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAiInsights((p) => !p)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showAiInsights && "rotate-180",
              )}
            />
          </button>
          {showAiInsights && (
            <AIInsightsPanel
              contextId={activeContextId}
              onNavigateToUnit={(unitId) => {
                openPanel(unitId);
              }}
            />
          )}
        </div>
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
      ) : visibleUnits.length === 0 ? (
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
        <>
          <UnitCardList
            units={visibleUnits}
            selectedUnitIds={selectedUnitIds}
            onUnitClick={handleUnitClick}
            onLifecycleAction={handleLifecycleAction}
            projectId={projectId}
            getOnRemoveFromContext={
              activeContextId
                ? (unit) => () => handleRemoveFromContext(unit.id)
                : undefined
            }
            listLabel={
              activeContextId && context
                ? `Units in ${context.name}`
                : "All units"
            }
          />
          {/* Pagination: Load More button — appears when there are more pages */}
          {hasNextPage && (
            <div className="flex justify-center pt-space-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="min-w-[120px] text-text-secondary"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
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
