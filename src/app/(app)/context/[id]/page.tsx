"use client";

import { use } from "react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import { ContextView } from "~/components/context/context-view";
import { GraphView } from "~/components/graph/GraphView";

// ─── Default project placeholder ────────────────────────────────────
// TODO: Epic 9 — real project selector
const DEFAULT_PROJECT_ID: string | undefined = undefined;

// ─── Page ────────────────────────────────────────────────────────────

export default function ContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Sync the route param into the sidebar store so ContextView + sidebar stay in sync
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const viewMode = useLayoutStore((s) => s.viewMode);

  if (activeContextId !== id) {
    setActiveContext(id);
  }

  // Render GraphView when in graph mode
  if (viewMode === "graph") {
    return (
      <section aria-label="Graph view" className="h-full">
        <GraphView projectId={DEFAULT_PROJECT_ID} />
      </section>
    );
  }

  return (
    <section aria-label="Context view">
      <ContextView projectId={DEFAULT_PROJECT_ID} />
    </section>
  );
}
