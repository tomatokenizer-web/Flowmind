import type { PrismaClient, Webhook } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { logger } from "@/server/logger";
import {
  eventBus,
  type AppEvent,
  type AppEventType,
} from "@/server/events/eventBus";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegisterWebhookInput {
  url: string;
  events: string[];
  projectId: string;
}

export interface WebhookDeliveryPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** All event types that webhooks can subscribe to */
export const WEBHOOK_EVENT_TYPES = [
  "unit.created",
  "unit.updated",
  "unit.archived",
  "unit.deleted",
  "unit.lifecycleChanged",
  "unit.merged",
  "unit.contentChanged",
  "resource.created",
  "resource.deleted",
  "relation.created",
  "relation.updated",
  "relation.deleted",
] as const;

const DELIVERY_TIMEOUT_MS = 10_000;

// ─── HMAC Signing ────────────────────────────────────────────────────────────

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

function generateSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

// ─── Service Factory ─────────────────────────────────────────────────────────

export function createWebhookService(db: PrismaClient) {
  /**
   * Register a new webhook for a project.
   * Generates and stores a secret for HMAC signing.
   */
  async function registerWebhook(
    input: RegisterWebhookInput,
    userId: string,
  ): Promise<Webhook & { plainSecret: string }> {
    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id: input.projectId, userId },
    });

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found or access denied",
      });
    }

    // Validate URL
    try {
      const parsed = new URL(input.url);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid webhook URL. Must be a valid HTTP(S) URL.",
      });
    }

    // Validate event types
    const invalidEvents = input.events.filter(
      (e) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
    );
    if (invalidEvents.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid event types: ${invalidEvents.join(", ")}`,
      });
    }

    const secret = generateSecret();

    const webhook = await db.webhook.create({
      data: {
        url: input.url,
        secret,
        events: input.events,
        projectId: input.projectId,
        userId,
      },
    });

    logger.info(
      { webhookId: webhook.id, projectId: input.projectId },
      "Webhook registered",
    );

    // Return the plain secret only on creation (never stored in plain text after this)
    return { ...webhook, plainSecret: secret };
  }

  /**
   * Delete a webhook by ID.
   */
  async function deleteWebhook(
    webhookId: string,
    userId: string,
  ): Promise<boolean> {
    const webhook = await db.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return false;
    }

    await db.webhook.delete({ where: { id: webhookId } });

    logger.info({ webhookId }, "Webhook deleted");
    return true;
  }

  /**
   * List all webhooks for a project.
   * Secrets are masked in the response.
   */
  async function listWebhooks(
    projectId: string,
    userId: string,
  ): Promise<Omit<Webhook, "secret">[]> {
    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found or access denied",
      });
    }

    const webhooks = await db.webhook.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: "desc" },
    });

    // Mask secrets — only show last 4 characters
    return webhooks.map(({ secret, ...rest }) => ({
      ...rest,
      secret: `whsec_${"*".repeat(20)}${secret.slice(-4)}`,
    }));
  }

  /**
   * Toggle webhook active/inactive.
   */
  async function toggleWebhook(
    webhookId: string,
    active: boolean,
    userId: string,
  ): Promise<Webhook | null> {
    const webhook = await db.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return null;
    }

    return db.webhook.update({
      where: { id: webhookId },
      data: { active },
    });
  }

  /**
   * Deliver a webhook event to all matching active webhooks.
   * Sends POST with JSON body signed via HMAC-SHA256.
   */
  async function deliverWebhook(event: AppEvent): Promise<void> {
    // Determine which project this event belongs to.
    // We need the unit's projectId to find matching webhooks.
    let projectId: string | null = null;

    if ("unitId" in event.payload) {
      const unit = await db.unit.findUnique({
        where: { id: event.payload.unitId },
        select: { projectId: true },
      });
      projectId = unit?.projectId ?? null;
    } else if ("sourceUnitId" in event.payload) {
      const unit = await db.unit.findUnique({
        where: { id: event.payload.sourceUnitId },
        select: { projectId: true },
      });
      projectId = unit?.projectId ?? null;
    } else if ("resourceId" in event.payload) {
      // Resources don't have a direct project link; skip for now
      return;
    } else if ("relationId" in event.payload) {
      const relation = await db.relation.findUnique({
        where: { id: event.payload.relationId },
        include: { sourceUnit: { select: { projectId: true } } },
      });
      projectId = relation?.sourceUnit?.projectId ?? null;
    }

    if (!projectId) {
      return;
    }

    // Find active webhooks subscribed to this event type
    const webhooks = await db.webhook.findMany({
      where: {
        projectId,
        active: true,
        events: { has: event.type },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    const deliveryPayload: WebhookDeliveryPayload = {
      id: crypto.randomUUID(),
      event: event.type,
      timestamp: event.timestamp.toISOString(),
      data: event.payload as unknown as Record<string, unknown>,
    };

    const body = JSON.stringify(deliveryPayload);

    const deliveryPromises = webhooks.map(async (webhook) => {
      const signature = signPayload(body, webhook.secret);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          DELIVERY_TIMEOUT_MS,
        );

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FlowMind-Signature": `sha256=${signature}`,
            "X-FlowMind-Event": event.type,
            "X-FlowMind-Delivery": deliveryPayload.id,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          logger.warn(
            {
              webhookId: webhook.id,
              status: response.status,
              event: event.type,
            },
            "Webhook delivery received non-2xx response",
          );
        } else {
          logger.info(
            { webhookId: webhook.id, event: event.type },
            "Webhook delivered successfully",
          );
        }
      } catch (error) {
        logger.error(
          {
            webhookId: webhook.id,
            event: event.type,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Webhook delivery failed",
        );
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  return {
    registerWebhook,
    deleteWebhook,
    listWebhooks,
    toggleWebhook,
    deliverWebhook,
  };
}

export type WebhookService = ReturnType<typeof createWebhookService>;

// ─── Event Bus Integration ───────────────────────────────────────────────────

let initialized = false;

/**
 * Subscribe the webhook delivery system to the event bus.
 * Call once at application startup (e.g., from the tRPC route module).
 */
export function initWebhookDelivery(db: PrismaClient): void {
  if (initialized) return;
  initialized = true;

  const service = createWebhookService(db);

  const eventTypes: AppEventType[] = [
    "unit.created",
    "unit.updated",
    "unit.archived",
    "unit.deleted",
    "unit.lifecycleChanged",
    "unit.merged",
    "unit.contentChanged",
    "resource.created",
    "resource.deleted",
    "relation.created",
    "relation.updated",
    "relation.deleted",
  ];

  for (const eventType of eventTypes) {
    eventBus.on(eventType, (event) => {
      // Fire and forget — don't block the event bus
      service.deliverWebhook(event).catch((err) => {
        logger.error(
          { event: eventType, error: err instanceof Error ? err.message : "Unknown" },
          "Webhook delivery error in event handler",
        );
      });
    });
  }

  logger.info("Webhook delivery system initialized");
}
