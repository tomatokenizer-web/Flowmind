import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Derives the active context data by reading activeContextId from workspace store
 * and fetching the context + its units via tRPC.
 */
export function useActiveContext() {
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const contextQuery = api.context.getById.useQuery(
    { id: activeContextId! },
    { enabled: !!activeContextId },
  );

  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: activeProjectId!,
      contextId: activeContextId!,
    },
    { enabled: !!activeContextId && !!activeProjectId },
  );

  return {
    context: contextQuery.data ?? null,
    units: unitsQuery.data?.items ?? [],
    nextCursor: unitsQuery.data?.nextCursor,
    isLoading: contextQuery.isLoading || unitsQuery.isLoading,
    isError: contextQuery.isError || unitsQuery.isError,
    error: contextQuery.error ?? unitsQuery.error ?? null,
    refetch: () => {
      void contextQuery.refetch();
      void unitsQuery.refetch();
    },
  };
}
