"use client";

import { Layout, Focus, GitBranch, List } from "lucide-react";
import { useLayoutStore } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";
import { GraphView } from "~/components/graph/GraphView";
import { ThreadView } from "~/components/thread/ThreadView";

// ─── Default project placeholder ────────────────────────────────────
// TODO: Epic 9 — real project selector
const DEFAULT_PROJECT_ID: string | undefined = undefined;

export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const toggleDetailPanel = useLayoutStore((s) => s.toggleDetailPanel);

  const setViewMode = useLayoutStore((s) => s.setViewMode);

  // Render GraphView when in graph mode
  if (viewMode === "graph") {
    return (
      <section aria-label="Graph view" className="h-[calc(100vh-120px)]">
        <GraphView projectId={DEFAULT_PROJECT_ID} />
      </section>
    );
  }

  // Render ThreadView when in thread mode
  if (viewMode === "thread") {
    return (
      <section aria-label="Thread view" className="h-[calc(100vh-120px)]">
        <ThreadView
          projectId={DEFAULT_PROJECT_ID}
          onSwitchToGraph={() => setViewMode("graph")}
        />
      </section>
    );
  }

  const modeConfig = {
    canvas: { icon: Layout, label: "Canvas View", description: "Spatial canvas for arranging thought units" },
    focus: { icon: Focus, label: "Focus View", description: "Distraction-free linear reading and writing" },
  } as const;

  const current = modeConfig[viewMode as keyof typeof modeConfig] ?? { icon: Layout, label: "Canvas View", description: "Spatial canvas" };
  const Icon = current.icon;

  return (
    <section aria-label="Dashboard">
      <div className="flex flex-col items-center justify-center gap-space-6 py-space-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary">
          <Icon className="h-8 w-8 text-text-tertiary" />
        </div>
        <div className="flex flex-col gap-space-2">
          <h1 className="font-heading text-xl text-text-primary">
            {current.label}
          </h1>
          <p className="max-w-sm text-sm text-text-secondary">
            {current.description}
          </p>
        </div>
        <Button variant="ghost" onClick={toggleDetailPanel}>
          Toggle Detail Panel
        </Button>
      </div>
    </section>
  );
}
