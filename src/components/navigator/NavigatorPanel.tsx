"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, ChevronRight, Compass, X, Search, Loader2, Sparkles, Play } from "lucide-react";
import { FlowReader } from "./FlowReader";
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
  contextId: string;
  projectId: string;
}

export function NavigatorPanel({ contextId, projectId }: NavigatorPanelProps) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [activeNavId, setActiveNavId] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);
  const [flowReaderNav, setFlowReaderNav] = React.useState<{ id: string; path: string[]; step: number } | null>(null);
  const utils = api.useUtils();

  const { data: navigators = [] } = api.navigator.list.useQuery({ contextId });

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
      void utils.navigator.list.invalidate({ contextId });
      setCreating(false);
      setNewName("");
    },
  });

  const deleteNav = api.navigator.delete.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ contextId });
      setActiveNavId(null);
    },
  });

  const addUnit = api.navigator.addUnit.useMutation({
    onSuccess: (nav) => {
      void utils.navigator.list.invalidate({ contextId });
      void utils.unit.listByIds.invalidate();
      toast.success("Unit added to navigator", { description: `Added to "${nav.name}"` });
    },
    onError: () => {
      toast.error("Failed to add unit to navigator");
    },
  });

  const removeStep = api.navigator.removeStep.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate({ contextId });
      void utils.unit.listByIds.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove step");
    },
  });

  const analyzeAndGenerate = api.navigator.analyzeAndGenerate.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate({ contextId });
      toast.success(`${result.generated.length} paths generated`, {
        description: `Analyzed ${result.totalRelationsAnalyzed} relations across ${result.totalUnits} units`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate paths");
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
                if (e.key === "Enter" && newName.trim()) createNav.mutate({ name: newName.trim(), contextId });
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Navigator name..."
              className="flex-1 rounded-lg border border-border bg-bg-primary px-2 py-1 text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
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
                contextId={contextId}
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

            {/* Actions row (visible when expanded) */}
            {activeNavId === nav.id && (
              <div className="border-t border-border px-2 py-1.5 flex items-center gap-1">
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

        {/* AI Auto-Generate section */}
        <button
          type="button"
          disabled={analyzeAndGenerate.isPending}
          onClick={() => analyzeAndGenerate.mutate({ contextId })}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors",
            analyzeAndGenerate.isPending
              ? "border-accent-primary/30 text-accent-primary/60 cursor-not-allowed"
              : "border-accent-primary/40 text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5",
          )}
        >
          {analyzeAndGenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {analyzeAndGenerate.isPending ? "Analyzing relations…" : "AI: Auto-generate paths"}
        </button>

        {/* Show generation results */}
        {analyzeAndGenerate.data && (
          <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-2 text-xs text-text-secondary space-y-1">
            <p className="font-medium text-accent-primary">
              {analyzeAndGenerate.data.generated.length} paths generated
            </p>
            {analyzeAndGenerate.data.generated.map((g) => (
              <div key={g.id} className="flex items-center justify-between">
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 text-text-tertiary">{g.steps} steps</span>
              </div>
            ))}
          </div>
        )}

        {/* Flow Reader overlay */}
        {flowReaderNav && flowReaderNav.path.length > 0 && (
          <FlowReader
            path={flowReaderNav.path}
            initialStep={flowReaderNav.step}
            navigatorId={flowReaderNav.id}
            contextId={contextId}
            projectId={projectId}
            onClose={() => setFlowReaderNav(null)}
            onUnitSelect={(unitId) => openPanel(unitId)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── AddUnitPopover: search-and-pick units in current context (fix #1) ───

interface AddUnitPopoverProps {
  contextId: string;
  projectId: string;
  navigatorId: string;
  addUnit: ReturnType<typeof api.navigator.addUnit.useMutation>;
}

function AddUnitPopover({ contextId, projectId, navigatorId, addUnit }: AddUnitPopoverProps) {
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
      contextId,
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
              placeholder="Search units in context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm",
                "text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-primary",
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
                {search ? "No matching units" : "No units in this context"}
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

