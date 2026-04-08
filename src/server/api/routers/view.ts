import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createViewService, type AttentionViewName } from "@/server/services/viewService";

const ATTENTION_VIEW_NAMES: [string, ...string[]] = [
  "orphan_units",
  "incubating",
  "high_salience",
  "stale",
  "conflicting",
  "unanswered_questions",
];

const VIEW_SORT_VALUES: [string, ...string[]] = ["salience", "date", "relation_count", "type"];
const VIEW_ORDER_VALUES: [string, ...string[]] = ["asc", "desc"];

export const viewRouter = createTRPCRouter({
  /**
   * Get a predefined attention view by name.
   */
  attention: protectedProcedure
    .input(z.object({
      name: z.enum(ATTENTION_VIEW_NAMES),
      projectId: z.string().uuid(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const viewService = createViewService(ctx.db);
      return viewService.getAttentionView(
        input.name as AttentionViewName,
        input.projectId,
        input.limit,
      );
    }),

  /**
   * Custom filtered/sorted view of units.
   */
  custom: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      filter: z.object({
        unitType: z.string().optional(),
        lifecycle: z.string().optional(),
        salienceMin: z.number().min(0).max(1).optional(),
        salienceMax: z.number().min(0).max(1).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        minRelations: z.number().int().min(0).optional(),
        maxRelations: z.number().int().min(0).optional(),
      }).default({}),
      sort: z.enum(VIEW_SORT_VALUES).default("date"),
      order: z.enum(VIEW_ORDER_VALUES).default("desc"),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const viewService = createViewService(ctx.db);
      return viewService.customView(
        input.projectId,
        input.filter,
        input.sort as "salience" | "date" | "relation_count" | "type",
        input.order as "asc" | "desc",
        input.limit,
      );
    }),

  /**
   * List available predefined attention view definitions.
   */
  definitions: protectedProcedure.query(() => {
    return [
      { name: "orphan_units", label: "Orphan Units", description: "Units with 0 relations" },
      { name: "incubating", label: "Incubating", description: "Recently created, low relation count" },
      { name: "high_salience", label: "High Salience", description: "Top units by salience score" },
      { name: "stale", label: "Stale", description: "Not updated in 30+ days, salience decaying" },
      { name: "conflicting", label: "Conflicting", description: "Units involved in contradicts relations" },
      { name: "unanswered_questions", label: "Unanswered Questions", description: "Question units without answers" },
    ];
  }),

  /**
   * Return hardcoded reusable view preset definitions.
   * Includes the 6 attention views as presets plus 2 common custom presets.
   * No DB table required — these are static configuration objects.
   */
  presets: protectedProcedure.query(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return [
      {
        id: "orphan_units",
        name: "Orphan Units",
        description: "Units with no relations — candidates for linking or deletion",
        attentionView: "orphan_units" as const,
        filters: { maxRelations: 0 },
        sort: "date" as const,
        order: "desc" as const,
      },
      {
        id: "incubating",
        name: "Incubating",
        description: "Recently created units still being developed",
        attentionView: "incubating" as const,
        filters: {},
        sort: "date" as const,
        order: "desc" as const,
      },
      {
        id: "high_salience",
        name: "High Salience",
        description: "Your most important units by salience score",
        attentionView: "high_salience" as const,
        filters: { salienceMin: 0.7 },
        sort: "salience" as const,
        order: "desc" as const,
      },
      {
        id: "stale",
        name: "Stale",
        description: "Units not updated in 30+ days with decaying salience",
        attentionView: "stale" as const,
        filters: {},
        sort: "date" as const,
        order: "asc" as const,
      },
      {
        id: "conflicting",
        name: "Conflicting",
        description: "Units involved in contradicts relations",
        attentionView: "conflicting" as const,
        filters: {},
        sort: "relation_count" as const,
        order: "desc" as const,
      },
      {
        id: "unanswered_questions",
        name: "Unanswered Questions",
        description: "Question units without any answers linked",
        attentionView: "unanswered_questions" as const,
        filters: {},
        sort: "date" as const,
        order: "asc" as const,
      },
      {
        id: "recent_activity",
        name: "Recent Activity",
        description: "Units created or updated in the last 7 days",
        attentionView: null,
        filters: { dateFrom: sevenDaysAgo },
        sort: "date" as const,
        order: "desc" as const,
      },
      {
        id: "most_connected",
        name: "Most Connected",
        description: "Units with the most relations — your knowledge hubs",
        attentionView: null,
        filters: {},
        sort: "relation_count" as const,
        order: "desc" as const,
      },
    ];
  }),
});
