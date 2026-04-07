import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createPerspectiveService } from "@/server/services/perspectiveService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const unitTypeEnum = z.enum([
  "claim", "question", "evidence", "counterargument",
  "observation", "idea", "definition", "assumption", "action",
  "interpretation", "example", "decision",
]);

const stanceEnum = z.enum(["support", "oppose", "neutral", "exploring"]);

// D-01 Perspective Layer enums
const certaintyLevelEnum = z.enum(["confirmed_cert", "probable", "uncertain", "speculative"]);
const scaleSourceEnum = z.enum(["graph_derived", "user_override"]);
const contextDependencyEnum = z.enum(["free", "anchored", "passage"]);
const contextRoleEnum = z.enum(["seed", "anchor", "bridge", "peripheral", "evergreen_role"]);
const roleSourceEnum = z.enum(["ai_computed", "user_confirmed", "user_set"]);

const upsertPerspectiveSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
  type: unitTypeEnum.nullish(),
  stance: stanceEnum.optional(),
  importance: z.number().min(0).max(1).optional(),
  note: z.string().max(2000).optional(),
  // D-01 fields
  certaintyLevel: certaintyLevelEnum.optional(),
  cognitiveScale: z.number().min(0).max(10).optional(),
  scaleSource: scaleSourceEnum.optional(),
  contextDependency: contextDependencyEnum.optional(),
  contextRole: contextRoleEnum.optional(),
  roleSource: roleSourceEnum.optional(),
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
