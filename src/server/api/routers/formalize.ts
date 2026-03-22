import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { enforceRateLimit } from "@/server/ai";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ["essay", "research_paper", "debate_brief", "presentation", "blank"] as const;
type TemplateType = (typeof TEMPLATE_TYPES)[number];

const TEMPLATE_SLOTS: Record<TemplateType, string[]> = {
  essay: ["Introduction", "Body I", "Body II", "Body III", "Conclusion"],
  research_paper: ["Abstract", "Introduction", "Methods", "Results", "Discussion"],
  presentation: ["Hook", "Problem", "Solution", "Evidence", "Call to Action"],
  debate_brief: ["Claim", "Warrant I", "Warrant II", "Evidence", "Rebuttal"],
  blank: [],
};

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  essay: "Essay",
  research_paper: "Research Paper",
  debate_brief: "Debate Brief",
  presentation: "Presentation",
  blank: "Blank (No Template)",
};

// Unit type → slot affinity (for heuristic + AI scoring)
const SLOT_TYPE_AFFINITY: Record<string, string[]> = {
  introduction: ["observation", "definition", "question"],
  abstract: ["observation", "claim"],
  hook: ["claim", "observation", "question"],
  problem: ["observation", "question"],
  "body i": ["claim", "evidence"],
  "body ii": ["claim", "evidence", "counterargument"],
  "body iii": ["claim", "evidence"],
  conclusion: ["claim"],
  methods: ["action", "observation"],
  results: ["evidence", "observation"],
  discussion: ["claim", "assumption"],
  claim: ["claim"],
  "warrant i": ["claim", "evidence"],
  "warrant ii": ["claim", "evidence"],
  evidence: ["evidence"],
  rebuttal: ["counterargument"],
  solution: ["claim", "idea"],
  "call to action": ["action"],
};

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const analyzeSchema = z.object({
  projectId: z.string().uuid(),
});

const confirmSchema = z.object({
  projectId: z.string().uuid(),
  templateType: z.enum(TEMPLATE_TYPES),
  assemblyName: z.string().min(1).max(200),
  /** Ordered array of { slot, unitId } pairs — unitId may be null for empty slots */
  mappings: z.array(
    z.object({
      slot: z.string(),
      unitId: z.string().uuid().nullable(),
      position: z.number().int().min(0),
    })
  ),
});

// ─── Rate-limited procedure ───────────────────────────────────────────────────

