"use client";

import { useCallback, useState } from "react";
import { api } from "~/trpc/react";

export function useVersionHistory(unitId: string) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: versions, isLoading } = api.version.list.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  const restoreMutation = api.version.restore.useMutation({
    onSuccess: async () => {
      // Invalidate both version list and unit data
      await Promise.all([
        utils.version.list.invalidate({ unitId }),
        utils.unit.getById.invalidate({ id: unitId }),
        utils.unit.list.invalidate(),
      ]);
      setExpandedVersion(null);
    },
  });

  const toggleExpanded = useCallback(
    (versionId: string) => {
      setExpandedVersion((prev) => (prev === versionId ? null : versionId));
    },
    [],
  );

  const restore = useCallback(
    (version: number) => {
      restoreMutation.mutate({ unitId, version });
    },
    [unitId, restoreMutation],
  );

  return {
    versions,
    isLoading,
    expandedVersion,
    toggleExpanded,
    restore,
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,
  };
}
