"use client";

import { useLayoutStore } from "~/stores/layout-store";
import { useProjectId, useProjectLoading } from "~/contexts/project-context";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useAssemblyStore } from "~/stores/assemblyStore";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";
import { AssemblyBoard } from "~/components/assembly/AssemblyBoard";
import { CaptureBar } from "~/components/unit/capture-bar";
import { CaptureOverlay } from "~/components/unit/capture-mode";

export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const activeAssemblyId = useAssemblyStore((s) => s.activeAssemblyId);
  const projectId = useProjectId();
  const isLoading = useProjectLoading();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  if (viewMode === "graph") {
    return (
      <>
        <section aria-label="Graph view" className="h-[calc(100vh-120px)]">
          <GraphView projectId={projectId} />
        </section>
        <CaptureBar />
        {projectId && <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />}
      </>
    );
  }

  if (viewMode === "thread") {
    return (
      <>
        <section aria-label="Thread view" className="h-[calc(100vh-120px)]">
          <ThreadView projectId={projectId} onSwitchToGraph={() => setViewMode("graph")} />
        </section>
        <CaptureBar />
        {projectId && <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />}
      </>
    );
  }

  if (viewMode === "assembly") {
    return (
      <section aria-label="Assembly view" className="h-[calc(100vh-48px)]">
        {activeAssemblyId && projectId ? (
          <AssemblyBoard assemblyId={activeAssemblyId} projectId={projectId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="font-medium text-text-secondary">No assembly selected</p>
            <p className="text-sm text-text-tertiary">Create an assembly from the sidebar to get started</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <ContextView projectId={projectId} />
      <CaptureBar />
      {projectId && (
        <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />
      )}
    </>
  );
}
