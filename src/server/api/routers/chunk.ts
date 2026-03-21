import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { computeChunks } from "@/server/services/chunkService";

// ─── Zod Schemas ───────────────────────────────────────────────────

const purposeEnum = z.enum(["argument", "creative", "chronological"]);

const computeChunksSchema = z.object({
  projectId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  purpose: purposeEnum,
});

// ─── Router ────────────────────────────────────────────────────────

export const chunkRouter = createTRPCRouter({
  /**
   * Compute transient chunks for a project (optionally scoped to a context).
   * Chunks are never stored — they are computed on-the-fly from units + relations.
   */
  compute: protectedProcedure
    .input(computeChunksSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Build unit filter
      const unitWhere: Record<string, unknown> = {
        projectId: input.projectId,
        userId,
      };

      // If contextId is provided, scope to units in that context
      if (input.contextId) {
        unitWhere.contexts = {
          some: { contextId: input.contextId },
        };
      }

      // Fetch units
      const units = await ctx.db.unit.findMany({
        where: unitWhere,
        select: {
          id: true,
          unitType: true,
          createdAt: true,
        },
      });

      if (units.length === 0) {
        return [];
      }

      const unitIds = units.map((u) => u.id);

      // Fetch relations between these units
      const relations = await ctx.db.relation.findMany({
        where: {
          sourceUnitId: { in: unitIds },
          targetUnitId: { in: unitIds },
        },
        select: {
          sourceUnitId: true,
          targetUnitId: true,
          type: true,
          strength: true,
        },
      });

      return computeChunks(input.purpose, units, relations);
    }),
});
