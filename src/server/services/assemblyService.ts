import type { PrismaClient, Assembly, AssemblyItem, Unit } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssemblyWithItems = Assembly & {
  items: (AssemblyItem & {
    unit: Unit | null;
  })[];
  _count: { items: number };
};

export type AssemblyListItem = Assembly & {
  _count: { items: number };
};

export interface CreateAssemblyInput {
  name: string;
  description?: string;
  projectId: string;
  templateType?: string;
}

export interface UpdateAssemblyInput {
  name?: string;
  description?: string;
  templateType?: string;
}

export interface AddUnitInput {
  assemblyId: string;
  unitId: string;
  position?: number;
  slotName?: string;
}

// ─── Service Factory ─────────────────────────────────────────────────────────

export function createAssemblyService(db: PrismaClient) {
  return {
    /**
     * Create a new assembly
     */
    async create(input: CreateAssemblyInput, userId: string): Promise<Assembly> {
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

      return db.assembly.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          templateType: input.templateType,
          sourceMap: input.description ? { description: input.description } : undefined,
        },
      });
    },

    /**
     * Get assembly by ID with ordered items and unit data
     */
    async getById(id: string, userId: string): Promise<AssemblyWithItems | null> {
      const assembly = await db.assembly.findFirst({
        where: {
          id,
          project: { userId },
        },
        include: {
          items: {
            include: {
              unit: true,
            },
            orderBy: { position: "asc" },
          },
          _count: { select: { items: true } },
        },
      });

      return assembly;
    },

    /**
     * List assemblies for a project with item counts
     */
    async list(projectId: string, userId: string): Promise<AssemblyListItem[]> {
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

      return db.assembly.findMany({
        where: { projectId },
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    },

    /**
     * Update assembly metadata
     */
    async update(
      id: string,
      input: UpdateAssemblyInput,
      userId: string
    ): Promise<Assembly | null> {
      // Verify ownership
      const existing = await db.assembly.findFirst({
        where: { id, project: { userId } },
      });

      if (!existing) {
        return null;
      }

      const sourceMap = existing.sourceMap as Record<string, unknown> | null;

      return db.assembly.update({
        where: { id },
        data: {
          name: input.name,
          templateType: input.templateType,
          sourceMap: input.description !== undefined
            ? { ...sourceMap, description: input.description }
            : undefined,
        },
      });
    },

    /**
     * Delete an assembly and its items
     */
    async delete(id: string, userId: string): Promise<boolean> {
      const existing = await db.assembly.findFirst({
        where: { id, project: { userId } },
      });

      if (!existing) {
        return false;
      }

      await db.assembly.delete({ where: { id } });
      return true;
    },

    /**
     * Add a unit to an assembly
     * Rejects if unit is in draft lifecycle
     */
    async addUnit(input: AddUnitInput, userId: string): Promise<AssemblyItem> {
      // Verify assembly ownership
      const assembly = await db.assembly.findFirst({
        where: { id: input.assemblyId, project: { userId } },
        include: {
          items: { orderBy: { position: "desc" }, take: 1 },
        },
      });

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found or access denied",
        });
      }

      // Verify unit exists and is not draft
      const unit = await db.unit.findFirst({
        where: { id: input.unitId, userId },
      });

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found or access denied",
        });
      }

      if (unit.lifecycle === "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add draft units to an assembly. Confirm the unit first.",
        });
      }

      // Check if unit is already in this assembly
      const existingItem = await db.assemblyItem.findFirst({
        where: { assemblyId: input.assemblyId, unitId: input.unitId },
      });

      if (existingItem) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Unit is already in this assembly",
        });
      }

      // Determine position
      const lastPosition = assembly.items[0]?.position ?? -1;
      const position = input.position ?? lastPosition + 1;

      // If inserting at a specific position, shift other items
      if (input.position !== undefined) {
        await db.assemblyItem.updateMany({
          where: {
            assemblyId: input.assemblyId,
            position: { gte: position },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }

      return db.assemblyItem.create({
        data: {
          assemblyId: input.assemblyId,
          unitId: input.unitId,
          position,
          bridgeText: input.slotName ? `[${input.slotName}]` : null,
        },
      });
    },

    /**
     * Remove a unit from an assembly (does not delete the unit)
     */
    async removeUnit(assemblyId: string, unitId: string, userId: string): Promise<boolean> {
      // Verify assembly ownership
      const assembly = await db.assembly.findFirst({
        where: { id: assemblyId, project: { userId } },
      });

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found or access denied",
        });
      }

      const item = await db.assemblyItem.findFirst({
        where: { assemblyId, unitId },
      });

      if (!item) {
        return false;
      }

      // Delete the item
      await db.assemblyItem.delete({ where: { id: item.id } });

      // Reorder remaining items to close the gap
      await db.assemblyItem.updateMany({
        where: {
          assemblyId,
          position: { gt: item.position },
        },
        data: {
          position: { decrement: 1 },
        },
      });

      return true;
    },

    /**
     * Reorder units in an assembly
     */
    async reorderUnits(
      assemblyId: string,
      orderedUnitIds: string[],
      userId: string
    ): Promise<boolean> {
      // Verify assembly ownership
      const assembly = await db.assembly.findFirst({
        where: { id: assemblyId, project: { userId } },
        include: { items: true },
      });

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found or access denied",
        });
      }

      // Update positions in a transaction
      await db.$transaction(
        orderedUnitIds.map((unitId, index) =>
          db.assemblyItem.updateMany({
            where: { assemblyId, unitId },
            data: { position: index },
          })
        )
      );

      // Touch the assembly updated timestamp
      await db.assembly.update({
        where: { id: assemblyId },
        data: { updatedAt: new Date() },
      });

      return true;
    },

    /**
     * Update bridge text between units
     */
    async updateBridgeText(
      assemblyId: string,
      unitId: string,
      bridgeText: string | null,
      userId: string
    ): Promise<AssemblyItem | null> {
      // Verify assembly ownership
      const assembly = await db.assembly.findFirst({
        where: { id: assemblyId, project: { userId } },
      });

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found or access denied",
        });
      }

      const item = await db.assemblyItem.findFirst({
        where: { assemblyId, unitId },
      });

      if (!item) {
        return null;
      }

      return db.assemblyItem.update({
        where: { id: item.id },
        data: { bridgeText },
      });
    },

    /**
     * Create assembly with template slots (pre-populated empty slots)
     */
    async createFromTemplate(
      input: CreateAssemblyInput & { slots: { name: string; position: number }[] },
      userId: string
    ): Promise<Assembly> {
      const assembly = await this.create(
        { ...input, templateType: input.templateType },
        userId
      );

      // Create placeholder items for each slot
      if (input.slots.length > 0) {
        await db.assemblyItem.createMany({
          data: input.slots.map((slot) => ({
            assemblyId: assembly.id,
            unitId: null,
            position: slot.position,
            bridgeText: `[${slot.name}]`,
          })),
        });
      }

      return assembly;
    },
  };
}

export type AssemblyService = ReturnType<typeof createAssemblyService>;
