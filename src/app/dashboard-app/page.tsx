"use client";

import { Layout, Focus, GitBranch } from "lucide-react";
import { useLayoutStore } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";

export default function DashboardPage() {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const toggleDetailPanel = useLayoutStore((s) => s.toggleDetailPanel);

  const modeConfig = {
    canvas: { icon: Layout, label: "Canvas View", description: "Spatial canvas for arranging thought units" },
    focus: { icon: Focus, label: "Focus View", description: "Distraction-free linear reading and writing" },
    graph: { icon: GitBranch, label: "Graph View", description: "Explore connections between thought units" },
  } as const;

  const current = modeConfig[viewMode];
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
