import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import SuperJSON from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on auth errors or not-found
          const status = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 10000), // exponential backoff: 1s, 2s, 4s (max 10s)
      },
      mutations: {
        retry: (failureCount, error) => {
          const status = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
          if (status && status < 500) return false; // don't retry client errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
}
