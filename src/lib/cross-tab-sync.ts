/**
 * Cross-Tab Sync Stub (Story 4.9)
 *
 * Uses the BroadcastChannel API to synchronize data changes
 * across browser tabs within the same origin. When a mutation
 * occurs in one tab, other tabs are notified so they can
 * invalidate their tRPC query caches.
 *
 * Gracefully degrades to a no-op in environments that do not
 * support BroadcastChannel (e.g., older browsers, SSR).
 */

// ─── Event types ────────────────────────────────────────────────────

export type SyncEventType =
  | "unit.created"
  | "unit.updated"
  | "unit.deleted"
  | "unit.reordered"
  | "relation.created"
  | "relation.updated"
  | "relation.deleted"
  | "context.created"
  | "context.updated"
  | "context.deleted"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "assembly.updated";

export interface SyncEvent {
  type: SyncEventType;
  /** The entity ID that changed (unit, relation, context, etc.) */
  entityId?: string;
  /** The project scope of the change, for targeted invalidation */
  projectId?: string;
  /** Unique tab ID so the sender can ignore its own messages */
  sourceTabId: string;
  /** Timestamp for debugging / ordering */
  timestamp: number;
}

// ─── Channel name ───────────────────────────────────────────────────

const CHANNEL_NAME = "flowmind-sync";

// ─── Tab identity ───────────────────────────────────────────────────

let tabId: string | undefined;

function getTabId(): string {
  if (!tabId) {
    tabId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return tabId;
}

// ─── BroadcastChannel support check ─────────────────────────────────

function isBroadcastChannelSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined"
  );
}

// ─── Singleton channel instance ─────────────────────────────────────

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (!isBroadcastChannelSupported()) return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Broadcast a data change to other tabs.
 * No-op if BroadcastChannel is not supported.
 */
export function broadcastChange(
  type: SyncEventType,
  opts?: { entityId?: string; projectId?: string },
): void {
  const ch = getChannel();
  if (!ch) return;

  const event: SyncEvent = {
    type,
    entityId: opts?.entityId,
    projectId: opts?.projectId,
    sourceTabId: getTabId(),
    timestamp: Date.now(),
  };

  try {
    ch.postMessage(event);
  } catch {
    // Channel may have been closed; silently ignore
  }
}

export type RemoteChangeCallback = (event: SyncEvent) => void;

/**
 * Subscribe to data changes broadcast from other tabs.
 * Messages originating from the current tab are automatically filtered out.
 *
 * Returns an unsubscribe function. No-op if BroadcastChannel is not supported.
 */
export function onRemoteChange(callback: RemoteChangeCallback): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (ev: MessageEvent<SyncEvent>) => {
    // Ignore events from this tab
    if (ev.data?.sourceTabId === getTabId()) return;
    callback(ev.data);
  };

  ch.addEventListener("message", handler);

  return () => {
    ch.removeEventListener("message", handler);
  };
}

/**
 * Close the channel entirely. Useful for cleanup in tests or
 * when the app unmounts. After calling this, a new channel
 * will be created on the next broadcastChange / onRemoteChange call.
 */
export function closeSyncChannel(): void {
  if (channel) {
    channel.close();
    channel = null;
  }
}
