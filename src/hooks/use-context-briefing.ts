"use client";

import * as React from "react";
import { api } from "~/trpc/react";

export function useContextBriefing(contextId: string | null | undefined) {
  const briefingQuery = api.contextVisit.getBriefing.useQuery(
    { contextId: contextId ?? undefined },
    { enabled: !!contextId, retry: false },
  );

  const recordVisitMutation = api.contextVisit.recordVisit.useMutation();
  const updateLastViewedMutation =
    api.contextVisit.updateLastViewedUnit.useMutation();

  // Record visit on mount
  const hasRecorded = React.useRef(false);
  React.useEffect(() => {
    if (contextId && !hasRecorded.current) {
      hasRecorded.current = true;
      recordVisitMutation.mutate({ contextId });
    }
  }, [contextId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced last-viewed-unit update
  const updateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const updateLastViewedUnit = React.useCallback(
    (unitId: string) => {
      if (!contextId) return;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateLastViewedMutation.mutate({ contextId, unitId });
      }, 2000);
    },
    [contextId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    briefing: briefingQuery.data ?? null,
    isLoading: briefingQuery.isLoading,
    updateLastViewedUnit,
  };
}
