"use client";

import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useUndoStore } from "~/stores/undo-store";
import type { UnitSnapshot } from "~/lib/undo-actions";
import { broadcastChange } from "~/lib/cross-tab-sync";

/**
 * Wraps unit tRPC mutations with undo stack integration.
 *
 * Usage:
 *   const { createUnit, updateUnit, deleteUnit, reorderUnit } = useUnitMutations({ projectId });
 */
export function useUnitMutations({ projectId }: { projectId: string }) {
  const utils = api.useUtils();
  const pushAction = useUndoStore((s) => s.pushAction);

  // ── Create ──────────────────────────────────────────────────────────
  const createMutation = api.unit.create.useMutation({
    onSuccess: (unit) => {
      pushAction({
        type: "unit.create",
        unitId: unit.id,
        snapshot: {
          id: unit.id,
          content: unit.content,
          unitType: unit.unitType,
          lifecycle: unit.lifecycle,
          projectId,
        },
        description: `Created: "${unit.content.slice(0, 40)}"`,
      });
      void utils.unit.list.invalidate();
      void utils.unit.hasAny.invalidate();
      broadcastChange("unit.created", { entityId: unit.id, projectId });
    },
  });

  const createUnit = useCallback(
    (content: string, opts?: { unitType?: string }) => {
      return createMutation.mutateAsync({
        content,
        projectId,
        unitType: opts?.unitType as Parameters<typeof createMutation.mutateAsync>[0]["unitType"],
      });
    },
    [createMutation, projectId],
  );

  // ── Update ──────────────────────────────────────────────────────────
  const updateMutation = api.unit.update.useMutation({
    onSuccess: (_data, variables) => {
      void utils.unit.list.invalidate();
      broadcastChange("unit.updated", { entityId: variables.id, projectId });
    },
  });

  const updateUnit = useCallback(
    (
      unitId: string,
      before: Partial<UnitSnapshot>,
      after: Partial<UnitSnapshot>,
    ) => {
      pushAction({
        type: "unit.update",
        unitId,
        before,
        after,
        description: `Edited unit`,
      });
      return updateMutation.mutateAsync({
        id: unitId,
        ...after,
      } as Parameters<typeof updateMutation.mutateAsync>[0]);
    },
    [updateMutation, pushAction],
  );

  // ── Delete ──────────────────────────────────────────────────────────
  const deleteMutation = api.unit.delete.useMutation({
    onSuccess: (_data, variables) => {
      void utils.unit.list.invalidate();
      void utils.unit.hasAny.invalidate();
      broadcastChange("unit.deleted", { entityId: variables.id, projectId });
    },
  });

  const deleteUnit = useCallback(
    (snapshot: UnitSnapshot) => {
      pushAction({
        type: "unit.delete",
        unitId: snapshot.id,
        snapshot,
        description: `Deleted: "${snapshot.content.slice(0, 40)}"`,
      });
      return deleteMutation.mutateAsync({ id: snapshot.id });
    },
    [deleteMutation, pushAction],
  );

  // ── Reorder ─────────────────────────────────────────────────────────
  const reorderMutation = api.unit.reorder.useMutation({
    onSuccess: (_data, variables) => {
      void utils.unit.list.invalidate();
      broadcastChange("unit.reordered", { entityId: variables.unitId, projectId });
    },
  });

  const reorderUnit = useCallback(
    (unitId: string, fromIndex: number, toIndex: number) => {
      pushAction({
        type: "unit.reorder",
        unitId,
        fromIndex,
        toIndex,
        description: `Reordered unit`,
      });
      return reorderMutation.mutateAsync({
        unitId,
        newIndex: toIndex,
        projectId,
      });
    },
    [reorderMutation, pushAction, projectId],
  );

  return {
    createUnit,
    updateUnit,
    deleteUnit,
    reorderUnit,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}
