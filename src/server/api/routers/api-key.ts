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
  list: protectedProcedure.query(async ({ ctx }) => {
    // For MVP, return empty list (ApiKey model may not be in DB yet)
    try {
      const keys = await (ctx.db as any).apiKey?.findMany({
        where: { userId: ctx.session.user.id! },
        select: { id: true, name: true, createdAt: true, lastUsed: true },
        orderBy: { createdAt: "desc" },
      });
      return keys ?? [];
    } catch {
      return [];
    }
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const key = generateKey();
      const keyHash = hashKey(key);

      try {
        await (ctx.db as any).apiKey?.create({
          data: {
            name: input.name,
            keyHash,
            userId: ctx.session.user.id!,
          },
        });
      } catch {
        // If ApiKey model doesn't exist yet, just return the key
      }

      // Return plain key ONCE — never stored in plain text
      return { key, name: input.name };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await (ctx.db as any).apiKey?.delete({ where: { id: input.id } });
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }
      return { success: true };
    }),

  // Full data export
  exportAllData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const [units, contexts, assemblies, relations] = await Promise.all([
      ctx.db.unit.findMany({ where: { userId }, take: 5000 }),
      ctx.db.context.findMany({ where: { project: { userId } }, take: 1000 }),
      ctx.db.assembly.findMany({ where: { project: { userId } }, include: { items: true }, take: 500 }),
      ctx.db.relation.findMany({
        where: { sourceUnit: { userId } },
        take: 10000,
        select: { id: true, sourceUnitId: true, targetUnitId: true, type: true, strength: true },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      units,
      contexts,
      assemblies,
      relations,
    };
  }),
});
