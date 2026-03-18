import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { BASE_UNIT_TYPES } from "@/lib/unit-types";
import { DOMAIN_TEMPLATES, getDomainTypes } from "@/lib/unit-type-config";
import { suggestUnitType } from "@/server/services/typeHeuristicService";

// ─── Unit Type Router ──────────────────────────────────────────────

export const unitTypeRouter = createTRPCRouter({
  /** List all 9 base unit types with colors, icons, descriptions */
  listBaseTypes: protectedProcedure.query(() => {
    return BASE_UNIT_TYPES;
  }),

  /** List domain-specific types for a given domain id */
  listDomainTypes: protectedProcedure
    .input(
      z.object({
        domainId: z.string().min(1),
      }),
    )
    .query(({ input }) => {
      const types = getDomainTypes(input.domainId);
      return {
        domainId: input.domainId,
        types,
      };
    }),

  /** List all available domain templates */
  listDomains: protectedProcedure.query(() => {
    return DOMAIN_TEMPLATES.map((d) => ({
      id: d.id,
      label: d.label,
      typeCount: d.types.length,
    }));
  }),

  /** Suggest a unit type based on content heuristics */
  suggestType: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(50000),
      }),
    )
    .query(({ input }) => {
      return suggestUnitType(input.content);
    }),
});
