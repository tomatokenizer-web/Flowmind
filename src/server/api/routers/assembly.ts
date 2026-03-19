import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAssemblyService } from "@/server/services/assemblyService";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const createAssemblySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  templateType: z.string().max(50).optional(),
});

const updateAssemblySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const addUnitSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  slotName: z.string().max(100).optional(),
});

const removeUnitSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
});

const reorderUnitsSchema = z.object({
  assemblyId: z.string().uuid(),
  orderedUnitIds: z.array(z.string().uuid()).min(1).max(100),
});

const updateBridgeTextSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
  bridgeText: z.string().max(5000).nullable(),
});

const createFromTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  templateType: z.string().max(50),
  slots: z.array(
    z.object({
      name: z.string().min(1).max(100),
      position: z.number().int().min(0),
    })
  ),
});

// ─── Router ────────────────────────────────────────────────────────────────

export const assemblyRouter = createTRPCRouter({
  /**
   * Create a new assembly
   */
  create: protectedProcedure
    .input(createAssemblySchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.create(input, ctx.session.user.id!);
    }),

  /**
   * Get assembly by ID with ordered items and unit data
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const assembly = await service.getById(input.id, ctx.session.user.id!);

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return assembly;
    }),

  /**
   * List assemblies for a project with item counts
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.list(input.projectId, ctx.session.user.id!);
    }),

  /**
   * Update assembly metadata (name, description)
   */
  update: protectedProcedure
    .input(updateAssemblySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = createAssemblyService(ctx.db);
      const assembly = await service.update(id, data, ctx.session.user.id!);

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return assembly;
    }),

  /**
   * Delete an assembly
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const deleted = await service.delete(input.id, ctx.session.user.id!);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return { success: true };
    }),

  /**
   * Add a unit to an assembly
   * Rejects if unit.lifecycle === 'draft'
   */
  addUnit: protectedProcedure
    .input(addUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.addUnit(input, ctx.session.user.id!);
    }),

  /**
   * Remove a unit from an assembly (does not delete the unit)
   */
  removeUnit: protectedProcedure
    .input(removeUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const removed = await service.removeUnit(
        input.assemblyId,
        input.unitId,
        ctx.session.user.id!
      );

      if (!removed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found in assembly",
        });
      }

      return { success: true };
    }),

  /**
   * Reorder units in an assembly
   */
  reorderUnits: protectedProcedure
    .input(reorderUnitsSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      await service.reorderUnits(
        input.assemblyId,
        input.orderedUnitIds,
        ctx.session.user.id!
      );

      return { success: true };
    }),

  /**
   * Update bridge text between units
   */
  updateBridgeText: protectedProcedure
    .input(updateBridgeTextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const item = await service.updateBridgeText(
        input.assemblyId,
        input.unitId,
        input.bridgeText,
        ctx.session.user.id!
      );

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly item not found",
        });
      }

      return item;
    }),

  /**
   * Create assembly from template with pre-defined slots
   */
  createFromTemplate: protectedProcedure
    .input(createFromTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.createFromTemplate(input, ctx.session.user.id!);
    }),
});
