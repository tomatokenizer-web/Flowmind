import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createResourceService } from "@/server/services/resourceService";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────

const resourceTypeEnum = z.enum([
  "image", "table", "audio", "diagram", "link", "video", "code",
]);

const lifecycleEnum = z.enum([
  "draft", "pending", "confirmed", "deferred",
  "complete", "archived", "discarded",
]);

const jsonValue: z.ZodType = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue)]),
);

const uploadResourceSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  resourceType: resourceTypeEnum,
  /** Base64-encoded file content */
  base64: z.string().min(1),
  metadata: jsonValue.optional(),
  lifecycle: z.enum(["draft", "pending", "confirmed"]).optional(),
  unitId: z.string().uuid().optional(),
});

const createResourceSchema = z.object({
  resourceType: resourceTypeEnum,
  url: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  metadata: jsonValue.optional(),
  lifecycle: z.enum(["draft", "pending", "confirmed"]).optional(),
  unitId: z.string().uuid().optional(),
});

const listResourcesSchema = z.object({
  resourceType: resourceTypeEnum.optional(),
  lifecycle: lifecycleEnum.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const linkToUnitSchema = z.object({
  resourceId: z.string().uuid(),
  unitId: z.string().uuid(),
  role: z.string().max(50).optional(),
});

const unlinkFromUnitSchema = z.object({
  resourceId: z.string().uuid(),
  unitId: z.string().uuid(),
});

// ─── Router ────────────────────────────────────────────────────────

export const resourceRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(uploadResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      const buffer = Buffer.from(input.base64, "base64");
      return service.upload(
        {
          buffer,
          fileName: input.fileName,
          mimeType: input.mimeType,
          resourceType: input.resourceType,
          metadata: input.metadata,
          lifecycle: input.lifecycle,
          unitId: input.unitId,
        },
        ctx.session.user.id!,
      );
    }),

  create: protectedProcedure
    .input(createResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      return service.create(input, ctx.session.user.id!);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      const resource = await service.getById(input.id);
      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }
      return resource;
    }),

  list: protectedProcedure
    .input(listResourcesSchema)
    .query(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      return service.list({
        userId: ctx.session.user.id!,
        resourceType: input.resourceType,
        lifecycle: input.lifecycle,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      const resource = await service.delete(input.id, ctx.session.user.id!);
      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }
      return resource;
    }),

  linkToUnit: protectedProcedure
    .input(linkToUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      return service.linkToUnit(input.resourceId, input.unitId, input.role);
    }),

  unlinkFromUnit: protectedProcedure
    .input(unlinkFromUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      return service.unlinkFromUnit(input.resourceId, input.unitId);
    }),

  getByUnitId: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      return service.getByUnitId(input.unitId);
    }),

  lifecycleTransition: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      targetState: lifecycleEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      const result = await service.transitionLifecycle(
        input.id,
        input.targetState,
        ctx.session.user.id!,
      );
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }
      return result;
    }),
});
