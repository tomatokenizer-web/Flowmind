"use client";

import { api } from "~/trpc/react";

/**
 * Returns the user's default project ID.
 * Auto-creates one if it doesn't exist.
 */
export function useDefaultProject(): { projectId: string | undefined; isLoading: boolean } {
  const { data, isLoading } = api.project.getOrCreateDefault.useQuery(undefined, {
    staleTime: Infinity, // project ID never changes mid-session
    retry: false,
  });

  return { projectId: data?.id, isLoading };
}
