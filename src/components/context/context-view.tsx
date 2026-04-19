"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { Layers, Loader2, Merge, Scissors, Search, Sparkles, Wand2, X, Download } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast, useToastStore } from "~/lib/toast";
import { useContextUnits } from "~/hooks/use-context-units";
import { useContextBriefing } from "~/hooks/use-context-briefing";

import { useViewStatePreservation } from "~/hooks/use-view-state-preservation";
import { usePanelStore } from "~/stores/panel-store";
import { useAIPanelStore } from "~/stores/ai-panel-store";
import type { LifecycleState } from "~/components/unit/lifecycle-indicator";
import { type UnitCardUnit } from "~/components/unit/unit-card";
import { UnitCardSkeleton } from "~/components/unit/unit-card-skeleton";
import { UnitCardList } from "~/components/unit/unit-card-list";
import { EmptyState } from "~/components/shared/empty-state";
import { BulkApprovalBar } from "~/components/unit/bulk-approval-bar";
import { Button } from "~/components/ui/button";
import { PromptGeneratorDialog } from "~/components/ai/PromptGeneratorDialog";
import { ContextHeader, ContextHeaderSkeleton } from "./context-header";
import { ContextBriefing } from "./context-briefing";
import { AddUnitToContext } from "./add-unit-to-context";
import { ContextSplitDialog } from "./context-split-dialog";
import { ContextMergeDialog } from "./context-merge-dialog";
import { MissingArgumentAlert } from "~/components/feedback/MissingArgumentAlert";
import { ComponentErrorBoundary } from "~/components/shared/error-boundary";

// ─── AI Status Bar ─────────────────────────────────────────────────

function AIStatusBar({ contextId }: { contextId: string }) {
  const toggleAIPanel = useAIPanelStore((s) => s.toggleAIPanel);

  const { data: missingArgs } = api.ai.detectMissingArguments.useQuery(
    { contextId },
    { enabled: !!contextId, retry: false },
  );
  const gapCount = missingArgs?.gaps?.length ?? 0;

  return (
    <button
      type="button"
      onClick={toggleAIPanel}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        "border border-border/60 bg-bg-secondary/50 hover:bg-bg-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
      <span className="text-text-secondary font-medium">AI Insights</span>
      {gapCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
          {gapCount} gap{gapCount !== 1 ? "s" : ""}
        </span>
      )}
      <span className="ml-auto text-xs text-text-tertiary">Open panel</span>
    </button>
  );
}

// ─── Props ──���────────────────────────────���───────────────────────────

// ─── Export Button ──────────────────────────────────────────────────

