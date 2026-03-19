"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { GlobalGraphCanvas } from "./GlobalGraphCanvas";
import { LocalCardArray } from "./LocalCardArray";
import { GraphControls } from "./GraphControls";

// ─── Props ────────────────────────────────────────────────────────────
interface GraphViewProps {
  projectId: string | undefined;
}

export function GraphView({ projectId }: GraphViewProps) {
  const layer = useGraphStore((s) => s.layer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

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

  // Fetch relations for all units via a single query per visible unit
  // Using individual queries since tRPC v11 doesn't have useQueries on the api object
  const firstBatchIds = unitIds.slice(0, 10);

  const r0 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[0]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[0] },
  );
  const r1 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[1]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[1] },
  );
  const r2 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[2]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[2] },
  );
  const r3 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[3]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[3] },
  );
  const r4 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[4]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[4] },
  );
  const r5 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[5]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[5] },
  );
  const r6 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[6]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[6] },
  );
  const r7 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[7]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[7] },
  );
  const r8 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[8]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[8] },
  );
  const r9 = api.relation.listByUnit.useQuery(
    { unitId: firstBatchIds[9]!, contextId: activeContextId ?? undefined },
    { enabled: !!firstBatchIds[9] },
  );

  const relationsQueries = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9];

  const relations = React.useMemo(() => {
    const seen = new Set<string>();
    const all: Array<{
      id: string;
      sourceUnitId: string;
      targetUnitId: string;
      type: string;
      strength: number;
      direction: string;
    }> = [];

    for (const q of relationsQueries) {
      if (!q.data) continue;
      for (const r of q.data) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          all.push(r);
        }
      }
    }
    return all;
  }, [relationsQueries]);

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
        <GlobalGraphCanvas units={units ?? []} relations={relations} />
      ) : (
        <LocalCardArray />
      )}

      <GraphControls />
    </div>
  );
}
