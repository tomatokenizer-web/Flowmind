"use client";

import { useCallback } from "react";
import { api } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────

export type Stance = "support" | "oppose" | "neutral" | "exploring";

export interface PerspectiveData {
  id: string;
  unitId: string;
  contextId: string;
  type: string | null;
  stance: Stance;
  importance: number;
  note: string | null;
}

export interface UsePerspectiveOptions {
  unitId: string | undefined;
  contextId: string | null | undefined;
}

export interface UsePerspectiveReturn {
  perspective: PerspectiveData | null;
  stance: Stance | null;
  importance: number | null;
  note: string | null;
  isLoading: boolean;
  error: unknown;
  /** Upsert stance, importance, or note for this unit-context pair */
  updatePerspective: (updates: {
    stance?: Stance;
    importance?: number;
    note?: string;
  }) => Promise<void>;
  isUpdating: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches and manages the perspective for a single unit within a context.
 *
 * Returns stance, importance, and note data along with a mutation
 * to update the perspective (upsert).
 */
export function usePerspective({
  unitId,
  contextId,
}: UsePerspectiveOptions): UsePerspectiveReturn {
  const enabled = !!unitId && !!contextId;

  const perspectiveQuery = api.perspective.getForUnit.useQuery(
    { unitId: unitId ?? undefined, contextId: contextId ?? undefined },
    { enabled },
  );

  const utils = api.useUtils();

  const upsertMutation = api.perspective.upsert.useMutation({
    onSuccess: () => {
      if (unitId && contextId) {
        void utils.perspective.getForUnit.invalidate({ unitId, contextId });
        void utils.perspective.getForContext.invalidate({ contextId });
      }
    },
  });

  const updatePerspective = useCallback(
    async (updates: {
      stance?: Stance;
      importance?: number;
      note?: string;
    }) => {
      if (!unitId || !contextId) return;
      await upsertMutation.mutateAsync({
        unitId,
        contextId,
        ...updates,
      });
    },
    [unitId, contextId, upsertMutation],
  );

  const perspective = (perspectiveQuery.data as PerspectiveData | null) ?? null;

  return {
    perspective,
    stance: perspective?.stance ?? null,
    importance: perspective?.importance ?? null,
    note: perspective?.note ?? null,
    isLoading: perspectiveQuery.isLoading,
    error: perspectiveQuery.error,
    updatePerspective,
    isUpdating: upsertMutation.isPending,
  };
}
