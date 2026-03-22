"use client";

import * as React from "react";
import { Plus, BookOpen, GitCompare, Wand2 } from "lucide-react";
import { api } from "~/trpc/react";
import { useLayoutStore } from "~/stores/layout-store";
import { useProjectId, useProjectLoading } from "~/contexts/project-context";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useAssemblyStore } from "~/stores/assemblyStore";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";
import { AssemblyBoard } from "~/components/assembly/AssemblyBoard";
import { CreateContextDialog } from "~/components/context/CreateContextDialog";
import { CompletenessCompass } from "~/components/project/CompletenessCompass";
import { AssemblyTemplateDialog } from "~/components/assembly/AssemblyTemplateDialog";
import { AssemblyCompareDialog } from "~/components/assembly/AssemblyCompareDialog";
import { FormalizeWizard } from "~/components/formalize/FormalizeWizard";

// ─── Assembly view with list ──────────────────────────────────────────
function AssemblyViewWithList({ projectId, assemblyId }: { projectId: string | undefined; assemblyId: string | null }) {
  const setActiveAssembly = useAssemblyStore((s) => s.setActiveAssembly);
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState<[string, string] | null>(null);
  const [formalizeOpen, setFormalizeOpen] = React.useState(false);
  const { data: assemblies = [], isLoading } = api.assembly.list.useQuery(
    { projectId: projectId! },
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
export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const activeAssemblyId = useAssemblyStore((s) => s.activeAssemblyId);
  const projectId = useProjectId();
  const isLoading = useProjectLoading();
  const [createContextOpen, setCreateContextOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">No project selected. Create or select a project to get started.</p>
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

  return (
    <>
      {/* Completeness Compass — top-right of the context view */}
      {projectId && (
        <div className="flex justify-end px-4 pt-3">
          <CompletenessCompass />
        </div>
      )}
      <ContextView projectId={projectId} />
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
