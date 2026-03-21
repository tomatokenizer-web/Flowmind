"use client";

import { useLayoutStore } from "~/stores/layout-store";
import { useProjectId, useProjectLoading } from "~/contexts/project-context";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";

export default function AppPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
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

  return <ContextView projectId={projectId} />;
}
