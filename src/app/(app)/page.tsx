"use client";

import { Layout, Focus, GitBranch, List } from "lucide-react";
import { useLayoutStore } from "~/stores/layout-store";
import { useDefaultProject } from "~/hooks/use-default-project";
import { Button } from "~/components/ui/button";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";
import { CaptureOverlay } from "~/components/unit/capture-mode";
import { useSidebarStore } from "~/stores/sidebar-store";

export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const toggleDetailPanel = useLayoutStore((s) => s.toggleDetailPanel);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const { projectId, isLoading } = useDefaultProject();

  if (isLoading || !projectId) {
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

  return (
    <section aria-label="Dashboard" className="relative h-full">
      {/* Context / unit list view */}
      <ContextView projectId={projectId} />

      {/* Floating capture bar + overlay */}
      <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />
    </section>
  );
}
