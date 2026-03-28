"use client";

import * as React from "react";
import { use } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ViewMode } from "@/stores/workspace-store";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { useThemeStore } from "@/stores/theme-store";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";
import { ContextView } from "~/components/domain/context";
import { GraphCanvas } from "~/components/domain/graph";
import { FlowReadingView } from "~/components/domain/navigator";
import { BoardCanvas } from "~/components/domain/board";
import { ThreadView } from "~/components/domain/thread";
import { ComparisonView } from "~/components/domain/comparison";

/* ─── Loading skeleton ─── */

function ContextSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton height="28px" width="240px" />
      <Skeleton height="16px" width="160px" />
      <div className="grid gap-3 mt-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setActiveContext = useWorkspaceStore((s) => s.setActiveContext);

  // Set active context on mount
  React.useEffect(() => {
    setActiveContext(id);
    return () => setActiveContext(null);
  }, [id, setActiveContext]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <ContextSkeleton />;

  return <ContextViewRouter contextId={id} viewMode={viewMode} />;
}

/* ─── View Router ─── */

function ContextViewRouter({
  contextId,
  viewMode,
}: {
  contextId: string;
  viewMode: ViewMode;
}) {
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const selectedUnitIds = useUnitSelectionStore((s) => s.selectedUnitIds);

  switch (viewMode) {
    case "graph":
      return <GraphCanvas />;
    case "reading":
      return <FlowReadingView path={[]} expertiseLevel={expertiseLevel} />;
    case "board":
      return <BoardCanvas />;
    case "thread":
      return <ThreadView contextId={contextId} />;
    case "comparison": {
      // Split selected units into two sides for comparison
      const ids = [...selectedUnitIds];
      const mid = Math.ceil(ids.length / 2);
      return (
        <ComparisonView
          sideAIds={ids.slice(0, mid)}
          sideBIds={ids.slice(mid)}
          onClose={() => {
            // Switch back to list view when closing comparison
            useWorkspaceStore.getState().setViewMode("list");
          }}
        />
      );
    }
    case "list":
    default:
      return <ContextView contextId={contextId} />;
  }
}
