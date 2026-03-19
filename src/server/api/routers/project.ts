import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const projectRouter = createTRPCRouter({
  /**
   * Get or create the user's default project.
   * Every user gets exactly one auto-created project on first use.
   */
  getOrCreateDefault: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    // Try to find existing project
    const existing = await ctx.db.project.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (existing) return existing;

    // Auto-create default project
    const created = await ctx.db.project.create({
      data: {
        name: "My Thoughts",
        userId,
        constraintLevel: "guided",
      },
      select: { id: true, name: true },
    });

    return created;
  }),
});