function ExportContextButton({
  contextName,
  units,
}: {
  contextName: string;
  units: Array<{ content: string; unitType: string; lifecycle: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  const exportAs = React.useCallback(
    (format: "markdown" | "json" | "text") => {
      let content: string;
      let filename: string;
      let mime: string;
      const safeName = contextName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "export";

      if (format === "markdown") {
        content = `# ${contextName}\n\n${units.map((u) => `## [${u.unitType}] (${u.lifecycle})\n\n${u.content}\n`).join("\n---\n\n")}`;
        filename = `${safeName}.md`;
        mime = "text/markdown";
      } else if (format === "json") {
        content = JSON.stringify({ context: contextName, exportedAt: new Date().toISOString(), units: units.map((u) => ({ content: u.content, type: u.unitType, lifecycle: u.lifecycle })) }, null, 2);
        filename = `${safeName}.json`;
        mime = "application/json";
      } else {
        content = `${contextName}\n${"=".repeat(contextName.length)}\n\n${units.map((u) => `[${u.unitType}] ${u.content}`).join("\n\n")}`;
        filename = `${safeName}.txt`;
        mime = "text/plain";
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    },
    [contextName, units],
  );

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((p) => !p)}
        className="gap-1.5 text-text-secondary"
        title="Export this context"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Export
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[130px] rounded-lg border border-border bg-bg-primary p-1 shadow-modal">
          {(["markdown", "json", "text"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => exportAs(fmt)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
            >
              {fmt === "markdown" ? "Markdown" : fmt === "json" ? "JSON" : "Plain Text"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    onSuccess: () => {
      void utils.unit.list.invalidate({ projectId });
      if (projectId) {
        void utils.project.getProjectStats.invalidate({ projectId });
        void utils.project.getCompletenessStats.invalidate({ projectId });
      }
    },
    onError: (err) => toast.error("Failed to update unit", { description: err.message }),
  });

  const handleLifecycleAction = React.useCallback(
    (unitId: string, action: "approve" | "reject" | "reset") => {
      const targetState = action === "approve" ? "confirmed" : action === "reject" ? "archived" : "draft";
      lifecycleMutation.mutate({ id: unitId, targetState: targetState as "draft" | "pending" | "confirmed" | "archived" });
    },
    [lifecycleMutation],
  );

  const createUnitMutation = api.unit.create.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate({ projectId });
      toast.success("Unit created from AI suggestion");
    },
    onError: (err) => toast.error("Failed to create unit", { description: err.message }),
  });

  const deleteUnitMutation = api.unit.delete.useMutation({
    onSuccess: (_data, variables) => {
      // Close panel if the deleted unit was open
      const panelState = usePanelStore.getState();
      if (panelState.isOpen && panelState.selectedUnitId === variables.id) {
        panelState.closePanel();
      }
      void utils.unit.list.invalidate({ projectId });
      void utils.unit.hasAny.invalidate();
      void utils.relation.listByUnit.invalidate({ unitId: variables.id });
      void utils.relation.listByUnits.invalidate();
      if (activeContextId) {
        void utils.context.getById.invalidate({ id: activeContextId });
        void utils.navigator.list.invalidate({ contextId: activeContextId });
        void utils.context.getContextStats.invalidate({ contextId: activeContextId });
      }
    },
    onError: (err) => toast.error("Failed to delete unit", { description: err.message }),
  });

  const handleDeleteUnit = React.useCallback(
    (unitId: string) => {
      if (!window.confirm("Permanently delete this unit? This cannot be undone.")) return;
      deleteUnitMutation.mutate({ id: unitId });
    },
    [deleteUnitMutation],
  );

  const bulkLifecycleMutation = api.unit.lifecycleBulkTransition.useMutation({
    onSuccess: () => void utils.unit.list.invalidate({ projectId }),
    onError: (err) => toast.error("Bulk operation failed", { description: err.message }),
  });

  // Bulk approve all selected units
  const handleBulkApprove = React.useCallback(async () => {
    const ids = Array.from(selectedUnitIds);
    setSelectedUnitIds(new Set());
    try {
      const result = await bulkLifecycleMutation.mutateAsync({ ids, targetState: "confirmed" });
      if (result.skipped.length > 0) {
        toast.warning(`${result.updatedCount} approved, ${result.skipped.length} skipped`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Bulk approve failed", { description: msg });
    }
  }, [selectedUnitIds, bulkLifecycleMutation]);

  // Bulk reject all selected units
  const handleBulkReject = React.useCallback(async () => {
    const ids = Array.from(selectedUnitIds);
    setSelectedUnitIds(new Set());
    try {
      const result = await bulkLifecycleMutation.mutateAsync({ ids, targetState: "archived" });
      if (result.skipped.length > 0) {
        toast.warning(`${result.updatedCount} archived, ${result.skipped.length} skipped`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Bulk reject failed", { description: msg });
    }
  }, [selectedUnitIds, bulkLifecycleMutation]);

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

  // Progressive disclosure: track which unit is expanded inline (level 2)
  const [expandedUnitId, setExpandedUnitId] = React.useState<string | null>(null);

  // Search / filter state for units in this context
  const [unitSearch, setUnitSearch] = React.useState("");
  const [filterTagId, setFilterTagId] = React.useState<string | null>(null);

  const { data: projectTags = [] } = api.tag.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  // Split / Merge / Prompt dialog state
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = React.useState(false);
  const [mergeTargetId, setMergeTargetId] = React.useState<string>("");
  const [mergeTargetName, setMergeTargetName] = React.useState<string>("");

  // Fetch sibling contexts for the merge picker (only when a context is active and projectId is known)
  const { data: allContexts } = api.context.list.useQuery(
    { projectId: projectId },
    { enabled: !!projectId && !!activeContextId },
  );
  const siblingContexts = React.useMemo(
    () => (allContexts ?? []).filter((c: { id: string }) => c.id !== activeContextId),
    [allContexts, activeContextId],
  );

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
        await utils.unit.list.invalidate({ projectId });
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

  // Handle unit click — progressive disclosure:
  // Single click = toggle inline expansion (level 2)
  // Shift+click = multi-select for bulk ops
  // Double-click or "Open detail" button = open side panel (level 3)
  const handleUnitClick = React.useCallback(
    (unit: UnitCardUnit, event?: React.MouseEvent) => {
      if (event?.shiftKey) {
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
        setSelectedUnitIds(new Set());
        setExpandedUnitId((prev) => (prev === unit.id ? null : unit.id));
      }
    },
    [],
  );

  const handleOpenDetail = React.useCallback(
    (unitId: string) => {
      openPanel(unitId);
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
        tags: (unit as { unitTags?: Array<{ tag: { id: string; name: string; color: string | null } }> }).unitTags?.map((t) => t.tag) ?? [],
      };
    });
  }, [units, perspectiveMap, activeContextId]);

  // Apply search filter and hide units that are pending removal (undo window)
  const visibleUnits = React.useMemo(() => {
    let filtered = cardUnits;
    if (pendingRemovalIds.size > 0) {
      filtered = filtered.filter((u) => !pendingRemovalIds.has(u.id));
    }
    if (unitSearch.trim()) {
      const q = unitSearch.trim().toLowerCase();
      filtered = filtered.filter((u) => u.content.toLowerCase().includes(q));
    }
    if (filterTagId) {
      filtered = filtered.filter((u) => u.tags?.some((t) => t.id === filterTagId));
    }
    return filtered;
  }, [cardUnits, pendingRemovalIds, unitSearch, filterTagId]);

  return (
    <ComponentErrorBoundary>
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
            {/* Context action buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Split */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSplitOpen(true)}
                  className="gap-1.5 text-text-secondary"
                  title="Split this context into two sub-contexts"
                >
                  <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                  Split
                </Button>

                {/* Generate AI Prompt */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptDialogOpen(true)}
                  className="gap-1.5 text-text-secondary"
                  title="Generate an AI prompt from this context's units"
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  AI Prompt
                </Button>

                {/* Export context */}
                <ExportContextButton
                  contextName={context?.name ?? "context"}
                  units={visibleUnits}
                />

                {/* Merge — only available when there are other contexts */}
                {siblingContexts.length > 0 && (
                  <div className="relative flex items-center">
                    <Merge
                      className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-text-tertiary"
                      aria-hidden="true"
                    />
                    <select
                      aria-label="Select context to merge with"
                      className={cn(
                        "h-8 cursor-pointer rounded-md border border-border bg-bg-primary py-1 pl-7 pr-2",
                        "text-xs text-text-secondary outline-none transition-colors duration-fast",
                        "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                        "hover:bg-bg-secondary",
                      )}
                      value=""
                      onChange={(e) => {
                        const target = siblingContexts.find(
                          (c: { id: string }) => c.id === e.target.value,
                        );
                        if (target) {
                          setMergeTargetId(target.id);
                          setMergeTargetName((target as { name: string }).name);
                          setMergeOpen(true);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>
                        Merge with...
                      </option>
                      {siblingContexts.map((c: { id: string; name: string }) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Search units in this context */}
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Filter units..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  aria-label="Filter units by content"
                  className={cn(
                    "h-8 w-36 rounded-md border border-border bg-bg-primary py-1 pl-7 pr-7 text-xs text-text-primary",
                    "placeholder:text-text-tertiary outline-none transition-colors duration-fast",
                    "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                  )}
                />
                {unitSearch && (
                  <button
                    type="button"
                    onClick={() => setUnitSearch("")}
                    className="absolute right-1.5 rounded p-0.5 text-text-tertiary hover:text-text-secondary"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Tag filter */}
              {projectTags.length > 0 && (
                <select
                  aria-label="Filter by tag"
                  value={filterTagId ?? ""}
                  onChange={(e) => setFilterTagId(e.target.value || null)}
                  className={cn(
                    "h-8 cursor-pointer rounded-md border border-border bg-bg-primary py-1 px-2",
                    "text-xs text-text-secondary outline-none transition-colors duration-fast",
                    "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                    filterTagId && "border-accent-primary/40 text-accent-primary",
                  )}
                >
                  <option value="">All tags</option>
                  {projectTags.map((tag: { id: string; name: string }) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              )}

              {/* Add Unit to Context button */}
              {projectId && (
                <AddUnitToContext
                  contextId={activeContextId}
                  projectId={projectId}
                  onAdded={() => {
                    void utils.unit.list.invalidate({ projectId });
                  }}
                />
              )}
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


      {/* AI status bar + inline alerts — replaces heavy InsightsSection accordion */}
      {activeContextId && !isLoading && (
        <div className="space-y-2">
          <AIStatusBar contextId={activeContextId} />
          <MissingArgumentAlert
            contextId={activeContextId}
            onCreateUnit={(content, unitType) => {
              if (!projectId) return;
              createUnitMutation.mutate({
                content,
                unitType: unitType as Parameters<typeof createUnitMutation.mutate>[0]["unitType"],
                projectId,
              });
            }}
          />
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
          icon={unitSearch.trim() ? Search : Layers}
          headline={
            unitSearch.trim()
              ? "No matching units"
              : activeContextId
                ? "No units in this context"
                : "No thought units yet"
          }
          description={
            unitSearch.trim()
              ? "Try a different search term or clear the filter."
              : activeContextId
                ? "Add units to this context to see them here."
                : "Capture your first thought to get started."
          }
        />
      ) : (
        <>
          <UnitCardList
            units={visibleUnits}
            selectedUnitIds={selectedUnitIds}
            expandedUnitId={expandedUnitId}
            onUnitClick={handleUnitClick}
            onOpenDetail={handleOpenDetail}
            onCollapseExpanded={() => setExpandedUnitId(null)}
            onLifecycleAction={handleLifecycleAction}
            projectId={projectId}
            getOnRemoveFromContext={
              activeContextId
                ? (unit) => () => handleRemoveFromContext(unit.id)
                : undefined
            }
            getOnDelete={(unit) => () => handleDeleteUnit(unit.id)}
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
      {selectedUnitIds.size > 0 && (
        <BulkApprovalBar
          selectedCount={selectedUnitIds.size}
          onApproveAll={handleBulkApprove}
          onRejectAll={handleBulkReject}
          onDismiss={handleDismissSelection}
          disabled={lifecycleMutation.isPending}
        />
      )}

      {/* Split dialog */}
      {activeContextId && projectId && (
        <ContextSplitDialog
          open={splitOpen}
          onOpenChange={setSplitOpen}
          contextId={activeContextId}
          contextName={context?.name ?? ""}
          projectId={projectId}
        />
      )}

      {/* Merge dialog */}
      {activeContextId && projectId && mergeTargetId && (
        <ContextMergeDialog
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          contextIdA={activeContextId}
          contextNameA={context?.name ?? ""}
          contextIdB={mergeTargetId}
          contextNameB={mergeTargetName}
          projectId={projectId}
        />
      )}

      {/* Prompt generator dialog */}
      {activeContextId && (
        <PromptGeneratorDialog
          open={promptDialogOpen}
          onOpenChange={setPromptDialogOpen}
          contextId={activeContextId}
        />
      )}
    </div>
    </ComponentErrorBoundary>
  );
}
