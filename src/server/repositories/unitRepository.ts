import type { Prisma, PrismaClient } from "@prisma/client";

export type UnitWithRelations = Prisma.UnitGetPayload<{
  include: {
    perspectives: {
      include: { relations: true };
    };
    versions: true;
  };
}>;

export interface FindManyOptions {
  where?: Prisma.UnitWhereInput;
  orderBy?: Prisma.UnitOrderByWithRelationInput;
  cursor?: string;
  take?: number;
}

export function createUnitRepository(db: PrismaClient) {
  return {
    async create(data: Prisma.UnitCreateInput) {
      return db.unit.create({ data });
    },

    async findById(id: string): Promise<UnitWithRelations | null> {
      return db.unit.findUnique({
        where: { id },
        include: {
          perspectives: {
            include: { relations: true },
          },
          versions: {
            orderBy: { version: "desc" },
            take: 5,
          },
        },
      });
    },

    async findMany({ where, orderBy, cursor, take = 20 }: FindManyOptions) {
      const args: Prisma.UnitFindManyArgs = {
        where,
        orderBy: orderBy ?? { createdAt: "desc" },
        take: take + 1, // Fetch one extra for cursor-based pagination
      };

      if (cursor) {
        args.cursor = { id: cursor };
        args.skip = 1; // Skip the cursor itself
      }

      const items = await db.unit.findMany(args);
      const hasMore = items.length > take;
      if (hasMore) items.pop();

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    },

    async update(id: string, data: Prisma.UnitUpdateInput) {
      return db.unit.update({ where: { id }, data });
    },

    async delete(id: string) {
      return db.unit.delete({ where: { id } });
    },

    async getLatestVersionNumber(unitId: string): Promise<number> {
      const latest = await db.unitVersion.findFirst({
        where: { unitId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      return latest?.version ?? 0;
    },

    async createVersion(data: Prisma.UnitVersionCreateInput) {
      return db.unitVersion.create({ data });
    },

    /**
     * Find the first non-archived unit in `projectId` whose content is an
     * exact (case-sensitive) match for `content`.
     * Used by the duplicate-content check in unitService.create().
     */
    async findByExactContent(projectId: string, content: string) {
      return db.unit.findFirst({
        where: {
          projectId,
          content,
          lifecycle: { not: "archived" },
        },
        select: { id: true, content: true, lifecycle: true },
      });
    },
  };
}

export type UnitRepository = ReturnType<typeof createUnitRepository>;
