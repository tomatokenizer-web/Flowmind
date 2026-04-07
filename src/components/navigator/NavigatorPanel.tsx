"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, ChevronRight, Compass, X, Search, Loader2, Sparkles, Play, Zap, ScanSearch, ArrowUpFromLine, Lightbulb } from "lucide-react";
import { FlowReader } from "./FlowReader";
import { PathPreviewDialog, type PathProposal } from "./PathPreviewDialog";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { usePanelStore } from "~/stores/panel-store";
import { toast } from "~/lib/toast";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "~/components/ui/tooltip";

interface NavigatorPanelProps {
  projectId: string;
}

export function NavigatorPanel({ projectId }: NavigatorPanelProps) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [activeNavId, setActiveNavId] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);
  const [flowReaderNav, setFlowReaderNav] = React.useState<{ id: string; path: string[]; step: number } | null>(null);
  const [proposals, setProposals] = React.useState<PathProposal[] | null>(null);
  const [analyzingGaps, setAnalyzingGaps] = React.useState<string | null>(null);
  const utils = api.useUtils();

  const { data: navigators = [] } = api.navigator.list.useQuery({ projectId });

  const activeNav = navigators.find((n) => n.id === activeNavId);
  const totalSteps = activeNav?.path?.length ?? 0;

  // ── Batch-load unit data for step previews (fix #6) ──────────────
  const pathIds = activeNav?.path ?? [];
  const { data: pathUnits = [] } = api.unit.listByIds.useQuery(
    { ids: pathIds },
    { enabled: pathIds.length > 0 },
  );
  const unitMap = React.useMemo(() => {
    const map = new Map<string, { id: string; content: string; unitType: string }>();
    for (const u of pathUnits) {
      map.set(u.id, u);
    }
    return map;
  }, [pathUnits]);

  // ── Mutations ────────────────────────────────────────────────────
  const createNav = api.navigator.create.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ projectId });
      setCreating(false);
      setNewName("");
    },
  });

  const deleteNav = api.navigator.delete.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ projectId });
      setActiveNavId(null);
    },
  });

  const addUnit = api.navigator.addUnit.useMutation({
    onSuccess: (nav) => {
      void utils.navigator.list.invalidate({ projectId });
      void utils.unit.listByIds.invalidate();
      toast.success("Unit added to navigator", { description: `Added to "${nav.name}"` });
    },
    onError: () => {
      toast.error("Failed to add unit to navigator");
    },
  });

  const removeStep = api.navigator.removeStep.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ projectId });
      void utils.unit.listByIds.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove step");
    },
  });

  const autoRelate = api.ai.autoRelate.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate({ projectId });
      void utils.relation.listByUnits.invalidate();
      void utils.relation.listByUnit.invalidate();
      toast.success(`${result.created} relations created`, {
        description: `Analyzed ${result.analyzed} units${result.skippedDuplicates > 0 ? `, ${result.skippedDuplicates} duplicates skipped` : ""}`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to auto-relate units");
    },
  });

  const analyzeAndGenerate = api.navigator.analyzeAndGenerate.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate({ projectId });
      const autoMsg = result.autoCreatedRelations > 0
        ? ` (auto-created ${result.autoCreatedRelations} relations)`
        : "";
      toast.success(`${result.generated.length} paths generated`, {
        description: `Analyzed ${result.totalRelationsAnalyzed} relations across ${result.totalUnits} units${autoMsg}`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate paths");
    },
  });

  const proposeAndGenerate = api.navigator.proposeAndGenerate.useMutation({
    onSuccess: (result) => {
      setProposals(result.proposals);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to propose paths");
    },
  });

  const acceptProposals = api.navigator.acceptProposals.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate({ projectId });
      setProposals(null);
      toast.success(`${result.created.length} path${result.created.length !== 1 ? "s" : ""} created`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create paths");
    },
  });

  const detectBridgeGaps = api.ai.detectBridgeGaps.useMutation({
    onSuccess: (result) => {
      if (result.bridges.length === 0) {
        if (result.aiAnalyzed) {
          toast.success("No gaps detected — path flow looks good!");
        } else {
          toast.error("AI analysis failed — check server logs");
          setAnalyzingGaps(null);
        }
      }
    },
    onError: () => {
      toast.error("Failed to analyze path gaps");
      setAnalyzingGaps(null);
    },
  });

  const acceptBridgeUnits = api.ai.acceptBridgeUnits.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate({ projectId });
      toast.success(`${result.bridgesAdded} bridge${result.bridgesAdded !== 1 ? "s" : ""} added to path`);
    },
    onError: () => {
      toast.error("Failed to add bridges");
    },
  });

  const promoteBridge = api.ai.promoteBridge.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ projectId });
      void utils.unit.list.invalidate();
      void utils.unit.listByIds.invalidate();
      toast.success("Bridge promoted to real unit");
    },
    onError: () => {
      toast.error("Failed to promote bridge");
    },
  });

  const dismissBridge = api.ai.dismissBridge.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ projectId });
      toast.success("Bridge dismissed");
    },
    onError: () => {
      toast.error("Failed to dismiss bridge");
    },
  });

  const openPanel = usePanelStore((s) => s.openPanel);

  const handleStep = (step: number) => {
    setActiveStep(step);
    const unitId = activeNav?.path?.[step];
    if (unitId) {
      openPanel(unitId);
    }
  };

  // ── Keyboard navigation (fix #4) ─────────────────────────────────
  const containerRef = React.useRef<HTMLDivElement>(null);
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeNav || totalSteps === 0) return;
      if (e.key === "ArrowLeft" && activeStep > 0) {
        e.preventDefault();
        handleStep(activeStep - 1);
      } else if (e.key === "ArrowRight" && activeStep < totalSteps - 1) {
        e.preventDefault();
        handleStep(activeStep + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeNav, activeStep, totalSteps],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className="space-y-2 p-3"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-label="Navigator panel"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            <Compass className="h-3.5 w-3.5" /> Navigators
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreating(!creating)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {creating && (
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) createNav.mutate({ name: newName.trim(), projectId });
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Navigator name..."
              className="flex-1 rounded-lg border border-border bg-bg-primary px-2 py-1 text-xs placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            />
          </div>
        )}

        {navigators.length === 0 && !creating && (
          <p className="text-xs text-text-tertiary">No navigators yet. Create one or auto-generate from relations.</p>
        )}

        {navigators.map((nav) => (
          <div key={nav.id} className="rounded-lg border border-border bg-bg-primary">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveNavId(activeNavId === nav.id ? null : nav.id);
                  setActiveStep(0);
                }}
                className="flex flex-1 items-center justify-between px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover min-w-0"
              >
                <span className="truncate font-medium">{nav.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-tertiary">{nav.path?.length ?? 0} steps</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 text-text-tertiary transition-transform", activeNavId === nav.id && "rotate-90")} />
                </div>
              </button>
              {/* ── Add unit popover (fix #1) ──────────────────────── */}
              <AddUnitPopover
                projectId={projectId}
                navigatorId={nav.id}
                addUnit={addUnit}
              />
            </div>

            {activeNavId === nav.id && totalSteps > 0 && (
              <div className="border-t border-border p-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
                  <span>Step {activeStep + 1} of {totalSteps}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFlowReaderNav({ id: nav.id, path: nav.path ?? [], step: activeStep })}
                      className="px-2 py-0.5 rounded border border-border hover:bg-bg-hover hover:text-accent-primary flex items-center gap-1"
                      title="Open Flow Reader"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                    <button disabled={activeStep === 0} onClick={() => handleStep(activeStep - 1)} className="px-2 py-0.5 rounded border border-border disabled:opacity-40 hover:bg-bg-hover">
                      <span aria-hidden="true">&larr;</span>
                      <span className="sr-only">Previous step</span>
                    </button>
                    <button disabled={activeStep >= totalSteps - 1} onClick={() => handleStep(activeStep + 1)} className="px-2 py-0.5 rounded border border-border disabled:opacity-40 hover:bg-bg-hover">
                      <span aria-hidden="true">&rarr;</span>
                      <span className="sr-only">Next step</span>
                    </button>
                  </div>
                </div>
                {/* ── Step dots with tooltip + remove button (fixes #2, #3) ── */}
                <div className="flex gap-1 flex-wrap">
                  {nav.path?.map((unitId, i) => {
                    const unit = unitMap.get(unitId);
                    const preview = unit?.content
                      ? unit.content.slice(0, 50) + (unit.content.length > 50 ? "..." : "")
                      : `Step ${i + 1}`;
                    return (
                      <Tooltip key={`${unitId}-${i}`}>
                        <TooltipTrigger asChild>
                          <span className="group relative inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => handleStep(i)}
                              className={cn(
                                "h-2.5 w-2.5 rounded-full transition-colors",
                                i === activeStep ? "bg-accent-primary" : "bg-bg-hover hover:bg-border",
                              )}
                              aria-label={`Go to step ${i + 1}: ${preview}`}
                            />
                            {/* Remove button on hover (fix #2) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStep.mutate({ navigatorId: nav.id, stepIndex: i });
                                if (activeStep >= nav.path.length - 1 && activeStep > 0) {
                                  setActiveStep(activeStep - 1);
                                }
                              }}
                              className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                              aria-label={`Remove step ${i + 1}`}
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {preview}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {activeNavId === nav.id && totalSteps === 0 && (
              <div className="border-t border-border p-2">
                <p className="text-xs text-text-tertiary text-center py-2">
                  No steps yet. Click + to add units.
                </p>
              </div>
            )}

            {/* Inline bridges stored on navigator */}
            {activeNavId === nav.id && Array.isArray(nav.bridges) && (nav.bridges as Array<{ afterStepIndex: number; content: string; unitType: string; rationale?: string }>).length > 0 && (
              <div className="border-t border-border px-3 py-2 space-y-1.5">
                <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
                  Inline Bridges ({(nav.bridges as unknown[]).length})
                </p>
                {(nav.bridges as Array<{ afterStepIndex: number; content: string; unitType: string; rationale?: string }>).map((bridge, bi) => (
                  <div key={bi} className="rounded border border-dashed border-amber-500/40 bg-amber-500/5 p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">After step {bridge.afterStepIndex + 1}</span>
                        <span className="text-[10px] font-medium capitalize px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          {bridge.unitType}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          title="Promote to real unit"
                          disabled={promoteBridge.isPending}
                          onClick={() => promoteBridge.mutate({ navigatorId: nav.id, projectId, afterStepIndex: bridge.afterStepIndex })}
                          className="p-0.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          <ArrowUpFromLine className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Dismiss bridge"
                          disabled={dismissBridge.isPending}
                          onClick={() => dismissBridge.mutate({ navigatorId: nav.id, afterStepIndex: bridge.afterStepIndex })}
                          className="p-0.5 rounded text-text-tertiary hover:text-accent-danger transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-primary line-clamp-2">{bridge.content}</p>
                    {bridge.rationale && <p className="text-[10px] text-text-tertiary italic">{bridge.rationale}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Bridge gap analysis results (pending acceptance) */}
            {activeNavId === nav.id && analyzingGaps === nav.id && detectBridgeGaps.data && detectBridgeGaps.data.bridges.length > 0 && (
              <div className="border-t border-border px-3 py-2 space-y-2">
                <p className="text-xs font-medium text-accent-primary">
                  Bridge Suggestions ({detectBridgeGaps.data.bridges.length})
                </p>
                {detectBridgeGaps.data.bridges.map((bridge, bi) => (
                  <div key={bi} className="rounded-lg border border-border bg-bg-surface p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-tertiary">After step {bridge.afterStepIndex + 1}</span>
                      <span className="text-[10px] font-medium text-text-tertiary capitalize px-1 py-0.5 rounded bg-bg-secondary">
                        {bridge.unitType}
                      </span>
                    </div>
                    <p className="text-xs text-text-primary">{bridge.content}</p>
                    <p className="text-[10px] text-text-tertiary italic">{bridge.rationale}</p>
                  </div>
                ))}
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={acceptBridgeUnits.isPending}
                    onClick={() => {
                      acceptBridgeUnits.mutate({
                        navigatorId: nav.id,
                        bridges: detectBridgeGaps.data!.bridges.map((b) => ({
                          afterStepIndex: b.afterStepIndex,
                          content: b.content,
                          unitType: b.unitType,
                          rationale: b.rationale,
                          relationToPrev: b.relationToPrev,
                          relationToNext: b.relationToNext,
                        })),
                      });
                      setAnalyzingGaps(null);
                    }}
                    className="text-[10px] font-medium text-accent-primary hover:bg-accent-primary/10 px-2 py-1 rounded transition-colors"
                  >
                    {acceptBridgeUnits.isPending ? "Adding..." : "Accept all as inline bridges"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyzingGaps(null)}
                    className="text-[10px] text-text-tertiary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-hover transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Completeness suggestions */}
            {activeNavId === nav.id && analyzingGaps === nav.id && detectBridgeGaps.data && "completeness" in detectBridgeGaps.data && ((detectBridgeGaps.data as { completeness?: Array<{ suggestion: string; unitType: string; priority: string }> }).completeness ?? []).length > 0 && (
              <div className="border-t border-border px-3 py-2 space-y-1.5">
                <p className="text-xs font-medium text-text-secondary flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Completeness Suggestions
                </p>
                {((detectBridgeGaps.data as { completeness?: Array<{ suggestion: string; unitType: string; priority: string }> }).completeness ?? []).map((cs: { suggestion: string; unitType: string; priority: string }, ci: number) => (
                  <div key={ci} className="rounded border border-border bg-bg-surface p-2 flex items-start gap-2">
                    <span className={cn(
                      "shrink-0 mt-0.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase",
                      cs.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : cs.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                    )}>
                      {cs.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary">{cs.suggestion}</p>
                      <span className="text-[10px] text-text-tertiary capitalize">{cs.unitType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions row (visible when expanded) */}
            {activeNavId === nav.id && (
              <div className="border-t border-border px-2 py-1.5 flex items-center gap-1">
                {/* Analyze gaps button */}
                {(nav.path?.length ?? 0) >= 2 && (
                  <button
                    type="button"
                    disabled={detectBridgeGaps.isPending}
                    onClick={() => {
                      setAnalyzingGaps(nav.id);
                      detectBridgeGaps.mutate({ navigatorId: nav.id });
                    }}
                    className="text-[10px] text-accent-primary hover:bg-accent-primary/10 transition-colors px-1.5 py-0.5 rounded flex items-center gap-1"
                  >
                    {detectBridgeGaps.isPending && analyzingGaps === nav.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <ScanSearch className="h-2.5 w-2.5" />
                    )}
                    Analyze gaps
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteNav.mutate({ id: nav.id })}
                  disabled={deleteNav.isPending}
                  className="text-[10px] text-text-tertiary hover:text-accent-danger transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* AI Auto-Relate: analyze units and create relations */}
        <button
          type="button"
          disabled={autoRelate.isPending}
          onClick={() => autoRelate.mutate({ projectId })}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors",
            autoRelate.isPending
              ? "border-yellow-500/30 text-yellow-500/60 cursor-not-allowed"
              : "border-yellow-500/40 text-yellow-600 hover:border-yellow-500 hover:bg-yellow-500/5 dark:text-yellow-400",
          )}
        >
          {autoRelate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {autoRelate.isPending ? "AI analyzing units…" : "AI: Auto-create relations"}
        </button>

        {/* Show auto-relate results */}
        {autoRelate.data && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs text-text-secondary">
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {autoRelate.data.created} relations created
            </span>
            {" from "}{autoRelate.data.analyzed} units
          </div>
        )}

        {/* AI Auto-Generate paths (with preview) */}
        <button
          type="button"
          disabled={proposeAndGenerate.isPending}
          onClick={() => proposeAndGenerate.mutate({ projectId })}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors",
            proposeAndGenerate.isPending
              ? "border-accent-primary/30 text-accent-primary/60 cursor-not-allowed"
              : "border-accent-primary/40 text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5",
          )}
        >
          {proposeAndGenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {proposeAndGenerate.isPending ? "Analyzing & proposing paths…" : "AI: Propose navigation paths"}
        </button>

        {/* Flow Reader overlay */}
        {flowReaderNav && flowReaderNav.path.length > 0 && (
          <FlowReader
            path={flowReaderNav.path}
            initialStep={flowReaderNav.step}
            navigatorId={flowReaderNav.id}
            projectId={projectId}
            onClose={() => setFlowReaderNav(null)}
            onUnitSelect={(unitId) => openPanel(unitId)}
            onPathUpdated={() => void utils.navigator.list.invalidate({ projectId })}
          />
        )}

        {/* Path Preview Dialog */}
        {proposals && (
          <PathPreviewDialog
            proposals={proposals}
            isAccepting={acceptProposals.isPending}
            onAccept={(accepted) => {
              acceptProposals.mutate({
                proposals: accepted.map((p) => ({
                  name: p.name,
                  description: p.description,
                  purpose: p.purpose,
                  contextId: p.contextId,
                  path: p.path,
                })),
              });
            }}
            onClose={() => setProposals(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── AddUnitPopover: search-and-pick units in current context (fix #1) ───

interface AddUnitPopoverProps {
  projectId: string;
  navigatorId: string;
  addUnit: ReturnType<typeof api.navigator.addUnit.useMutation>;
}

function AddUnitPopover({ projectId, navigatorId, addUnit }: AddUnitPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: units, isLoading } = api.unit.list.useQuery(
    {
      projectId,
      limit: 30,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    },
    { enabled: open },
  );

  const candidates = units?.items ?? [];

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Search and add a unit"
          className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-text-tertiary hover:border-accent-primary hover:text-accent-primary transition-colors"
          aria-label="Add unit to navigator"
        >
          <Plus className="h-3 w-3" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-72 rounded-xl border border-border bg-bg-surface shadow-lg",
            "p-3 outline-none",
          )}
          sideOffset={6}
          align="end"
        >
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              autoFocus
              type="text"
              placeholder="Search units in project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm",
                "text-text-primary placeholder:text-text-tertiary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">
                {search ? "No matching units" : "No units in this project"}
              </p>
            ) : (
              <ul className="space-y-1">
                {candidates.map((unit) => (
                  <li key={unit.id}>
                    <button
                      type="button"
                      disabled={addUnit.isPending}
                      onClick={() => {
                        addUnit.mutate({ navigatorId, unitId: unit.id });
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        "text-text-primary hover:bg-bg-hover",
                        "focus:outline-none focus:bg-bg-hover",
                        "transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      <span className="line-clamp-2">{unit.content}</span>
                      <span className="mt-0.5 block text-xs text-text-tertiary capitalize">
                        {unit.unitType}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

