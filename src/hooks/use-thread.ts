"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

export type ThreadSortOrder = "chronological" | "derivation" | "modified";

export interface ForkPoint {
  /** The unit ID where the fork occurs */
  unitId: string;
  /** Index in the current thread items */
  index: number;
  /** IDs of the branching child units */
  branches: string[];
}

export interface ThreadState {
  items: UnitCardUnit[];
  forkPoints: ForkPoint[];
  currentBranch: string[];
  sortOrder: ThreadSortOrder;
  setSortOrder: (order: ThreadSortOrder) => void;
  switchBranch: (forkUnitId: string, branchUnitId: string) => void;
  isLoading: boolean;
  /** Map of unitId -> outgoing cross-thread relation count */
  crossRelationCounts: Map<string, number>;
}

/* ─── Hook ─── */

export function useThread(options?: {
  contextId?: string;
  filterTypes?: string[];
  filterLifecycles?: string[];
}): ThreadState {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const contextId = options?.contextId ?? activeContextId;

  const [sortOrder, setSortOrder] = React.useState<ThreadSortOrder>("chronological");
  const [branchSelections, setBranchSelections] = React.useState<Map<string, string>>(
    new Map(),
  );

  // Fetch units
  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: activeProjectId!,
      contextId: contextId ?? undefined,
      limit: 200,
    },
    { enabled: !!activeProjectId },
  );

  const unitItems = unitsQuery.data?.items ?? [];
  const unitIds = React.useMemo(
    () => unitItems.map((u) => u.id),
    [unitItems],
  );

  // Fetch relations per unit for derivation ordering and fork detection
  const relationQueries = api.useQueries((t) =>
    unitIds.slice(0, 200).map((uid) =>
      t.relation.list({ unitId: uid }, { enabled: !!uid }),
    ),
  );

  const allRelationsLoading = relationQueries.some((q) => q.isLoading);

  // Build all relations from queries
  const allRelations = React.useMemo(() => {
    const relationMap = new Map<string, NonNullable<(typeof relationQueries)[number]["data"]>[number]>();
    for (const q of relationQueries) {
      for (const rel of q.data ?? []) {
        relationMap.set(rel.id, rel);
      }
    }
    return [...relationMap.values()];
  }, [relationQueries]);

  // Compute derivation graph: parent -> children
  const derivationGraph = React.useMemo(() => {
    const graph = new Map<string, string[]>();
    const childSet = new Set<string>();

    for (const rel of allRelations) {
      if (rel.type === "derives" || rel.type === "develops" || rel.type === "refines") {
        const parentId = rel.sourceUnitId;
        const childId = rel.targetUnitId;
        if (!graph.has(parentId)) graph.set(parentId, []);
        graph.get(parentId)!.push(childId);
        childSet.add(childId);
      }
    }

    return { graph, childSet };
  }, [allRelations]);

  // Cross-thread relation counts (relations pointing outside the current context)
  const crossRelationCounts = React.useMemo(() => {
    const unitIdSet = new Set(unitIds);
    const counts = new Map<string, number>();

    for (const rel of allRelations) {
      const isSourceIn = unitIdSet.has(rel.sourceUnitId);
      const isTargetIn = unitIdSet.has(rel.targetUnitId);

      // A relation is cross-thread if one end is in the thread and the other is not
      if (isSourceIn && !isTargetIn) {
        counts.set(rel.sourceUnitId, (counts.get(rel.sourceUnitId) ?? 0) + 1);
      }
      if (isTargetIn && !isSourceIn) {
        counts.set(rel.targetUnitId, (counts.get(rel.targetUnitId) ?? 0) + 1);
      }
    }

    return counts;
  }, [allRelations, unitIds]);

  // Sort and filter items
  const { items, forkPoints, currentBranch } = React.useMemo(() => {
    let sorted = [...unitItems] as unknown as UnitCardUnit[];

    // Apply type/lifecycle filters
    if (options?.filterTypes?.length) {
      const types = new Set(options.filterTypes);
      sorted = sorted.filter((u) => types.has(u.primaryType));
    }
    if (options?.filterLifecycles?.length) {
      const stages = new Set(options.filterLifecycles);
      sorted = sorted.filter((u) => stages.has(u.lifecycle));
    }

    // Sort
    switch (sortOrder) {
      case "chronological":
        sorted.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case "modified":
        sorted.sort(
          (a, b) => new Date(b.modifiedAt ?? b.createdAt).getTime() - new Date(a.modifiedAt ?? a.createdAt).getTime(),
        );
        break;
      case "derivation": {
        // Topological sort based on derivation relations
        const { graph, childSet } = derivationGraph;
        const roots = sorted.filter((u) => !childSet.has(u.id));
        const visited = new Set<string>();
        const result: UnitCardUnit[] = [];
        const unitMap = new Map(sorted.map((u) => [u.id, u]));

        function walk(id: string) {
          if (visited.has(id)) return;
          visited.add(id);
          const unit = unitMap.get(id);
          if (unit) result.push(unit);
          const children = graph.get(id) ?? [];
          // If there's a branch selection, follow that branch first
          const selected = branchSelections.get(id);
          if (selected && children.includes(selected)) {
            walk(selected);
            for (const child of children) {
              if (child !== selected) walk(child);
            }
          } else {
            for (const child of children) {
              walk(child);
            }
          }
        }

        for (const root of roots) walk(root.id);
        // Add any unvisited units at the end
        for (const unit of sorted) {
          if (!visited.has(unit.id)) {
            result.push(unit);
          }
        }
        sorted = result;
        break;
      }
    }

    // Compute fork points
    const forks: ForkPoint[] = [];
    const { graph } = derivationGraph;
    for (let i = 0; i < sorted.length; i++) {
      const unit = sorted[i]!;
      const children = graph.get(unit.id);
      if (children && children.length >= 2) {
        forks.push({
          unitId: unit.id,
          index: i,
          branches: children,
        });
      }
    }

    // Track current branch path (sequence of selected branch unit IDs)
    const branchPath: string[] = [];
    for (const fork of forks) {
      const sel = branchSelections.get(fork.unitId) ?? fork.branches[0];
      if (sel) branchPath.push(sel);
    }

    return { items: sorted, forkPoints: forks, currentBranch: branchPath };
  }, [unitItems, sortOrder, derivationGraph, branchSelections, options?.filterTypes, options?.filterLifecycles]);

  const switchBranch = React.useCallback(
    (forkUnitId: string, branchUnitId: string) => {
      setBranchSelections((prev) => {
        const next = new Map(prev);
        next.set(forkUnitId, branchUnitId);
        return next;
      });
    },
    [],
  );

  return {
    items,
    forkPoints,
    currentBranch,
    sortOrder,
    setSortOrder,
    switchBranch,
    isLoading: unitsQuery.isLoading || allRelationsLoading,
    crossRelationCounts,
  };
}
