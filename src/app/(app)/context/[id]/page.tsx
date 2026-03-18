"use client";

import { use } from "react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { ContextView } from "~/components/context/context-view";

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

  if (activeContextId !== id) {
    setActiveContext(id);
  }

  return (
    <section aria-label="Context view">
      <ContextView projectId={DEFAULT_PROJECT_ID} />
    </section>
  );
}
