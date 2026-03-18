"use client";

import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";

export interface UseContextUnitsOptions {
  projectId: string | undefined;
  contextId?: string | null;
  limit?: number;
  sortBy?: "createdAt" | "modifiedAt" | "importance";
  sortOrder?: "asc" | "desc";
}

export function useContextUnits({
  projectId,
  contextId: contextIdOverride,
  limit = 20,
  sortBy = "createdAt",
  sortOrder = "desc",
}: UseContextUnitsOptions) {
  const storeContextId = useSidebarStore((s) => s.activeContextId);
  const activeContextId = contextIdOverride !== undefined ? contextIdOverride : storeContextId;

  // Fetch context metadata when a context is active
  const contextQuery = api.context.getById.useQuery(
    { id: activeContextId! },
    { enabled: !!activeContextId },
  );

  // Fetch units filtered by context (or all units when no context)
  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: projectId!,
      contextId: activeContextId ?? undefined,
      limit,
      sortBy,
      sortOrder,
    },
    { enabled: !!projectId },
  );

  // Fetch perspectives for the active context
  const perspectivesQuery = api.perspective.getForContext.useQuery(
    { contextId: activeContextId! },
    { enabled: !!activeContextId },
  );

  // Build a map of unitId → perspective for quick lookup
  const perspectiveMap = new Map(
    (perspectivesQuery.data ?? []).map((p: { unitId: string }) => [p.unitId, p]),
  );

  return {
    context: contextQuery.data ?? null,
    units: unitsQuery.data?.items ?? [],
    nextCursor: unitsQuery.data?.nextCursor ?? null,
    perspectives: perspectivesQuery.data ?? [],
    perspectiveMap,
    activeContextId,
    isLoading: unitsQuery.isLoading,
    isContextLoading: contextQuery.isLoading,
    isPerspectivesLoading: perspectivesQuery.isLoading,
    error: unitsQuery.error ?? contextQuery.error,
    refetch: () => {
      void unitsQuery.refetch();
      void contextQuery.refetch();
      void perspectivesQuery.refetch();
    },
  };
}
