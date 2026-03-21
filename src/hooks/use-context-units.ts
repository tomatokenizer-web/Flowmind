"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import type { RouterOutputs } from "~/trpc/react";

type UnitListItem = RouterOutputs["unit"]["list"]["items"][number];

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

  // Cursor pagination state — reset when context/project changes
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [allItems, setAllItems] = React.useState<UnitListItem[]>([]);

  // Track whether we've processed the current query data to avoid duplicate appends
  const processedDataRef = React.useRef<string | null>(null);

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
      cursor,
      limit,
      sortBy,
      sortOrder,
    },
    { enabled: !!projectId },
  );

  // Reset pagination when context or project changes
  React.useEffect(() => {
    setCursor(undefined);
    setAllItems([]);
    processedDataRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContextId, projectId]);

  // Accumulate items across pages
  React.useEffect(() => {
    if (!unitsQuery.data?.items) return;

    // Deduplicate via a key based on first+last item IDs and cursor
    const dataKey = `${cursor ?? "first"}:${unitsQuery.data.items[0]?.id ?? ""}:${unitsQuery.data.items.at(-1)?.id ?? ""}`;
    if (processedDataRef.current === dataKey) return;
    processedDataRef.current = dataKey;

    if (cursor === undefined) {
      // First page — replace all items
      setAllItems(unitsQuery.data.items);
    } else {
      // Subsequent pages — append unique items
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        const newItems = unitsQuery.data!.items.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newItems];
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsQuery.data]);

  const fetchNextPage = React.useCallback(() => {
    const next = unitsQuery.data?.nextCursor;
    if (next) setCursor(next);
  }, [unitsQuery.data?.nextCursor]);

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
    units: allItems,
    nextCursor: unitsQuery.data?.nextCursor ?? null,
    hasNextPage: !!unitsQuery.data?.nextCursor,
    fetchNextPage,
    isFetchingNextPage: unitsQuery.isFetching && cursor !== undefined,
    perspectives: perspectivesQuery.data ?? [],
    perspectiveMap,
    activeContextId,
    isLoading: unitsQuery.isLoading && cursor === undefined,
    isContextLoading: contextQuery.isLoading,
    isPerspectivesLoading: perspectivesQuery.isLoading,
    error: unitsQuery.error ?? contextQuery.error,
    refetch: () => {
      setCursor(undefined);
      setAllItems([]);
      processedDataRef.current = null;
      void unitsQuery.refetch();
      void contextQuery.refetch();
      void perspectivesQuery.refetch();
    },
  };
}
