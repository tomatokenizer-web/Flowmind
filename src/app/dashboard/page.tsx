"use client";

import * as React from "react";
import { Plus, BookOpen, GitCompare, Wand2, Layers, GitMerge, Network, Zap, FolderOpen, Clock } from "lucide-react";
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

// ─── Project stats + quick actions bar (Story 9.7) ───────────────────

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}

function QuickActionCard({ icon: Icon, label, description, onClick, accent }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all",
        "hover:shadow-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        accent
          ? "border-accent-primary/30 bg-accent-primary/5 hover:bg-accent-primary/10"
          : "border-border bg-bg-primary hover:bg-bg-secondary",
      )}
    >
      <div className={cn("flex items-center gap-2", accent ? "text-accent-primary" : "text-text-secondary")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
      <p className="text-xs text-text-tertiary">{description}</p>
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
      <div className="flex flex-wrap gap-3 px-4 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 w-32 animate-pulse rounded-xl bg-bg-secondary" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* Key metrics row */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Project statistics">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2">
          <Layers className="h-4 w-4 text-accent-primary" aria-hidden="true" />
          <span className="text-xs text-text-tertiary">Units</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">{stats.totalUnits}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2">
          <FolderOpen className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          <span className="text-xs text-text-tertiary">Contexts</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">{stats.contextCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2">
          <GitMerge className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          <span className="text-xs text-text-tertiary">Assemblies</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">{stats.assemblyCount}</span>
        </div>
        {stats.mostActiveContext && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2 max-w-[220px]">
            <Zap className="h-4 w-4 text-lifecycle-pending-text" aria-hidden="true" />
            <span className="text-xs text-text-tertiary">Most active</span>
            <span className="truncate text-sm font-medium text-text-primary">
              {stats.mostActiveContext.name}
            </span>
            <span className="flex-shrink-0 text-xs tabular-nums text-text-tertiary">
              ({stats.mostActiveContext.unitCount})
            </span>
          </div>
        )}
        {stats.templateCompletion && (
          <div className="flex flex-col justify-center rounded-xl border border-border bg-bg-secondary px-3 py-2 min-w-[140px]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-text-tertiary">{stats.templateCompletion.templateName}</span>
              <span className="flex-shrink-0 text-xs tabular-nums text-text-tertiary">
                {stats.templateCompletion.answered}/{stats.templateCompletion.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
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
          </div>
        )}
      </div>

      {/* Quick actions row */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
        <QuickActionCard
          icon={Plus}
          label="Create Context"
          description="Organize units by theme"
          onClick={handleCreateContext}
          accent
        />
        <QuickActionCard
          icon={Zap}
          label="Start Capture"
          description="Add a new thought unit"
          onClick={handleStartCapture}
        />
        <QuickActionCard
          icon={Network}
          label="View Graph"
          description="Explore idea connections"
          onClick={handleViewGraph}
        />
      </div>
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
  const { data: assemblies = [], isLoading } = api.assembly.list.useQuery(
    { projectId: projectId },
    { enabled: !!projectId },
  );

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
            <div key={a.id} className="group flex flex-col gap-2 rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover transition-shadow">
              <button type="button" onClick={() => setActiveAssembly(a.id)} className="flex items-center gap-2 text-left min-w-0">
                <BookOpen className="h-4 w-4 text-accent-primary shrink-0" />
                <span className="font-medium text-text-primary truncate">{a.name}</span>
              </button>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">{a._count?.items ?? 0} units</span>
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
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bg-hover hover:text-accent-primary"
                  >
                    <GitCompare className="h-3 w-3" />
                    Compare
                  </button>
                )}
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
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {contexts.map((ctx: { id: string; name: string; description?: string | null; updatedAt: Date; _count?: { unitContexts?: number } }) => (
        <button
          key={ctx.id}
          type="button"
          onClick={() => setActiveContext(ctx.id)}
          className="flex flex-col gap-2 rounded-xl border border-border bg-bg-primary p-4 text-left hover:shadow-hover hover:border-accent-primary/30 transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 text-accent-primary shrink-0" />
            <span className="font-medium text-text-primary truncate">{ctx.name}</span>
          </div>
          {ctx.description && (
            <p className="text-xs text-text-tertiary line-clamp-2">{ctx.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-text-tertiary mt-auto pt-1">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {ctx._count?.unitContexts ?? 0} units
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(ctx.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
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

  // Clear active context when landing on the dashboard so breadcrumb shows
  // the overview grid instead of a stale context from a previous navigation.
  React.useEffect(() => {
    useSidebarStore.getState().setActiveContext(null);
  }, []);

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

  if (viewMode === "navigate" && activeContextId) {
    return (
      <NavigateView projectId={projectId} contextId={activeContextId} />
    );
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
