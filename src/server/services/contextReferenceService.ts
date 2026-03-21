import type { PrismaClient } from "@prisma/client";

export function createContextReferenceService(db: PrismaClient) {
  async function create({
    sourceContextId,
    targetContextId,
    description,
    createdById,
  }: {
    sourceContextId: string;
    targetContextId: string;
    description?: string;
    createdById: string;
  }) {
    return db.contextReference.create({
      data: {
        sourceContextId,
        targetContextId,
        description: description ?? null,
        createdById,
      },
      include: {
        sourceContext: { select: { id: true, name: true } },
        targetContext: { select: { id: true, name: true } },
      },
    });
  }

  async function listByContext(contextId: string) {
    const [asSource, asTarget] = await Promise.all([
      db.contextReference.findMany({
        where: { sourceContextId: contextId },
        include: {
          targetContext: { select: { id: true, name: true, description: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.contextReference.findMany({
        where: { targetContextId: contextId },
        include: {
          sourceContext: { select: { id: true, name: true, description: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { asSource, asTarget };
  }

  async function remove(id: string, userId: string) {
    const ref = await db.contextReference.findUnique({ where: { id } });
    if (!ref) {
      throw new Error("Context reference not found");
    }
    if (ref.createdById !== userId) {
      throw new Error("Not authorized to delete this reference");
    }
    return db.contextReference.delete({ where: { id } });
  }

  return { create, listByContext, remove };
}
