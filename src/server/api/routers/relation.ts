import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createRelationService } from "@/server/services/relationService";

// ─── Zod Schemas ────────────────────────────────────────────────────

const directionEnum = z.enum(["one_way", "bidirectional"]);

const createRelationSchema = z.object({
  sourceUnitId: z.string().uuid(),
  targetUnitId: z.string().uuid(),
  perspectiveId: z.string().uuid().optional(),
  type: z.string(),
  strength: z.number().min(0).max(1).default(0.5),
  direction: directionEnum.default("one_way"),
  purpose: z.array(z.string()).default([]),
});

const updateRelationSchema = z.object({
  id: z.string().uuid(),
  strength: z.number().min(0).max(1).optional(),
  type: z.string().optional(),
  direction: directionEnum.optional(),
  purpose: z.array(z.string()).optional(),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

const listByUnitSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
});

const listBetweenSchema = z.object({
  sourceUnitId: z.string().uuid(),
  targetUnitId: z.string().uuid(),
});

// ─── Router ─────────────────────────────────────────────────────────

export const relationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createRelationSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate lifecycle before delegating to service (fast-fail with clear message)
      const [sourceUnit, targetUnit] = await Promise.all([
        ctx.db.unit.findUnique({ where: { id: input.sourceUnitId }, select: { lifecycle: true } }),
        ctx.db.unit.findUnique({ where: { id: input.targetUnitId }, select: { lifecycle: true } }),
      ]);

      if (!sourceUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      }
      if (!targetUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });
      }
      if (sourceUnit.lifecycle === "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source unit is in draft lifecycle and cannot have relations",
        });
      }
      if (targetUnit.lifecycle === "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target unit is in draft lifecycle and cannot have relations",
        });
      }

      const service = createRelationService(ctx.db);
      return service.create(input, ctx.session.user.id!);
    }),

  update: protectedProcedure
    .input(updateRelationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = createRelationService(ctx.db);
      return service.update(id, data);
    }),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createRelationService(ctx.db);
      return service.delete(input.id);
    }),

  listByUnit: protectedProcedure
    .input(listByUnitSchema)
    .query(async ({ ctx, input }) => {
      const service = createRelationService(ctx.db);
      return service.listByUnit(input.unitId, input.contextId);
    }),

  listBetween: protectedProcedure
    .input(listBetweenSchema)
    .query(async ({ ctx, input }) => {
      const service = createRelationService(ctx.db);
      return service.listBetween(input.sourceUnitId, input.targetUnitId);
    }),
});
