"use client";

import React, { use } from "react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import { ContextView } from "~/components/context/context-view";
import { GraphView } from "~/components/graph/GraphView";
import { NavigateView } from "~/components/navigator/NavigateView";
import { AttentionView } from "~/components/attention/AttentionView";
import { useProjectId } from "~/contexts/project-context";

// ─── Page ────────────────────────────────────────────────────────────

export default function ContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = useProjectId();

  // Sync the route param into the sidebar store so ContextView + sidebar stay in sync
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const viewMode = useLayoutStore((s) => s.viewMode);

  React.useEffect(() => {
    if (activeContextId !== id) {
      setActiveContext(id);
    }
  }, [id, activeContextId, setActiveContext]);

  // Render GraphView when in graph mode
  if (viewMode === "graph") {
    return (
      <section aria-label="Graph view" className="h-full">
        <GraphView projectId={projectId} />
      </section>
    );
  }

  // Render NavigateView when in navigate mode
  if (viewMode === "navigate" && projectId) {
    return <NavigateView projectId={projectId} />;
  }

  // Render AttentionView when in attention mode
  if (viewMode === "attention" && projectId) {
    return <AttentionView projectId={projectId} />;
  }

  return (
    <section aria-label="Context view">
      <ContextView projectId={projectId} />
    </section>
  );
}
