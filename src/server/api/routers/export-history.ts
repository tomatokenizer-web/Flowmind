import { z } from "zod";
import { createHash } from "crypto";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const exportHistoryRouter = createTRPCRouter({
  /**
   * List export history entries for an assembly (most recent first).
   */
  list: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify assembly belongs to user via project
      const assembly = await ctx.db.assembly.findFirst({
        where: {
          id: input.assemblyId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }

      return ctx.db.exportHistory.findMany({
        where: { assemblyId: input.assemblyId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          format: true,
          unitIds: true,
          contentHash: true,
          createdAt: true,
        },
      });
    }),

  /**
   * Record a new export event.
   */
  create: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        format: z.enum(["essay", "presentation", "email", "social"]),
        unitIds: z.array(z.string().uuid()),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify assembly belongs to user
      const assembly = await ctx.db.assembly.findFirst({
        where: {
          id: input.assemblyId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }

      const contentHash = sha256(input.content);

      return ctx.db.exportHistory.create({
        data: {
          assemblyId: input.assemblyId,
          userId: ctx.session.user.id!,
          format: input.format,
          unitIds: input.unitIds,
          contentHash,
        },
        select: {
          id: true,
          format: true,
          unitIds: true,
          contentHash: true,
          createdAt: true,
        },
      });
    }),

  /**
   * Compare current assembly unit contents against last export hash to
   * return the list of unit IDs that have changed since the last export.
   */
  getChangedUnits: protectedProcedure
    .input(
      z.object({
        assemblyId: z.string().uuid(),
        format: z.enum(["essay", "presentation", "email", "social"]),
        /** Current exported content to compare against last export */
        currentContent: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const assembly = await ctx.db.assembly.findFirst({
        where: {
          id: input.assemblyId,
          project: { userId: ctx.session.user.id },
        },
        select: {
          id: true,
          items: {
            where: { unit: { isNot: null } },
            orderBy: { position: "asc" },
            select: { unitId: true },
          },
        },
      });
      if (!assembly) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      }

      // Get the last export for this assembly+format
      const lastExport = await ctx.db.exportHistory.findFirst({
        where: {
          assemblyId: input.assemblyId,
          format: input.format,
          userId: ctx.session.user.id,
        },
        orderBy: { createdAt: "desc" },
        select: { contentHash: true, unitIds: true, createdAt: true },
      });

      if (!lastExport) {
        // Never exported before — all current units are "new"
        const currentUnitIds = assembly.items
          .map((i) => i.unitId)
          .filter((id): id is string => id !== null);
        return {
          hasChanges: currentUnitIds.length > 0,
          changedCount: currentUnitIds.length,
          lastExportedAt: null,
        };
      }

      const currentHash = sha256(input.currentContent);
      const hasChanges = currentHash !== lastExport.contentHash;

      // Determine which units are new / changed by comparing unit ID sets
      const previousUnitIdSet = new Set(lastExport.unitIds);
      const currentUnitIds = assembly.items
        .map((i) => i.unitId)
        .filter((id): id is string => id !== null);
      const newUnitIds = currentUnitIds.filter((id) => !previousUnitIdSet.has(id));

      return {
        hasChanges,
        changedCount: newUnitIds.length,
        lastExportedAt: lastExport.createdAt,
      };
    }),
});
