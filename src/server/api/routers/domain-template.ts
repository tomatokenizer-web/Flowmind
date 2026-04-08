import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createDomainTemplateService } from "@/server/services/domainTemplateService";

async function verifyProject(
  db: Parameters<typeof createDomainTemplateService>[0],
  projectId: string,
  userId: string,
) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

export const domainTemplateRouter = createTRPCRouter({
  /** List all domain templates from DB */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.domainTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, type: true, config: true },
    });
  }),

  /** Get a single domain template by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.domainTemplate.findUnique({
        where: { id: input.id },
        select: { id: true, name: true, slug: true, type: true, config: true },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return template;
    }),

  /** Get a template by slug */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.domainTemplate.findUnique({
        where: { slug: input.slug },
        select: { id: true, name: true, slug: true, type: true, config: true },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return template;
    }),

  /** Get all 5 built-in template configs (rich metadata, no DB call) */
  builtInTemplates: protectedProcedure.query(() => {
    const svc = createDomainTemplateService(null as never); // no DB needed
    return svc.getBuiltInTemplates();
  }),

  /** Get detailed config for a specific built-in template */
  getConfig: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      const config = svc.getTemplateConfig(input.slug);
      if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Template config not found" });
      return config;
    }),

  /** Get available unit types (core + domain) for a template */
  unitTypes: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return svc.getAvailableUnitTypes(input.slug);
    }),

  /** Get scale levels for a template */
  scaleLevels: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return svc.getScaleLevels(input.slug);
    }),

  /** Get assembly format options for a template */
  assemblyFormats: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return svc.getAssemblyFormats(input.slug);
    }),

  /** Get gap detection rules for a template */
  gapDetectionRules: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return svc.getGapDetectionRules(input.slug);
    }),

  /** Get expected topology for a template */
  expectedTopology: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return svc.getExpectedTopology(input.slug);
    }),

  /** Apply scaffold questions to a context (creates Units) */
  applyScaffold: protectedProcedure
    .input(z.object({
      templateSlug: z.string(),
      projectId: z.string(),
      contextId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createDomainTemplateService(ctx.db);
      return svc.applyScaffold(
        input.templateSlug,
        input.projectId,
        input.contextId,
        ctx.session.user.id!,
      );
    }),

  /** Resolve a domain display type to its core storage type */
  resolveCoreType: protectedProcedure
    .input(z.object({ templateSlug: z.string(), displayType: z.string() }))
    .query(({ input }) => {
      const svc = createDomainTemplateService(null as never);
      return { coreType: svc.resolveCoreType(input.templateSlug, input.displayType) };
    }),
});
