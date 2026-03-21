import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  createWebhookService,
  WEBHOOK_EVENT_TYPES,
} from "@/server/services/webhookService";

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const registerWebhookSchema = z.object({
  url: z.string().url("Must be a valid URL").max(2048),
  events: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, "At least one event type is required")
    .max(WEBHOOK_EVENT_TYPES.length),
  projectId: z.string().uuid(),
});

const toggleWebhookSchema = z.object({
  id: z.string(),
  active: z.boolean(),
});

// ─── Router ────────────────────────────────────────────────────────────────

export const webhookRouter = createTRPCRouter({
  /**
   * Register a new webhook for a project.
   * Returns the webhook with the plain secret (shown only once).
   */
  register: protectedProcedure
    .input(registerWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createWebhookService(ctx.db);
      const result = await service.registerWebhook(input, ctx.session.user.id!);

      return {
        id: result.id,
        url: result.url,
        events: result.events,
        active: result.active,
        projectId: result.projectId,
        createdAt: result.createdAt,
        secret: result.plainSecret,
      };
    }),

  /**
   * List all webhooks for a project (secrets masked).
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createWebhookService(ctx.db);
      return service.listWebhooks(input.projectId, ctx.session.user.id!);
    }),

  /**
   * Delete a webhook.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = createWebhookService(ctx.db);
      const deleted = await service.deleteWebhook(input.id, ctx.session.user.id!);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      return { success: true };
    }),

  /**
   * Toggle a webhook active/inactive.
   */
  toggle: protectedProcedure
    .input(toggleWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createWebhookService(ctx.db);
      const webhook = await service.toggleWebhook(
        input.id,
        input.active,
        ctx.session.user.id!,
      );

      if (!webhook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      return webhook;
    }),

  /**
   * List available event types for webhook subscriptions.
   */
  eventTypes: protectedProcedure.query(() => {
    return WEBHOOK_EVENT_TYPES.map((type) => ({
      value: type,
      label: type.replace(".", " ").replace(/^\w/, (c) => c.toUpperCase()),
    }));
  }),
});
