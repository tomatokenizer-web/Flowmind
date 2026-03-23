import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateKey(): string {
  return `fm_${crypto.randomBytes(32).toString("hex")}`;
}

export const apiKeyRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    // ApiKey model not yet in Prisma schema — return empty list
    return [] as Array<{ id: string; name: string; createdAt: string; lastUsed?: string | null }>;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "API key management is not yet available",
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "API key management is not yet available",
      });
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "API key management is not yet available",
      });
    }),

  // Full data export — returns all user-owned data across every model
  exportAllData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const [
      projects,
      units,
      contexts,
      assemblies,
      relations,
      resources,
      tags,
    ] = await Promise.all([
      ctx.db.project.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          type: true,
          constraintLevel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      ctx.db.unit.findMany({
        where: { userId },
        take: 5000,
        select: {
          id: true,
          content: true,
          projectId: true,
          unitType: true,
          certainty: true,
          completeness: true,
          abstractionLevel: true,
          stance: true,
          lifecycle: true,
          quality: true,
          actionRequired: true,
          flagged: true,
          pinned: true,
          originType: true,
          sourceUrl: true,
          sourceTitle: true,
          author: true,
          isQuote: true,
          energyLevel: true,
          meta: true,
          createdAt: true,
          modifiedAt: true,
        },
      }),
      ctx.db.context.findMany({
        where: { project: { userId } },
        take: 1000,
        select: {
          id: true,
          name: true,
          description: true,
          projectId: true,
          parentId: true,
          snapshot: true,
          openQuestions: true,
          contradictions: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      ctx.db.assembly.findMany({
        where: { project: { userId } },
        take: 500,
        select: {
          id: true,
          name: true,
          projectId: true,
          templateType: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              unitId: true,
              position: true,
              bridgeText: true,
            },
            orderBy: { position: "asc" },
          },
        },
      }),
      ctx.db.relation.findMany({
        where: { sourceUnit: { userId } },
        take: 10000,
        select: {
          id: true,
          sourceUnitId: true,
          targetUnitId: true,
          type: true,
          strength: true,
          direction: true,
          purpose: true,
          isCustom: true,
          customName: true,
          createdAt: true,
        },
      }),
      ctx.db.resourceUnit.findMany({
        where: { userId },
        take: 2000,
        select: {
          id: true,
          resourceType: true,
          url: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          metadata: true,
          lifecycle: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      ctx.db.tag.findMany({
        where: { project: { userId } },
        select: {
          id: true,
          name: true,
          color: true,
          projectId: true,
          createdAt: true,
          units: {
            select: { unitId: true },
          },
        },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: "2.0",
      projects,
      units,
      contexts,
      assemblies,
      relations,
      resources,
      tags,
    };
  }),
});
