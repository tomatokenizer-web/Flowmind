import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
    .input(z.object({ id: z.string() }))
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return template;
    }),

  /**
   * Get a template by slug
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return template;
    }),
});
