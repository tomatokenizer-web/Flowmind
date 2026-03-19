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
});
