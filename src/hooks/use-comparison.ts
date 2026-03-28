"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

export type DiffStatus = "unique-a" | "unique-b" | "shared" | "relation-diff";

export interface RelationDiff {
  unitId: string;
  /** Relations present in side A but not B */
  onlyA: { type: string; targetId: string; targetContent: string }[];
  /** Relations present in side B but not A */
  onlyB: { type: string; targetId: string; targetContent: string }[];
}

export interface ComparisonState {
  sideA: UnitCardUnit[];
  sideB: UnitCardUnit[];
  shared: Set<string>;
  uniqueA: Set<string>;
  uniqueB: Set<string>;
  relationDiffs: Map<string, RelationDiff>;
  highlightedId: string | null;
  setHighlighted: (id: string | null) => void;
  isLoading: boolean;
  swap: () => void;
}

/* ─── Hook ─── */

export function useComparison(
  sideAIds: string[],
  sideBIds: string[],
): ComparisonState {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const [highlightedId, setHighlighted] = React.useState<string | null>(null);
  const [swapped, setSwapped] = React.useState(false);

  const effectiveA = swapped ? sideBIds : sideAIds;
  const effectiveB = swapped ? sideAIds : sideBIds;

  // Fetch all unique unit IDs
  const allIds = React.useMemo(() => {
    const set = new Set([...effectiveA, ...effectiveB]);
    return [...set];
  }, [effectiveA, effectiveB]);

  // Fetch units
  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: activeProjectId!,
      limit: 500,
    },
    { enabled: !!activeProjectId },
  );

  const unitItems = unitsQuery.data?.items ?? [];
  const unitMap = React.useMemo(() => {
    const map = new Map<string, UnitCardUnit>();
    for (const u of unitItems) {
      map.set(u.id, u as UnitCardUnit);
    }
    return map;
  }, [unitItems]);

  // Fetch relations for shared units to compute relation diffs
  const sharedIds = React.useMemo(() => {
    const setA = new Set(effectiveA);
    return effectiveB.filter((id) => setA.has(id));
  }, [effectiveA, effectiveB]);

  const relationQueries = api.useQueries((t) =>
    sharedIds.map((uid) =>
      t.relation.list({ unitId: uid }, { enabled: !!uid }),
    ),
  );

  // Compute sets
  const { shared, uniqueA, uniqueB } = React.useMemo(() => {
    const setA = new Set(effectiveA);
    const setB = new Set(effectiveB);
    const shared = new Set<string>();
    const uniqueA = new Set<string>();
    const uniqueB = new Set<string>();

    for (const id of effectiveA) {
      if (setB.has(id)) shared.add(id);
      else uniqueA.add(id);
    }
    for (const id of effectiveB) {
      if (!setA.has(id)) uniqueB.add(id);
    }

    return { shared, uniqueA, uniqueB };
  }, [effectiveA, effectiveB]);

  // Compute relation diffs for shared units
  const relationDiffs = React.useMemo(() => {
    const diffs = new Map<string, RelationDiff>();
    const setA = new Set(effectiveA);
    const setB = new Set(effectiveB);

    for (let i = 0; i < sharedIds.length; i++) {
      const uid = sharedIds[i]!;
      const relations = relationQueries[i]?.data ?? [];

      const onlyA: RelationDiff["onlyA"] = [];
      const onlyB: RelationDiff["onlyB"] = [];

      for (const rel of relations) {
        const isSource = rel.sourceUnitId === uid;
        const targetId = isSource ? rel.targetUnitId : rel.sourceUnitId;
        const targetContent = (isSource ? rel.targetUnit?.content : rel.sourceUnit?.content) ?? "Unknown";

        const inA = setA.has(targetId);
        const inB = setB.has(targetId);

        if (inA && !inB) {
          onlyA.push({ type: rel.type, targetId, targetContent });
        } else if (inB && !inA) {
          onlyB.push({ type: rel.type, targetId, targetContent });
        }
      }

      if (onlyA.length > 0 || onlyB.length > 0) {
        diffs.set(uid, { unitId: uid, onlyA, onlyB });
      }
    }

    return diffs;
  }, [sharedIds, relationQueries, effectiveA, effectiveB]);

  // Resolve items
  const sideA = React.useMemo(
    () => effectiveA.map((id) => unitMap.get(id)).filter(Boolean) as UnitCardUnit[],
    [effectiveA, unitMap],
  );

  const sideB = React.useMemo(
    () => effectiveB.map((id) => unitMap.get(id)).filter(Boolean) as UnitCardUnit[],
    [effectiveB, unitMap],
  );

  const swap = React.useCallback(() => setSwapped((s) => !s), []);

  return {
    sideA,
    sideB,
    shared,
    uniqueA,
    uniqueB,
    relationDiffs,
    highlightedId,
    setHighlighted,
    isLoading: unitsQuery.isLoading || relationQueries.some((q) => q.isLoading),
    swap,
  };
}