const rateLimitedProcedure = protectedProcedure.use(async ({ ctx, path, next }) => {
  const userId = ctx.session.user.id;
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  await enforceRateLimit(ctx.db, userId, path);
  return next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Score how well a set of units fits a template based on unit type distribution */
function scoreTemplateFit(
  units: Array<{ unitType: string }>,
  templateType: TemplateType
): number {
  const slots = TEMPLATE_SLOTS[templateType];
  if (slots.length === 0) return 0.5; // blank always scores 0.5

  const typeCounts: Record<string, number> = {};
  for (const u of units) {
    typeCounts[u.unitType] = (typeCounts[u.unitType] ?? 0) + 1;
  }

  let matchedSlots = 0;
  const usedTypes = new Set<string>();

  for (const slot of slots) {
    const key = slot.toLowerCase().replace(/\s+[ivx]+$/i, "").trim();
    const affinityTypes = SLOT_TYPE_AFFINITY[key] ?? [];
    const hit = affinityTypes.find((t) => (typeCounts[t] ?? 0) > 0 && !usedTypes.has(t));
    if (hit) {
      matchedSlots++;
      usedTypes.add(hit);
    }
  }

  return Math.round((matchedSlots / slots.length) * 100) / 100;
}

/** Build heuristic unit→slot mappings for a template */
function buildMappings(
  units: Array<{ id: string; unitType: string; content: string; lifecycle: string }>,
  templateType: TemplateType
): Array<{ slot: string; unitId: string | null; confidence: number; position: number }> {
  const slots = TEMPLATE_SLOTS[templateType];
  const usedUnitIds = new Set<string>();
  const activeUnits = units.filter((u) => u.lifecycle !== "draft" && u.lifecycle !== "archived" && u.lifecycle !== "discarded");

  return slots.map((slot, position) => {
    const key = slot.toLowerCase().replace(/\s+[ivx]+$/i, "").trim();
    const affinityTypes = SLOT_TYPE_AFFINITY[key] ?? [];

    const candidate = activeUnits.find(
      (u) => affinityTypes.includes(u.unitType) && !usedUnitIds.has(u.id)
    );

    if (candidate) {
      usedUnitIds.add(candidate.id);
      const isPrimary = affinityTypes[0] === candidate.unitType;
      return { slot, unitId: candidate.id, confidence: isPrimary ? 0.85 : 0.6, position };
    }

    return { slot, unitId: null, confidence: 0, position };
  });
}

/** Determine gaps: which slots have no mapped unit */
function buildGapAnalysis(
  mappings: Array<{ slot: string; unitId: string | null }>,
  templateType: TemplateType
): Array<{ slot: string; missing: boolean; suggestedUnitType: string }> {
  const slots = TEMPLATE_SLOTS[templateType];
  return slots.map((slot, i) => {
    const mapping = mappings[i];
    const key = slot.toLowerCase().replace(/\s+[ivx]+$/i, "").trim();
    const affinityTypes = SLOT_TYPE_AFFINITY[key] ?? ["claim"];
    return {
      slot,
      missing: !mapping?.unitId,
      suggestedUnitType: affinityTypes[0] ?? "claim",
    };
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const formalizeRouter = createTRPCRouter({
  /**
   * Analyze a project's units and suggest the best template fit with mappings.
   * Uses AI when available, falls back to heuristics.
   */
  analyze: rateLimitedProcedure
    .input(analyzeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership and fetch units
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true, name: true, type: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const units = await ctx.db.unit.findMany({
        where: {
          projectId: input.projectId,
          lifecycle: { notIn: ["archived", "discarded"] },
        },
        select: {
          id: true,
          unitType: true,
          content: true,
          lifecycle: true,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      if (units.length === 0) {
        return {
          projectId: input.projectId,
          unitCount: 0,
          suggestedTemplate: "blank" as TemplateType,
          templateScores: TEMPLATE_TYPES.map((t) => ({ templateType: t, score: t === "blank" ? 0.5 : 0, label: TEMPLATE_LABELS[t] })),
          mappings: [],
          gapAnalysis: [],
          analysisSource: "heuristic" as const,
        };
      }

      // Score each template
      const templateScores = (["essay", "research_paper", "debate_brief", "presentation"] as const).map(
        (t) => ({ templateType: t as TemplateType, score: scoreTemplateFit(units, t), label: TEMPLATE_LABELS[t] })
      );
      templateScores.push({ templateType: "blank", score: 0.3, label: TEMPLATE_LABELS.blank });

      // Try AI-enhanced analysis
      let suggestedTemplate: TemplateType = "essay";
      let analysisSource: "ai" | "heuristic" = "heuristic";

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const unitSummary = units.slice(0, 20).map((u) => `[${u.unitType}] ${u.content.slice(0, 100)}`).join("\n");

        const TemplateAnalysisSchema = z.object({
          suggestedTemplate: z.enum(TEMPLATE_TYPES),
          reasoning: z.string(),
        });

        const result = await provider.generateStructured<{ suggestedTemplate: TemplateType; reasoning: string }>(
          `Analyze these thought units from a project and determine which document template fits best.

Units:
${unitSummary}

Templates available: essay, research_paper, debate_brief, presentation, blank

Choose the template that best matches the content and purpose of these units.`,
          {
            temperature: 0.2,
            maxTokens: 512,
            zodSchema: TemplateAnalysisSchema,
            schema: {
              name: "TemplateAnalysis",
              description: "Suggest the best template for these units",
              properties: {
                suggestedTemplate: { type: "string", enum: TEMPLATE_TYPES },
                reasoning: { type: "string" },
              },
              required: ["suggestedTemplate", "reasoning"],
            },
          }
        );

        suggestedTemplate = result.suggestedTemplate;
        analysisSource = "ai";

        // Update the AI-suggested template score to reflect AI confidence
        const aiScore = templateScores.find((s) => s.templateType === suggestedTemplate);
        if (aiScore && aiScore.score < 0.7) {
          aiScore.score = Math.max(aiScore.score, 0.75);
        }
      } catch {
        // Fall back to heuristic: pick highest scoring template
        const best = templateScores.reduce((a, b) => (a.score >= b.score ? a : b));
        suggestedTemplate = best.templateType;
      }

      // Build mappings for the suggested template
      const mappings = buildMappings(units, suggestedTemplate);
      const gapAnalysis = buildGapAnalysis(mappings, suggestedTemplate);

      // Sort scores descending
      templateScores.sort((a, b) => b.score - a.score);

      return {
        projectId: input.projectId,
        unitCount: units.length,
        suggestedTemplate,
        templateScores,
        mappings,
        gapAnalysis,
        analysisSource,
        units: units.map((u) => ({
          id: u.id,
          unitType: u.unitType,
          contentPreview: u.content.slice(0, 120),
          lifecycle: u.lifecycle,
        })),
      };
    }),

  /**
   * Apply formalization: create an assembly from template with mapped units.
   */
  confirm: protectedProcedure
    .input(confirmSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Verify all provided unit IDs belong to this project
      const unitIds = input.mappings.map((m) => m.unitId).filter((id): id is string => id !== null);
      if (unitIds.length > 0) {
        const units = await ctx.db.unit.findMany({
          where: { id: { in: unitIds }, projectId: input.projectId },
          select: { id: true, lifecycle: true },
        });

        const validIds = new Set(units.filter((u) => u.lifecycle !== "draft").map((u) => u.id));
        const invalidIds = unitIds.filter((id) => !validIds.has(id));
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Some units are not valid for assembly (draft or not found): ${invalidIds.join(", ")}`,
          });
        }
      }

      // Create the assembly
      const assembly = await ctx.db.assembly.create({
        data: {
          name: input.assemblyName,
          projectId: input.projectId,
          templateType: input.templateType === "blank" ? null : input.templateType,
          sourceMap: { formalizedFrom: "freeform", createdAt: new Date().toISOString() },
          items: {
            create: input.mappings
              .filter((m) => m.unitId !== null)
              .map((m) => ({
                unitId: m.unitId!,
                position: m.position,
                bridgeText: null,
              })),
          },
        },
        select: {
          id: true,
          name: true,
          templateType: true,
          _count: { select: { items: true } },
        },
      });

      return {
        assemblyId: assembly.id,
        assemblyName: assembly.name,
        templateType: assembly.templateType,
        unitCount: assembly._count.items,
      };
    }),

  /**
   * Get the current formalization status for a project:
   * whether it already has formal assemblies, and basic unit type breakdown.
   */
  getJob: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true, name: true, type: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const [units, assemblies] = await Promise.all([
        ctx.db.unit.findMany({
          where: { projectId: input.projectId, lifecycle: { notIn: ["archived", "discarded"] } },
          select: { unitType: true, lifecycle: true },
        }),
        ctx.db.assembly.findMany({
          where: { projectId: input.projectId },
          select: { id: true, name: true, templateType: true, _count: { select: { items: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      // Unit type breakdown
      const typeCounts: Record<string, number> = {};
      for (const u of units) {
        typeCounts[u.unitType] = (typeCounts[u.unitType] ?? 0) + 1;
      }

      const isFreeform = !project.type || project.type === "freeform" || project.type === "blank";
      const hasAssemblies = assemblies.length > 0;

      return {
        projectId: input.projectId,
        projectName: project.name,
        isFreeform,
        unitCount: units.length,
        typeCounts,
        existingAssemblies: assemblies,
        hasAssemblies,
        canFormalize: units.length >= 2,
      };
    }),
});
