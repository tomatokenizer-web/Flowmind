"use client";

import { use } from "react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import { useDefaultProject } from "~/hooks/use-default-project";
import { ContextView } from "~/components/context/context-view";
import { GraphView } from "~/components/graph/GraphView";
import { CaptureOverlay } from "~/components/unit/capture-mode";

export default function ContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { projectId, isLoading } = useDefaultProject();

  // Sync the route param into the sidebar store so ContextView + sidebar stay in sync
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const viewMode = useLayoutStore((s) => s.viewMode);

  if (activeContextId !== id) {
    setActiveContext(id);
  }

  if (isLoading || !projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  // Render GraphView when in graph mode
  if (viewMode === "graph") {
    return (
      <section aria-label="Graph view" className="h-full">
        <GraphView projectId={projectId} />
      </section>
    );
  }

  return (
    <section aria-label="Context view" className="relative h-full">
      <ContextView projectId={projectId} />
      <CaptureOverlay projectId={projectId} contextId={id} />
    </section>
  );
}
