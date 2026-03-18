import type { Prisma, PrismaClient } from "@prisma/client";

export type ContextWithRelations = Prisma.ContextGetPayload<{
  include: {
    children: true;
    parent: true;
    _count: { select: { unitContexts: true; perspectives: true } };
  };
}>;

export function createContextRepository(db: PrismaClient) {
  return {
    async create(data: Prisma.ContextCreateInput) {
      return db.context.create({
        data,
        include: {
          children: true,
          parent: true,
          _count: { select: { unitContexts: true, perspectives: true } },
        },
      });
    },

    async findById(id: string): Promise<ContextWithRelations | null> {
      return db.context.findUnique({
        where: { id },
        include: {
          children: true,
          parent: true,
          _count: { select: { unitContexts: true, perspectives: true } },
        },
      });
    },

    async findMany(projectId: string, parentId?: string | null) {
      return db.context.findMany({
        where: {
          projectId,
          ...(parentId !== undefined ? { parentId } : {}),
        },
        include: {
          children: true,
          parent: true,
          _count: { select: { unitContexts: true, perspectives: true } },
        },
        orderBy: { name: "asc" },
      });
    },

    async update(id: string, data: Prisma.ContextUpdateInput) {
      return db.context.update({
        where: { id },
        data,
        include: {
          children: true,
          parent: true,
          _count: { select: { unitContexts: true, perspectives: true } },
        },
      });
    },

    async delete(id: string) {
      return db.context.delete({ where: { id } });
    },

    async findByNameInScope(name: string, projectId: string, parentId: string | null) {
      return db.context.findFirst({
        where: { name, projectId, parentId },
      });
    },

    async addUnit(unitId: string, contextId: string) {
      return db.unitContext.upsert({
        where: { unitId_contextId: { unitId, contextId } },
        create: { unitId, contextId },
        update: {},
      });
    },

    async removeUnit(unitId: string, contextId: string) {
      return db.unitContext.delete({
        where: { unitId_contextId: { unitId, contextId } },
      });
    },

    async getUnitsForContext(contextId: string) {
      return db.unitContext.findMany({
        where: { contextId },
        include: { unit: true },
        orderBy: { assignedAt: "desc" },
      });
    },
  };
}
