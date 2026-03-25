import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createPerspectiveService } from "@/server/services/perspectiveService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const unitTypeEnum = z.enum([
  "claim",
  "question",
  "evidence",
  "counterargument",
  "observation",
  "idea",
  "definition",
  "assumption",
  "action",
]);

const stanceEnum = z.enum(["support", "oppose", "neutral", "exploring"]);

const upsertPerspectiveSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
  type: unitTypeEnum.nullish(),
  stance: stanceEnum.optional(),
  importance: z.number().min(0).max(1).optional(),
  note: z.string().max(2000).optional(),
});

const unitContextPairSchema = z.object({
  unitId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
});

const unitContextPairRequiredSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
});

const contextIdSchema = z.object({
  contextId: z.string().uuid(),
});

// ─── Router ────────────────────────────────────────────────────────

export const perspectiveRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(upsertPerspectiveSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createPerspectiveService(ctx.db);
      return service.upsert(input);
    }),

  getForUnit: protectedProcedure
    .input(unitContextPairSchema)
    .query(async ({ ctx, input }) => {
      if (!input.unitId || !input.contextId) return null;
      const service = createPerspectiveService(ctx.db);
      return service.getForUnit(input.unitId, input.contextId);
    }),

  getForContext: protectedProcedure
    .input(contextIdSchema)
    .query(async ({ ctx, input }) => {
      const service = createPerspectiveService(ctx.db);
      return service.getForContext(input.contextId);
    }),

  delete: protectedProcedure
    .input(unitContextPairRequiredSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createPerspectiveService(ctx.db);
      return service.deletePerspective(input.unitId, input.contextId);
    }),
});
