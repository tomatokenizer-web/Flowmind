import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Common unit operations wrapping tRPC mutations.
 * Provides optimistic-update-friendly mutation functions with loading states.
 */
export function useUnitActions() {
  const utils = api.useUtils();
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const invalidateUnits = () => {
    void utils.unit.list.invalidate();
    void utils.context.getById.invalidate();
  };

  const createUnit = api.unit.create.useMutation({
    onSuccess: invalidateUnits,
  });

  const updateUnit = api.unit.update.useMutation({
    onSuccess: (_data, variables) => {
      void utils.unit.getById.invalidate({ id: variables.id });
      invalidateUnits();
    },
  });

  const archiveUnit = api.unit.archive.useMutation({
    onSuccess: invalidateUnits,
  });

  const discardUnit = api.unit.discard.useMutation({
    onSuccess: invalidateUnits,
  });

  const splitUnit = api.unit.split.useMutation({
    onSuccess: invalidateUnits,
  });

  const mergeUnits = api.unit.merge.useMutation({
    onSuccess: invalidateUnits,
  });

  return {
    create: (input: {
      content: string;
      primaryType?: string;
      contextId?: string;
    }) => {
      if (!activeProjectId) {
        throw new Error("No active project selected");
      }
      return createUnit.mutateAsync({
        content: input.content,
        projectId: activeProjectId,
        primaryType: input.primaryType ?? "claim",
        contextId: input.contextId,
      });
    },

    update: (input: {
      id: string;
      content?: string;
      primaryType?: string;
      lifecycle?: "draft" | "pending" | "confirmed" | "deferred" | "complete" | "archived" | "discarded";
      changeReason?: string;
    }) => updateUnit.mutateAsync(input),

    archive: (id: string) => archiveUnit.mutateAsync({ id }),

    discard: (id: string) => discardUnit.mutateAsync({ id }),

    split: (id: string, splitPosition: number) =>
      splitUnit.mutateAsync({ id, splitPosition }),

    merge: (unitIds: string[], separator?: string) =>
      mergeUnits.mutateAsync({ unitIds, separator }),

    // Loading states
    isCreating: createUnit.isPending,
    isUpdating: updateUnit.isPending,
    isArchiving: archiveUnit.isPending,
    isDiscarding: discardUnit.isPending,
    isSplitting: splitUnit.isPending,
    isMerging: mergeUnits.isPending,
    isAnyLoading:
      createUnit.isPending ||
      updateUnit.isPending ||
      archiveUnit.isPending ||
      discardUnit.isPending ||
      splitUnit.isPending ||
      mergeUnits.isPending,
  };
}
