"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { GlobalGraphCanvas } from "./GlobalGraphCanvas";
import { LocalCardArray } from "./LocalCardArray";
import { GraphControls } from "./GraphControls";

export function GraphView() {
  const layer = useGraphStore((s) => s.layer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  const { data: units } = api.unit.list.useQuery(
    { contextId: activeContextId ?? undefined },
  );

  const unitIds = React.useMemo(
    () => (units ?? []).map((u) => u.id),
    [units],
  );

  // Fetch relations for all visible units
  // We'll aggregate from listByUnit for each unit, deduped
  const relationsQueries = api.useQueries((t) =>
    unitIds.slice(0, 50).map((id) =>
      t.relation.listByUnit({ unitId: id, contextId: activeContextId ?? undefined }),
    ),
  );

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
