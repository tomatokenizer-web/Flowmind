import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createVersionService } from "@/server/services/versionService";
import { TRPCError } from "@trpc/server";

// ─── Router ────────────────────────────────────────────────────────

export const versionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createVersionService(ctx.db);
      return service.listByUnitId(input.unitId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createVersionService(ctx.db);
      const version = await service.getById(input.id);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }
      return version;
    }),

  getDiff: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        fromVersion: z.number().int().min(1),
        toVersion: z.number().int().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = createVersionService(ctx.db);
      const diff = await service.getDiff(
        input.unitId,
        input.fromVersion,
        input.toVersion,
      );
      if (!diff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both versions not found",
        });
      }
      return diff;
    }),

  getDiffWithCurrent: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        version: z.number().int().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = createVersionService(ctx.db);
      const diff = await service.getDiffWithCurrent(input.unitId, input.version);
      if (!diff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version or unit not found",
        });
      }
      return diff;
    }),

  restore: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        version: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createVersionService(ctx.db);
      const result = await service.restore(
        input.unitId,
        input.version,
        ctx.session.user.id!,
      );
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version or unit not found",
        });
      }
      return result;
    }),
});
