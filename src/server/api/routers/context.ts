import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createContextService } from "@/server/services/contextService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const contextIdSchema = z.object({
  id: z.string().uuid(),
});

const createContextSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

const updateContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const listContextsSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullish(),
});

const unitContextSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
});

const splitContextSchema = z.object({
  id: z.string().uuid(),
  newNames: z.tuple([
    z.string().min(1).max(100),
    z.string().min(1).max(100),
  ]),
  projectId: z.string().uuid(),
});

const mergeContextSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

// ─── Router ────────────────────────────────────────────────────────

export const contextRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.createContext(input);
    }),

  getById: protectedProcedure
    .input(contextIdSchema)
    .query(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.getContextById(input.id);
    }),

  list: protectedProcedure
    .input(listContextsSchema)
    .query(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.listContexts(input.projectId, input.parentId);
    }),

  update: protectedProcedure
    .input(updateContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      const { id, ...data } = input;
      return service.updateContext(id, data);
    }),

  delete: protectedProcedure
    .input(contextIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.deleteContext(input.id);
    }),

  addUnit: protectedProcedure
    .input(unitContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.addUnit(input.unitId, input.contextId);
    }),

  removeUnit: protectedProcedure
    .input(unitContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.removeUnit(input.unitId, input.contextId);
    }),

  split: protectedProcedure
    .input(splitContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.splitContext(input.id, input.newNames, input.projectId);
    }),

  merge: protectedProcedure
    .input(mergeContextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContextService(ctx.db);
      return service.mergeContexts(input.sourceId, input.targetId);
    }),
});
