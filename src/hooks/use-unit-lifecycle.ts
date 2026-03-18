"use client";

import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useLifecycleStore } from "~/stores/lifecycle-store";

type LifecycleTarget = "draft" | "pending" | "confirmed" | "discarded";

interface UseUnitLifecycleOptions {
  /** Called after a successful transition */
  onSuccess?: (unitId: string, newState: string) => void;
  /** Called on error */
  onError?: (error: unknown) => void;
}

/**
 * useUnitLifecycle — hook for lifecycle transitions with optimistic UI and undo.
 *
 * Provides:
 * - transition(id, targetState) — single unit lifecycle change
 * - bulkTransition(ids, targetState) — bulk lifecycle change
 * - undo() — revert the most recent lifecycle change
 */
export function useUnitLifecycle(options?: UseUnitLifecycleOptions) {
  const utils = api.useUtils();
  const pushUndo = useLifecycleStore((s) => s.pushUndo);
  const popUndo = useLifecycleStore((s) => s.popUndo);

  const transitionMutation = api.unit.lifecycleTransition.useMutation({
    onSuccess: (_data, variables) => {
      // Invalidate unit queries to refetch fresh data
      void utils.unit.list.invalidate();
      void utils.unit.getById.invalidate({ id: variables.id });
      options?.onSuccess?.(variables.id, variables.targetState);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  const bulkMutation = api.unit.lifecycleBulkTransition.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  const transition = useCallback(
    async (
      unitId: string,
      targetState: LifecycleTarget,
      unitTitle?: string,
      currentState?: string,
    ) => {
      // Record for undo before mutating
      if (currentState) {
        pushUndo({
          unitId,
          unitTitle: unitTitle ?? unitId.slice(0, 8),
          previousState: currentState,
          newState: targetState,
          timestamp: Date.now(),
        });
      }

      return transitionMutation.mutateAsync({
        id: unitId,
        targetState,
      });
    },
    [transitionMutation, pushUndo],
  );

  const bulkTransition = useCallback(
    async (ids: string[], targetState: LifecycleTarget) => {
      return bulkMutation.mutateAsync({ ids, targetState });
    },
    [bulkMutation],
  );

  const undo = useCallback(async () => {
    const entry = popUndo();
    if (!entry) return null;

    // Revert to previous state
    await transitionMutation.mutateAsync({
      id: entry.unitId,
      targetState: entry.previousState as LifecycleTarget,
    });

    return entry;
  }, [popUndo, transitionMutation]);

  return {
    transition,
    bulkTransition,
    undo,
    isTransitioning: transitionMutation.isPending,
    isBulkTransitioning: bulkMutation.isPending,
  };
}
