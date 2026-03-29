import type { PrismaClient } from "@prisma/client";
import { getAIProvider } from "@/server/ai";
import { logger } from "@/server/logger";

// ─── Heuristic fallback: TF-IDF–style scoring ────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

/** Build term-frequency map */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

/** Cosine similarity between two TF maps */
function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, freq] of a) {
    dot += freq * (b.get(term) ?? 0);
    magA += freq * freq;
  }
  for (const [, freq] of b) {
    magB += freq * freq;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Heuristic drift score: compares unit content against a combined
 * "project neighborhood" corpus (project name + context names/descriptions +
 * sample sibling content). Returns 0 (aligned) to 1 (drifted).
 */
function heuristicDriftScore(
  unitContent: string,
  projectCorpus: string,
): number {
  const unitTF = termFrequency(tokenize(unitContent));
  const corpusTF = termFrequency(tokenize(projectCorpus));
  const similarity = cosineSimilarity(unitTF, corpusTF);
  // Invert: high similarity → low drift
  return Math.max(0, Math.min(1, 1 - similarity));
}

// ─── AI semantic drift scoring ────────────────────────────────────────────

interface DriftAssessment {
  unitId: string;
  score: number;
  reason: string;
}

/**
 * Use AI to semantically score how much each unit has drifted from
 * the project's purpose. Processes in batches to stay within token limits.
 */
async function aiDriftScores(
  units: { id: string; content: string }[],
  projectName: string,
  contextDescriptions: string[],
): Promise<DriftAssessment[]> {
  const provider = getAIProvider();
  const BATCH_SIZE = 15;
  const results: DriftAssessment[] = [];

  const contextBlock = contextDescriptions.length > 0
    ? `\nProject contexts:\n${contextDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}`
    : "";

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    const unitList = batch
      .map((u, idx) => `[${idx}] ${u.content.slice(0, 300)}`)
      .join("\n\n");

    const prompt = `You are evaluating whether thought units belong to a project.

Project: "${projectName}"${contextBlock}

Units to evaluate:
${unitList}

For each unit, assess how semantically relevant it is to the project's purpose and topics.
Score from 0.0 (perfectly aligned) to 1.0 (completely unrelated/drifted).

Consider:
- Topical relevance: does the unit discuss themes related to the project?
- Conceptual connection: could this unit reasonably belong to this project even if tangential?
- A score of 0.0-0.3 = clearly belongs
- A score of 0.3-0.6 = loosely related, might be tangential
- A score of 0.6-1.0 = likely drifted, doesn't fit the project

Respond with ONLY a JSON array, no other text:
[{"index": 0, "score": 0.2, "reason": "brief reason"}, ...]`;

    try {
      const response = await provider.generateText(prompt, {
        maxTokens: 1024,
        temperature: 0.1,
        systemPrompt: "You are a semantic relevance evaluator. Respond only with valid JSON.",
      });

      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as {
        index: number;
        score: number;
        reason: string;
      }[];

      for (const item of parsed) {
        const unit = batch[item.index];
        if (unit) {
          results.push({
            unitId: unit.id,
            score: Math.max(0, Math.min(1, item.score)),
            reason: item.reason,
          });
        }
      }
    } catch (error) {
      logger.warn({ error, batchStart: i }, "AI drift scoring failed for batch, using heuristic fallback");
      // Fallback: use heuristic for this batch
      const corpus = `${projectName} ${contextDescriptions.join(" ")}`;
      for (const unit of batch) {
        results.push({
          unitId: unit.id,
          score: heuristicDriftScore(unit.content, corpus),
          reason: "heuristic fallback",
        });
      }
    }
  }

  return results;
}

// ─── Service ──────────────────────────────────────────────────────────────

export function createDriftService(db: PrismaClient) {
  return {
    /**
     * Update drift scores for all active units in a project using
     * AI semantic analysis with heuristic fallback.
     */
    async updateDriftScoresForProject(projectId: string) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { name: true, type: true },
      });
      if (!project?.name) return;

      // Gather context names and descriptions for richer comparison
      const contexts = await db.context.findMany({
        where: { projectId },
        select: { name: true, description: true },
      });

      const contextDescriptions = contexts
        .map((c) => `${c.name}${c.description ? `: ${c.description}` : ""}`)
        .filter(Boolean);

      const units = await db.unit.findMany({
        where: {
          projectId,
          lifecycle: { notIn: ["archived", "discarded"] },
        },
        select: { id: true, content: true },
      });

      if (units.length === 0) return;

      let assessments: DriftAssessment[];

      try {
        assessments = await aiDriftScores(
          units,
          project.name,
          contextDescriptions,
        );
      } catch (error) {
        // Full fallback to heuristic if AI is completely unavailable
        logger.warn({ error }, "AI drift scoring unavailable, using full heuristic fallback");
        const corpus = `${project.name} ${contextDescriptions.join(" ")}`;
        assessments = units.map((u) => ({
          unitId: u.id,
          score: heuristicDriftScore(u.content, corpus),
          reason: "heuristic fallback",
        }));
      }

      // Batch update all scores
      await Promise.all(
        assessments.map((a) =>
          db.unit.update({
            where: { id: a.unitId },
            data: { driftScore: a.score },
          }),
        ),
      );
    },

    async getHighDriftUnits(projectId: string, threshold = 0.7) {
      return db.unit.findMany({
        where: {
          projectId,
          driftScore: { gte: threshold },
          lifecycle: { notIn: ["archived", "discarded"] },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
          driftScore: true,
          createdAt: true,
        },
        orderBy: { driftScore: "desc" },
        take: 50,
      });
    },
  };
}
