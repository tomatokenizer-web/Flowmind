import type { Prisma, PrismaClient } from "@prisma/client";

export type ResourceWithUnits = Prisma.ResourceUnitGetPayload<{
  include: { units: { include: { unit: true } } };
}>;

export interface FindManyResourceOptions {
  where?: Prisma.ResourceUnitWhereInput;
  orderBy?: Prisma.ResourceUnitOrderByWithRelationInput;
  cursor?: string;
  take?: number;
}

export function createResourceRepository(db: PrismaClient) {
  return {
    async create(data: Prisma.ResourceUnitCreateInput) {
      return db.resourceUnit.create({ data });
    },

    async findById(id: string): Promise<ResourceWithUnits | null> {
      return db.resourceUnit.findUnique({
        where: { id },
        include: {
          units: { include: { unit: true } },
        },
      });
    },

    async findMany({ where, orderBy, cursor, take = 20 }: FindManyResourceOptions) {
      const args: Prisma.ResourceUnitFindManyArgs = {
        where,
        orderBy: orderBy ?? { createdAt: "desc" },
        take: take + 1,
        include: {
          units: { select: { unitId: true } },
        },
      };

      if (cursor) {
        args.cursor = { id: cursor };
        args.skip = 1;
      }

      const items = await db.resourceUnit.findMany(args);
      const hasMore = items.length > take;
      if (hasMore) items.pop();

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    },

    async update(id: string, data: Prisma.ResourceUnitUpdateInput) {
      return db.resourceUnit.update({ where: { id }, data });
    },

    async delete(id: string) {
      return db.resourceUnit.delete({ where: { id } });
    },

    async linkToUnit(resourceId: string, unitId: string, role?: string) {
      return db.unitResource.create({
        data: {
          resource: { connect: { id: resourceId } },
          unit: { connect: { id: unitId } },
          role,
        },
      });
    },

    async unlinkFromUnit(resourceId: string, unitId: string) {
      return db.unitResource.delete({
        where: {
          unitId_resourceId: { unitId, resourceId },
        },
      });
    },

    async findByUnitId(unitId: string) {
      return db.unitResource.findMany({
        where: { unitId },
        include: { resource: true },
        orderBy: { sortOrder: "asc" },
      });
    },
  };
}

export type ResourceRepository = ReturnType<typeof createResourceRepository>;
