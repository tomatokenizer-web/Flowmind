import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const domainTemplateRouter = createTRPCRouter({
  /**
   * List all available domain templates
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const templates = await ctx.db.domainTemplate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        config: true,
      },
    });

    return templates;
  }),

  /**
   * Get a single domain template by ID
   */
  getById: protectedProcedure
    .input((val: unknown) => {
      if (typeof val !== "object" || val === null) throw new Error("Invalid input");
      const obj = val as Record<string, unknown>;
      if (typeof obj.id !== "string") throw new Error("id is required");
      return { id: obj.id as string };
    })
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.domainTemplate.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          config: true,
        },
      });

      if (!template) {
        throw new Error("Template not found");
      }

      return template;
    }),

  /**
   * Get a template by slug
   */
  getBySlug: protectedProcedure
    .input((val: unknown) => {
      if (typeof val !== "object" || val === null) throw new Error("Invalid input");
      const obj = val as Record<string, unknown>;
      if (typeof obj.slug !== "string") throw new Error("slug is required");
      return { slug: obj.slug as string };
    })
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.domainTemplate.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          config: true,
        },
      });

      if (!template) {
        throw new Error("Template not found");
      }

      return template;
    }),
});
