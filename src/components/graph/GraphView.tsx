"use client";

import * as React from "react";
import { GitMerge, X } from "lucide-react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { useViewStatePreservation } from "~/hooks/use-view-state-preservation";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { GlobalGraphCanvas } from "./GlobalGraphCanvas";
import { LocalCardArray } from "./LocalCardArray";
import { GraphControls } from "./GraphControls";
import { MergeUnitsDialog } from "./MergeUnitsDialog";

// ─── Props ────────────────────────────────────────────────────────────
interface GraphViewProps {
  projectId: string | undefined;
}

export function GraphView({ projectId }: GraphViewProps) {
  const layer = useGraphStore((s) => s.layer);
  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const panOffset = useGraphStore((s) => s.panOffset);
  const filters = useGraphStore((s) => s.filters);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setZoom = useGraphStore((s) => s.setZoom);
  const setPan = useGraphStore((s) => s.setPan);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  // ─── Merge mode state ─────────────────────────────────────────
  const [mergeMode, setMergeMode] = React.useState(false);
  const [mergeSourceId, setMergeSourceId] = React.useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState<string | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);

  const handleEnterMerge = React.useCallback(() => {
    setMergeMode(true);
    setMergeSourceId(null);
    setMergeTargetId(null);
  }, []);

  const handleCancelMerge = React.useCallback(() => {
    setMergeMode(false);
    setMergeSourceId(null);
    setMergeTargetId(null);
    setMergeDialogOpen(false);
  }, []);

  const handleNodeClickForMerge = React.useCallback(
    (nodeId: string) => {
      if (!mergeMode) return;
      if (!mergeSourceId) {
        setMergeSourceId(nodeId);
      } else if (nodeId !== mergeSourceId) {
        setMergeTargetId(nodeId);
        setMergeDialogOpen(true);
      }
    },
    [mergeMode, mergeSourceId],
  );

  const handleMerged = React.useCallback(
    (_targetUnitId: string) => {
      setMergeMode(false);
      setMergeSourceId(null);
      setMergeTargetId(null);
      setMergeDialogOpen(false);
    },
    [],
  );

  const handleMergeDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setMergeDialogOpen(open);
      if (!open) {
        // Reset target so user can pick again without re-entering merge mode
        setMergeTargetId(null);
      }
    },
    [],
  );

  // View state preservation — keyed by context + "graph"
  const viewStateId = `graph-view:${activeContextId ?? "global"}`;
  const {
    restored: restoredGraphState,
    saveZoomLevel,
    saveFilterState,
  } = useViewStatePreservation(viewStateId);

  // Restore graph-specific state on mount
  React.useEffect(() => {
    if (!restoredGraphState) return;

    // Restore zoom level
    if (restoredGraphState.zoomLevel !== 1) {
      setZoom(restoredGraphState.zoomLevel);
    }

    // Restore pan offset and selected node from filter state
    const savedPan = restoredGraphState.filterState?.panOffset as
      | { x: number; y: number }
      | undefined;
    if (savedPan) {
      setPan(savedPan);
    }

    const savedSelectedNode = restoredGraphState.filterState
      ?.selectedNodeId as string | undefined;
    if (savedSelectedNode) {
      setSelectedNode(savedSelectedNode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStateId]);

  // Sync graph state changes to view state preservation
  React.useEffect(() => {
    saveZoomLevel(zoomLevel);
  }, [zoomLevel, saveZoomLevel]);

  React.useEffect(() => {
    saveFilterState({
      panOffset,
      selectedNodeId,
      unitTypeFilters: filters.unitTypes,
      relationCategoryFilters: filters.relationCategories,
    });
  }, [panOffset, selectedNodeId, filters, saveFilterState]);

  // Fetch units for the current context/project
  const { data: unitsData } = api.unit.list.useQuery(
    {
      projectId: projectId!,
      contextId: activeContextId ?? undefined,
      limit: 100,
    },
    { enabled: !!projectId },
  );

  const units = unitsData?.items ?? [];

  const unitIds = React.useMemo(
    () => units.map((u) => u.id),
    [units],
  );

  // Fetch all relations for the visible units in a single batch query
  const { data: relationsData } = api.relation.listByUnits.useQuery(
    { unitIds, contextId: activeContextId ?? undefined },
    { enabled: unitIds.length > 0 },
  );

  const relations = React.useMemo(() => {
    if (!relationsData) return [];
    const seen = new Set<string>();
    const all: Array<{
      id: string;
      sourceUnitId: string;
      targetUnitId: string;
      type: string;
      strength: number;
      direction: string;
      isLoopback?: boolean;
    }> = [];
    for (const r of relationsData) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        all.push(r);
      }
    }
    return all;
  }, [relationsData]);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-bg-primary"
      role="application"
      aria-label="Thought connection graph"
    >
      <span className="sr-only">
        Use arrow keys to navigate between connected thoughts. Press Enter to
        view details.
      </span>

      {layer === "global" ? (
        <GlobalGraphCanvas
          units={units ?? []}
          relations={relations}
          onNodeClick={mergeMode ? handleNodeClickForMerge : undefined}
        />
      ) : (
        <LocalCardArray />
      )}

      <GraphControls />

      {/* Merge mode controls — shown only on global layer */}
      {layer === "global" && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          {mergeMode ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-surface/95 px-4 py-2 shadow-lg backdrop-blur-sm">
              <GitMerge className="h-4 w-4 text-accent-primary" />
              <span className="text-sm text-text-primary">
                {mergeSourceId
                  ? "Click the target unit to merge into"
                  : "Click the source unit to merge from"}
              </span>
              {mergeSourceId && (
                <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-xs font-mono text-accent-primary">
                  source selected
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6"
                onClick={handleCancelMerge}
                aria-label="Cancel merge"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-1.5 bg-bg-secondary/90 backdrop-blur-sm",
                    )}
                    onClick={handleEnterMerge}
                  >
                    <GitMerge className="h-4 w-4" />
                    <span className="hidden sm:inline">Merge Units</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Merge two semantically identical units</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Merge dialog — rendered when both units are selected */}
      {mergeSourceId && mergeTargetId && (
        <MergeUnitsDialog
          open={mergeDialogOpen}
          onOpenChange={handleMergeDialogOpenChange}
          sourceUnitId={mergeSourceId}
          targetUnitId={mergeTargetId}
          onMerged={handleMerged}
        />
      )}
    </div>
  );
}
