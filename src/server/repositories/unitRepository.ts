import type { Prisma, PrismaClient } from "@prisma/client";
import type { Lifecycle } from "@prisma/client";

export type UnitWithRelations = Prisma.UnitGetPayload<{
  include: {
    perspectives: {
      include: { relations: true };
    };
    versions: true;
    resources: {
      include: { resource: true };
    };
  };
}>;

export interface FindManyOptions {
  where?: Prisma.UnitWhereInput;
  orderBy?: Prisma.UnitOrderByWithRelationInput;
  cursor?: string;
  take?: number;
  /** When provided, include the perspective type override for this context */
  contextId?: string;
}

export function createUnitRepository(db: PrismaClient) {
  return {
    async create(data: Prisma.UnitCreateInput) {
      return db.unit.create({ data });
    },

    async findById(id: string, userId?: string): Promise<UnitWithRelations | null> {
      return db.unit.findFirst({
        where: { id, ...(userId ? { userId } : {}) },
        include: {
          perspectives: {
            include: { relations: true },
          },
          versions: {
            orderBy: { version: "desc" },
            take: 5,
          },
          resources: {
            include: { resource: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    },

    async findMany({ where, orderBy, cursor, take = 20, contextId }: FindManyOptions) {
      const args: Prisma.UnitFindManyArgs = {
        where,
        orderBy: orderBy ?? { createdAt: "desc" },
        take: take + 1, // Fetch one extra for cursor-based pagination
        select: {
          id: true,
          content: true,
          unitType: true,
          lifecycle: true,
          createdAt: true,
          modifiedAt: true,
          originType: true,
          sourceSpan: true,
          importance: true,
          pinned: true,
          flagged: true,
          driftScore: true,
          branchPotential: true,
          incubating: true,
          projectId: true,
          userId: true,
          ...(contextId
            ? {
                perspectives: {
                  where: { contextId },
                  select: { type: true },
                  take: 1,
                },
              }
            : {}),
        },
      };

      if (cursor) {
        args.cursor = { id: cursor };
        args.skip = 1; // Skip the cursor itself
      }

      const rawItems = await db.unit.findMany(args);
      const hasMore = rawItems.length > take;
      if (hasMore) rawItems.pop();

      // Flatten perspective type override into a top-level field
      const items = rawItems.map((item) => {
        const { perspectives, ...rest } = item as typeof item & {
          perspectives?: Array<{ type: string | null }>;
        };
        return {
          ...rest,
          perspectiveType: perspectives?.[0]?.type ?? null,
        };
      });

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
     * Bulk-update lifecycle for units matching the given IDs.
     * Only updates units owned by `userId` whose current lifecycle is
     * in `allowedFromStates` (i.e. the transition is valid).
     * Returns the count of updated rows.
     */
    async bulkUpdateLifecycle(
      ids: string[],
      targetLifecycle: Lifecycle,
      userId: string,
      allowedFromStates: Lifecycle[],
    ) {
      const result = await db.unit.updateMany({
        where: {
          id: { in: ids },
          project: { userId },
          lifecycle: { in: allowedFromStates },
        },
        data: {
          lifecycle: targetLifecycle,
          modifiedAt: new Date(),
        },
      });
      return result.count;
    },

    /**
     * Return id + lifecycle for units matching given IDs, scoped to userId.
     */
    async findLifecyclesByIds(ids: string[], userId: string) {
      return db.unit.findMany({
        where: {
          id: { in: ids },
          project: { userId },
        },
        select: { id: true, lifecycle: true },
      });
    },

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
