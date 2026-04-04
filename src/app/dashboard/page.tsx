"use client";

import * as React from "react";
import { Plus, BookOpen, GitCompare, Wand2, Layers, GitMerge, Network, Zap, FolderOpen, Clock, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { useLayoutStore } from "~/stores/layout-store";
import { useProjectId, useProjectLoading } from "~/contexts/project-context";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useAssemblyStore } from "~/stores/assemblyStore";
import { useCaptureStore } from "~/stores/capture-store";
import { cn } from "~/lib/utils";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";
import { AssemblyBoard } from "~/components/assembly/AssemblyBoard";
import { NavigateView } from "~/components/navigator/NavigateView";
import { CreateContextDialog } from "~/components/context/CreateContextDialog";
import { CompletenessCompass } from "~/components/project/CompletenessCompass";
import { AssemblyTemplateDialog } from "~/components/assembly/AssemblyTemplateDialog";
import { AssemblyCompareDialog } from "~/components/assembly/AssemblyCompareDialog";
import { FormalizeWizard } from "~/components/formalize/FormalizeWizard";
import { AttentionView } from "~/components/attention/AttentionView";

// ─── Project stats + quick actions bar ────────────────────────────────

function StatChip({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-2.5 py-1">
      <Icon className={cn("h-3 w-3 shrink-0", accent ? "text-accent-primary" : "text-text-tertiary")} aria-hidden="true" />
      <span className="text-[10px] text-text-tertiary">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  accent?: boolean;
}

function QuickActionButton({ icon: Icon, label, onClick, accent }: Omit<QuickActionProps, "description"> & { accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-fast",
        "hover:shadow-sm hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        accent
          ? "border-accent-primary/40 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15"
          : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function ProjectStatsBar({ projectId, onCreateContext }: { projectId: string; onCreateContext: () => void }) {
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  const { data: stats, isLoading } = api.project.getProjectStats.useQuery(
    { projectId },
    { staleTime: 60_000 },
  );

  const handleCreateContext = React.useCallback(() => {
    onCreateContext();
  }, [onCreateContext]);

  const handleStartCapture = React.useCallback(() => {
    useCaptureStore.getState().open();
  }, []);

  const handleViewGraph = React.useCallback(() => {
    setViewMode("graph");
  }, [setViewMode]);

  if (isLoading) {
    return (
      <div className="px-6 pt-5 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[72, 88, 96, 140].map((w, i) => (
              <div key={i} className="h-8 rounded-lg bg-bg-secondary" style={{ width: w }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {[76, 76, 68].map((w, i) => (
              <div key={i} className="h-8 rounded-lg bg-bg-secondary" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="px-6 pt-5 flex flex-col gap-3">
      {/* Single row: stats + actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Project statistics">
          <StatChip icon={Layers} label="Units" value={stats.totalUnits} accent />
          <StatChip icon={FolderOpen} label="Contexts" value={stats.contextCount} />
          <StatChip icon={GitMerge} label="Assemblies" value={stats.assemblyCount} />
          {stats.mostActiveContext && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-2.5 py-1 max-w-[200px]">
              <Zap className="h-3 w-3 text-lifecycle-pending-text shrink-0" aria-hidden="true" />
              <span className="truncate text-xs text-text-secondary">
                {stats.mostActiveContext.name}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-text-tertiary">
                {stats.mostActiveContext.unitCount}
              </span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Quick actions">
          <QuickActionButton icon={Plus} label="Context" onClick={handleCreateContext} accent />
          <QuickActionButton icon={Zap} label="Capture" onClick={handleStartCapture} />
          <QuickActionButton icon={Network} label="Graph" onClick={handleViewGraph} />
        </div>
      </div>

      {/* Template completion bar (if exists) */}
      {stats.templateCompletion && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-1.5">
          <span className="truncate text-xs text-text-tertiary">{stats.templateCompletion.templateName}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-primary">
            <div
              className="h-full rounded-full bg-accent-primary transition-all"
              style={{ width: `${stats.templateCompletion.pct}%` }}
              role="progressbar"
              aria-valuenow={stats.templateCompletion.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Template completion: ${stats.templateCompletion.pct}%`}
            />
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-text-tertiary">
            {stats.templateCompletion.answered}/{stats.templateCompletion.total}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Assembly view with list ──────────────────────────────────────────
function AssemblyViewWithList({ projectId, assemblyId }: { projectId: string | undefined; assemblyId: string | null }) {
  const setActiveAssembly = useAssemblyStore((s) => s.setActiveAssembly);
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState<[string, string] | null>(null);
  const [formalizeOpen, setFormalizeOpen] = React.useState(false);
  const utils = api.useUtils();
  const { data: assemblies = [], isLoading } = api.assembly.list.useQuery(
    { projectId: projectId },
    { enabled: !!projectId },
  );
  const deleteAssembly = api.assembly.delete.useMutation({
    onSuccess: () => {
      void utils.assembly.list.invalidate();
      void utils.project.getProjectStats.invalidate();
    },
  });

  if (assemblyId && projectId) {
    return (
      <section aria-label="Assembly view" className="h-[calc(100vh-48px)]">
        <AssemblyBoard assemblyId={assemblyId} projectId={projectId} />
      </section>
    );
  }

  return (
    <section aria-label="Assembly list" className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-text-primary">Assemblies</h2>
        {projectId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormalizeOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Wand2 className="h-4 w-4 text-accent-primary" /> Convert to Template
            </button>
            <button
              onClick={() => setTemplateDialogOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> New Assembly
            </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-bg-secondary" />)}
        </div>
      ) : assemblies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BookOpen className="h-10 w-10 text-text-tertiary" />
          <p className="font-medium text-text-secondary">No assemblies yet</p>
          <p className="text-sm text-text-tertiary">Create one to compose your thoughts into documents</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assemblies.map((a: { id: string; name: string; updatedAt: Date; _count?: { items: number } }) => (
            <div key={a.id} className="group flex flex-col gap-2 rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover hover:-translate-y-px transition-all duration-fast">
              <button type="button" onClick={() => setActiveAssembly(a.id)} className="flex items-center gap-2 text-left min-w-0">
                <BookOpen className="h-4 w-4 text-accent-primary shrink-0" />
                <span className="font-medium text-text-primary truncate">{a.name}</span>
              </button>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">{a._count?.items ?? 0} units</span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {assemblies.length >= 2 && (
                    <button
                      type="button"
                      title="Compare with another assembly"
                      onClick={() => {
                        const other = assemblies.find((b: { id: string }) => b.id !== a.id);
                        if (other) {
                          setCompareIds([a.id, other.id]);
                          setCompareDialogOpen(true);
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium text-text-tertiary hover:bg-bg-hover hover:text-accent-primary"
                    >
                      <GitCompare className="h-3 w-3" />
                      Compare
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete assembly"
                    onClick={() => {
                      if (window.confirm(`Delete "${a.name}"? This cannot be undone.`)) {
                        deleteAssembly.mutate({ id: a.id });
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium text-text-tertiary hover:bg-accent-danger/10 hover:text-accent-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projectId && (
        <AssemblyTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          projectId={projectId}
          onCreated={(id) => setActiveAssembly(id)}
        />
      )}

      {compareIds && (
        <AssemblyCompareDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
          initialAssemblyAId={compareIds[0]}
          initialAssemblyBId={compareIds[1]}
          assemblies={assemblies as Array<{ id: string; name: string }>}
        />
      )}

      {projectId && (
        <FormalizeWizard
          open={formalizeOpen}
          onOpenChange={setFormalizeOpen}
          projectId={projectId}
          onSuccess={(assemblyId) => setActiveAssembly(assemblyId)}
        />
      )}
    </section>
  );
}
// ─── Context overview grid (shown when no context is selected) ────────
function ContextOverviewGrid({ projectId, onCreateContext }: { projectId: string; onCreateContext: () => void }) {
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const { data: contexts = [], isLoading } = api.context.list.useQuery(
    { projectId },
    { staleTime: 30_000 },
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-secondary" />
        ))}
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
        <FolderOpen className="h-10 w-10 text-text-tertiary" />
        <p className="font-medium text-text-secondary">No contexts yet</p>
        <p className="text-sm text-text-tertiary">Create a context to start organizing your units.</p>
        <button
          type="button"
          onClick={onCreateContext}
          className="mt-2 flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Context
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">Contexts</h2>
        <span className="text-xs text-text-tertiary">{contexts.length} total</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {contexts.map((ctx: { id: string; name: string; description?: string | null; updatedAt: Date; _count?: { unitContexts?: number } }) => {
          const unitCount = ctx._count?.unitContexts ?? 0;
          const isActive = unitCount > 0;
          return (
            <button
              key={ctx.id}
              type="button"
              onClick={() => setActiveContext(ctx.id)}
              className={cn(
                "group flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all duration-fast",
                "hover:-translate-y-px hover:shadow-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                isActive
                  ? "border-border bg-bg-primary hover:border-accent-primary/30"
                  : "border-dashed border-border/60 bg-bg-secondary/50 hover:border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className={cn("h-4 w-4 shrink-0", isActive ? "text-accent-primary" : "text-text-tertiary")} />
                  <span className="font-medium text-text-primary truncate">{ctx.name}</span>
                </div>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-accent-primary">
                    {unitCount}
                  </span>
                )}
              </div>
              {ctx.description && (
                <p className="text-xs text-text-tertiary line-clamp-2">{ctx.description}</p>
              )}
              <div className="flex items-center gap-3 text-[10px] text-text-tertiary mt-auto pt-0.5">
                <span className="flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5" />
                  {unitCount} unit{unitCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(ctx.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const activeAssemblyId = useAssemblyStore((s) => s.activeAssemblyId);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const isLoading = useProjectLoading();
  const [createContextOpen, setCreateContextOpen] = React.useState(false);

  // Auto-select first context only on initial mount (not when user explicitly clicks Home)
  const { data: contextList } = api.context.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId, staleTime: 30_000 },
  );
  const hasAutoSelected = React.useRef(false);
  React.useEffect(() => {
    if (!hasAutoSelected.current && !activeContextId && contextList && contextList.length > 0) {
      hasAutoSelected.current = true;
      useSidebarStore.getState().setActiveContext(contextList[0]!.id);
    }
  }, [activeContextId, contextList]);

  // Clear active assembly when switching away from assembly view mode
  React.useEffect(() => {
    if (viewMode !== "assembly") {
      useAssemblyStore.getState().setActiveAssembly(null);
    }
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <FolderOpen className="h-12 w-12 text-text-tertiary" />
        <p className="text-sm text-text-secondary">No project selected.</p>
        <p className="text-xs text-text-tertiary">Create or select a project to get started.</p>
      </div>
    );
  }

  if (viewMode === "graph") {
    return (
      <section aria-label="Graph view" className="h-[calc(100vh-120px)]">
        <GraphView projectId={projectId} />
      </section>
    );
  }

  if (viewMode === "thread") {
    return (
      <section aria-label="Thread view" className="h-[calc(100vh-120px)]">
        <ThreadView projectId={projectId} onSwitchToGraph={() => setViewMode("graph")} />
      </section>
    );
  }

  if (viewMode === "assembly") {
    return (
      <AssemblyViewWithList projectId={projectId} assemblyId={activeAssemblyId} />
    );
  }

  if (viewMode === "navigate") {
    return <NavigateView projectId={projectId} />;
  }

  if (viewMode === "attention") {
    return <AttentionView projectId={projectId} />;
  }

  return (
    <>
      {/* Story 9.7: Project stats + quick actions */}
      <ProjectStatsBar projectId={projectId} onCreateContext={() => setCreateContextOpen(true)} />

      {activeContextId ? (
        <>
          {/* Completeness Compass — top-right of the context view */}
          <div className="flex justify-end px-4 pt-3">
            <CompletenessCompass />
          </div>
          <ContextView projectId={projectId} />
        </>
      ) : (
        /* No context selected — show context overview grid */
        <ContextOverviewGrid
          projectId={projectId}
          onCreateContext={() => setCreateContextOpen(true)}
        />
      )}

      {projectId && (
        <CreateContextDialog
          open={createContextOpen}
          onOpenChange={setCreateContextOpen}
          projectId={projectId}
          onCreated={(id) => {
            useSidebarStore.getState().setActiveContext(id);
          }}
        />
      )}
    </>
  );
}
