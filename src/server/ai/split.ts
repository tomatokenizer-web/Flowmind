import type { PrismaClient } from "@prisma/client";
import type { AIProvider } from "./provider";
import { logger } from "../logger";
import { SplitReattributionSchema } from "./schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";
import type {
  SplitReattributionProposal,
  SplitReattributionResult,
} from "./types";

// ─── Split Re-attribution ────────────────────────────────────────────────────

/**
 * Propose how to reassign relations when splitting a unit into two parts
 */
export async function proposeSplitReattribution(
  provider: AIProvider,
  db: PrismaClient,
  unitId: string,
  contentA: string,
  contentB: string,
): Promise<SplitReattributionResult> {
  // Fetch the unit's existing relations
  const relations = await db.relation.findMany({
    where: {
      OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }],
    },
    include: {
      sourceUnit: { select: { id: true, content: true, unitType: true } },
      targetUnit: { select: { id: true, content: true, unitType: true } },
    },
  });

  if (relations.length === 0) {
    return { proposals: [] };
  }

  const relationsDesc = relations
    .map((r) => {
      const isSource = r.sourceUnitId === unitId;
      const other = isSource ? r.targetUnit : r.sourceUnit;
      return `[${r.id}] ${r.type} ${isSource ? "\u2192" : "\u2190"} ${sanitizeUserContent(other.content.slice(0, 80))} (${other.unitType})`;
    })
    .join("\n");

  const prompt = `${PROMPT_INJECTION_GUARD}

A thought unit is being split into two parts. Help decide which part should inherit each existing relation.

ORIGINAL UNIT is being split into:
Part A: ${sanitizeUserContent(contentA.slice(0, 300))}
Part B: ${sanitizeUserContent(contentB.slice(0, 300))}

EXISTING RELATIONS:
${relationsDesc}

For each relation, determine which part (A or B) should inherit it based on semantic relevance.`;

  const result = await provider.generateStructured<{ proposals: SplitReattributionProposal[] }>(
    prompt,
    {
      temperature: 0.3,
      maxTokens: 1024,
      zodSchema: SplitReattributionSchema,
      schema: {
        name: "SplitReattribution",
        description: "Proposals for reassigning relations after unit split",
        properties: {
          proposals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                relationId: { type: "string" },
                assignTo: { type: "string", enum: ["A", "B"] },
                rationale: { type: "string", maxLength: 150 },
              },
              required: ["relationId", "assignTo", "rationale"],
            },
          },
        },
        required: ["proposals"],
      },
    }
  );

  logger.info({ unitId, proposalCount: result.proposals.length }, "Split reattribution proposals generated");
  return result;
}
