import type { PrismaClient, Prisma } from "@prisma/client";
import { createContextRepository } from "@/server/repositories/contextRepository";
import { TRPCError } from "@trpc/server";

export interface CreateContextInput {
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
}

export interface UpdateContextInput {
  name?: string;
  description?: string;
}

export function createContextService(db: PrismaClient) {
  const repo = createContextRepository(db);

  async function validateUniqueName(
    name: string,
    projectId: string,
    parentId: string | null,
    excludeId?: string,
  ) {
    const existing = await repo.findByNameInScope(name, projectId, parentId);
    if (existing && existing.id !== excludeId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `A context named "${name}" already exists in this scope`,
      });
    }
  }

  return {
    async createContext(input: CreateContextInput) {
      const parentId = input.parentId ?? null;
      await validateUniqueName(input.name, input.projectId, parentId);

      return repo.create({
        name: input.name,
        description: input.description,
        project: { connect: { id: input.projectId } },
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      });
    },

    async getContextById(id: string) {
      const context = await repo.findById(id);
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      return context;
    },

    async listContexts(projectId: string, parentId?: string | null) {
      return repo.findMany(projectId, parentId);
    },

    async updateContext(id: string, input: UpdateContextInput) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      if (input.name && input.name !== existing.name) {
        await validateUniqueName(input.name, existing.projectId, existing.parentId, id);
      }

      return repo.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      });
    },

    async deleteContext(id: string) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      return repo.delete(id);
    },

    async addUnit(unitId: string, contextId: string) {
      return repo.addUnit(unitId, contextId);
    },

    async removeUnit(unitId: string, contextId: string) {
      return repo.removeUnit(unitId, contextId);
    },

    async splitContext(
      id: string,
      newNames: [string, string],
      projectId: string,
    ) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      const parentId = existing.parentId;
      await validateUniqueName(newNames[0], projectId, parentId, id);
      await validateUniqueName(newNames[1], projectId, parentId);

      return db.$transaction(async (tx) => {
        const txRepo = createContextRepository(tx as unknown as PrismaClient);

        const contextA = await txRepo.create({
          name: newNames[0],
          description: existing.description,
          project: { connect: { id: projectId } },
          ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
        });

        const contextB = await txRepo.create({
          name: newNames[1],
          project: { connect: { id: projectId } },
          ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
        });

        // Move children to contextA by default
        await tx.context.updateMany({
          where: { parentId: id },
          data: { parentId: contextA.id },
        });

        // Move unit memberships to contextA by default
        await tx.unitContext.updateMany({
          where: { contextId: id },
          data: { contextId: contextA.id },
        });

        // Delete original
        await tx.context.delete({ where: { id } });

        return { contextA, contextB };
      });
    },

    async mergeContexts(
      sourceId: string,
      targetId: string,
    ) {
      const [source, target] = await Promise.all([
        repo.findById(sourceId),
        repo.findById(targetId),
      ]);

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source context not found" });
      }
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target context not found" });
      }

      return db.$transaction(async (tx) => {
        // Move children of source to target
        await tx.context.updateMany({
          where: { parentId: sourceId },
          data: { parentId: targetId },
        });

        // Move unit memberships — skip duplicates by fetching existing
        const sourceUnits = await tx.unitContext.findMany({
          where: { contextId: sourceId },
        });
        const existingTargetUnits = await tx.unitContext.findMany({
          where: { contextId: targetId },
          select: { unitId: true },
        });
        const existingUnitIds = new Set(existingTargetUnits.map((u) => u.unitId));

        for (const su of sourceUnits) {
          if (!existingUnitIds.has(su.unitId)) {
            await tx.unitContext.update({
              where: { id: su.id },
              data: { contextId: targetId },
            });
          }
        }

        // Delete source context (cascade removes remaining unit_context rows)
        await tx.context.delete({ where: { id: sourceId } });

        // Return updated target
        const txRepo = createContextRepository(tx as unknown as PrismaClient);
        return txRepo.findById(targetId);
      });
    },
  };
}
