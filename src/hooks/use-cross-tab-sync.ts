"use client";

import { useEffect } from "react";
import { api } from "~/trpc/react";
import {
  onRemoteChange,
  type SyncEvent,
  type SyncEventType,
} from "~/lib/cross-tab-sync";

/**
 * Hook that listens for cross-tab sync events and invalidates
 * the relevant tRPC query caches so data stays fresh across tabs.
 *
 * Mount this once near the top of the component tree (e.g., in a
 * layout or provider). It automatically unsubscribes on unmount.
 */
export function useCrossTabSync() {
  const utils = api.useUtils();

  useEffect(() => {
    const unsubscribe = onRemoteChange((event: SyncEvent) => {
      const invalidations = getInvalidationsForEvent(event.type);

      for (const invalidate of invalidations) {
        invalidate(utils, event);
      }
    });

    return unsubscribe;
  }, [utils]);
}

// ─── Invalidation mapping ───────────────────────────────────────────

type InvalidationFn = (
  utils: ReturnType<typeof api.useUtils>,
  event: SyncEvent,
) => void;

function getInvalidationsForEvent(
  type: SyncEventType,
): InvalidationFn[] {
  switch (type) {
    case "unit.created":
    case "unit.deleted":
      return [
        (u) => void u.unit.list.invalidate(),
        (u) => void u.unit.hasAny.invalidate(),
        (u) => void u.dashboard.getData.invalidate(),
      ];

    case "unit.updated":
    case "unit.reordered":
      return [
        (u) => void u.unit.list.invalidate(),
      ];

    case "relation.created":
    case "relation.updated":
    case "relation.deleted":
      return [
        (u) => void u.relation.invalidate(),
        (u) => void u.unit.list.invalidate(),
      ];

    case "context.created":
    case "context.deleted":
      return [
        (u) => void u.context.list.invalidate(),
        (u) => void u.dashboard.getData.invalidate(),
      ];

    case "context.updated":
      return [
        (u) => void u.context.list.invalidate(),
      ];

    case "project.created":
    case "project.updated":
    case "project.deleted":
      return [
        (u) => void u.project.list.invalidate(),
        (u) => void u.dashboard.getData.invalidate(),
      ];

    case "assembly.updated":
      return [
        (u) => void u.assembly.list.invalidate(),
      ];

    default:
      return [];
  }
}
