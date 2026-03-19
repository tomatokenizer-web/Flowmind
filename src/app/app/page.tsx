"use client";

import { useLayoutStore } from "~/stores/layout-store";
import { useDefaultProject } from "~/hooks/use-default-project";
import { useSidebarStore } from "~/stores/sidebar-store";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";
import { ContextView } from "~/components/context/context-view";
import { CaptureOverlay } from "~/components/unit/capture-mode";

export default function AppPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const { projectId, isLoading } = useDefaultProject();

  if (isLoading || !projectId) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  return (
    <>
      {/* Main view — switches based on toolbar view mode */}
      {viewMode === "graph" ? (
        <section aria-label="Graph view" className="h-[calc(100vh-48px)]">
          <GraphView projectId={projectId} />
        </section>
      ) : viewMode === "thread" ? (
        <section aria-label="Thread view" className="h-[calc(100vh-48px)]">
          <ThreadView projectId={projectId} onSwitchToGraph={() => setViewMode("graph")} />
        </section>
      ) : (
        <ContextView projectId={projectId} />
      )}

      {/* Capture modal overlay — CaptureBar is in AppShell (always visible) */}
      <CaptureOverlay projectId={projectId} contextId={activeContextId ?? ""} />
    </>
  );
}
