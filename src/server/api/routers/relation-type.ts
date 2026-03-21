import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const relationTypeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const systemTypes = await ctx.db.systemRelationType.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const grouped = systemTypes.reduce<
      Record<string, typeof systemTypes>
    >((acc, type) => {
      const cat = type.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(type);
      return acc;
    }, {});

    return grouped;
  }),

  /**
   * Get usage stats for all relation types (system + custom).
   * Returns each type with its usage count, grouped by category.
   */
  stats: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // 1. Get all system relation types
      const systemTypes = await ctx.db.systemRelationType.findMany({
        orderBy: { sortOrder: "asc" },
      });

      // 2. Count relations per type
      const typeCounts = await ctx.db.relation.groupBy({
        by: ["type"],
        _count: { type: true },
      });

      const countMap = new Map<string, number>();
      for (const tc of typeCounts) {
        countMap.set(tc.type, tc._count.type);
      }

      // 3. Build system type stats grouped by category
      const systemStats: Record<
        string,
        Array<{
          name: string;
          description: string;
          category: string;
          usageCount: number;
          isCustom: false;
        }>
      > = {};

      for (const st of systemTypes) {
        if (!systemStats[st.category]) systemStats[st.category] = [];
        systemStats[st.category]!.push({
          name: st.name,
          description: st.description,
          category: st.category,
          usageCount: countMap.get(st.name) ?? 0,
          isCustom: false,
        });
      }

      // 4. Get custom relation types for the project (if projectId provided)
      let customStats: Array<{
        name: string;
        description: string;
        category: string;
        usageCount: number;
        isCustom: true;
        scope: string;
        reusable: boolean;
      }> = [];

      if (input?.projectId) {
        const customTypes = await ctx.db.customRelationType.findMany({
          where: { projectId: input.projectId },
          orderBy: { createdAt: "asc" },
        });

        customStats = customTypes.map((ct) => ({
          name: ct.name,
          description: ct.description,
          category: "custom",
          usageCount: countMap.get(ct.name) ?? 0,
          isCustom: true as const,
          scope: ct.scope,
          reusable: ct.reusable,
        }));
      }

      // 5. Compute total relations count
      const totalRelations = Array.from(countMap.values()).reduce(
        (sum, c) => sum + c,
        0,
      );

      return {
        systemTypes: systemStats,
        customTypes: customStats,
        totalRelations,
      };
    }),
});
