"use client";

import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";

// ─── Types ───────────────────────────────────────────────────────────

export interface SplitInput {
  contextId: string;
  subContextA: { name: string; unitIds: string[] };
  subContextB: { name: string; unitIds: string[] };
  projectId: string;
}

export interface MergeInput {
  contextIdA: string;
  contextIdB: string;
  mergedName: string;
  conflictResolutions?: Array<{ unitId: string; keepFrom: "A" | "B" }>;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useContextActions(_projectId: string | undefined) {
  const utils = api.useUtils();
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const expandNode = useSidebarStore((s) => s.expandNode);

  const invalidate = useCallback(() => {
    void utils.context.list.invalidate();
  }, [utils]);

  // ── Split ──

  const splitMutation = api.context.split.useMutation({
    onSuccess: (_data, variables) => {
      invalidate();
      expandNode(variables.contextId);
    },
  });

  const splitContext = useCallback(
    async (input: SplitInput) => {
      return splitMutation.mutateAsync(input);
    },
    [splitMutation],
  );

  // ── Merge ──

  const mergeMutation = api.context.merge.useMutation({
    onSuccess: (data) => {
      invalidate();
      if (data?.id) {
        setActiveContext(data.id);
      }
    },
  });

  const mergeContexts = useCallback(
    async (input: MergeInput) => {
      return mergeMutation.mutateAsync(input);
    },
    [mergeMutation],
  );

  // ── Units for context (used by split dialog) ──

  function useUnitsForContext(contextId: string | null) {
    return api.context.getUnitsForContext.useQuery(
      { id: contextId ?? undefined },
      { enabled: !!contextId },
    );
  }

  // ── Merge conflicts (used by merge dialog) ──

  function useMergeConflicts(contextIdA: string | null, contextIdB: string | null) {
    return api.context.getMergeConflicts.useQuery(
      { contextIdA: contextIdA!, contextIdB: contextIdB! },
      { enabled: !!contextIdA && !!contextIdB },
    );
  }

  return {
    splitContext,
    isSplitting: splitMutation.isPending,
    splitError: splitMutation.error,

    mergeContexts,
    isMerging: mergeMutation.isPending,
    mergeError: mergeMutation.error,

    useUnitsForContext,
    useMergeConflicts,
  };
}
