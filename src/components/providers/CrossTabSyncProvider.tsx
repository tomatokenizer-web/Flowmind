"use client";

import { useCrossTabSync } from "~/hooks/use-cross-tab-sync";

/**
 * Invisible provider component that activates cross-tab sync.
 * Mount inside TRPCReactProvider so the hook can access tRPC utils.
 * Renders nothing -- purely a side-effect component.
 */
export function CrossTabSyncProvider() {
  useCrossTabSync();
  return null;
}
