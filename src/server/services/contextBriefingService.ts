import type { PrismaClient } from "@prisma/client";
import { createContextVisitService } from "./contextVisitService";
import { getAIProvider } from "@/server/ai/provider";
import { logger } from "@/server/logger";

export interface BriefingData {
  lastVisitedAt: Date;
  unitsAddedCount: number;
  unitsModifiedCount: number;
  openQuestions: string[];
  aiSuggestions: string[];
  lastViewedUnitId: string | null;
}

export function createContextBriefingService(db: PrismaClient) {
  const visitService = createContextVisitService(db);

  async function getBriefing(
    userId: string,
    contextId: string,
  ): Promise<BriefingData | null> {
    const visit = await visitService.getLastVisit(userId, contextId);

    // First visit — skip briefing
    if (!visit) return null;

    const lastVisitedAt = visit.lastVisitedAt;

    // Count units added since last visit
    const unitsAddedCount = await db.unitContext.count({
      where: {
        contextId,
        assignedAt: { gt: lastVisitedAt },
      },
    });

    // Count units modified since last visit
    const unitsModifiedCount = await db.unit.count({
      where: {
        unitContexts: { some: { contextId } },
        modifiedAt: { gt: lastVisitedAt },
      },
    });

    // Fetch context metadata + recent units for AI analysis
    const context = await db.context.findUnique({
      where: { id: contextId },
      select: {
        name: true,
        description: true,
        openQuestions: true,
        unitContexts: {
          take: 20,
          orderBy: { assignedAt: "desc" },
          select: {
            unit: {
              select: {
                content: true,
                unitType: true,
                lifecycle: true,
              },
            },
          },
        },
      },
    });

    const openQuestions = Array.isArray(context?.openQuestions)
      ? (context.openQuestions as string[])
      : [];

    // Generate AI suggestions based on actual context content
    const aiSuggestions = await generateAISuggestions({
      contextName: context?.name ?? "this context",
      contextDescription: context?.description ?? null,
      recentUnits: (context?.unitContexts ?? []).map((uc) => uc.unit),
      openQuestions,
      unitsAddedCount,
      unitsModifiedCount,
      lastVisitedAt,
    });

    return {
      lastVisitedAt,
      unitsAddedCount,
      unitsModifiedCount,
      openQuestions,
      aiSuggestions,
      lastViewedUnitId: visit.lastViewedUnitId,
    };
  }

  return { getBriefing };
}

// ─── AI Suggestion Generator ──────────────────────────────────────────

interface SuggestionInput {
  contextName: string;
  contextDescription: string | null;
  recentUnits: Array<{
    content: string;
    unitType: string;
    lifecycle: string;
  }>;
  openQuestions: string[];
  unitsAddedCount: number;
  unitsModifiedCount: number;
  lastVisitedAt: Date;
}

async function generateAISuggestions(
  input: SuggestionInput,
): Promise<string[]> {
  const {
    contextName,
    contextDescription,
    recentUnits,
    openQuestions,
    unitsAddedCount,
    unitsModifiedCount,
    lastVisitedAt,
  } = input;

  // If there's nothing to work with, return minimal fallback
  if (recentUnits.length === 0 && openQuestions.length === 0) {
    return [];
  }

  // Build a compact summary of the context for the AI
  const unitSummary = recentUnits
    .slice(0, 10)
    .map((u) => `[${u.unitType}] ${u.content.slice(0, 120)}`)
    .join("\n");

  const hoursSince = Math.round(
    (Date.now() - lastVisitedAt.getTime()) / (1000 * 60 * 60),
  );
  const timeSince =
    hoursSince < 24
      ? `${hoursSince} hour${hoursSince === 1 ? "" : "s"}`
      : `${Math.round(hoursSince / 24)} day${Math.round(hoursSince / 24) === 1 ? "" : "s"}`;

  const prompt = `You are a focused thinking assistant. The user is returning to a knowledge context after ${timeSince} away.

Context: "${contextName}"${contextDescription ? `\nDescription: ${contextDescription}` : ""}

Recent units (most recent first):
${unitSummary || "(no units yet)"}

${openQuestions.length > 0 ? `Open questions:\n${openQuestions.map((q) => `- ${q}`).join("\n")}` : ""}
${unitsAddedCount > 0 ? `\n${unitsAddedCount} unit(s) were added since the last visit.` : ""}
${unitsModifiedCount > 0 ? `${unitsModifiedCount} unit(s) were modified since the last visit.` : ""}

Generate 2-3 brief, actionable suggestions to help the user re-engage with this context. Focus on:
- Gaps in the reasoning (missing evidence, unanswered questions, unstated assumptions)
- Logical next steps based on the current content
- Connections or tensions worth exploring

Respond with a JSON array of short suggestion strings (max 15 words each). Example:
["Consider adding evidence for the main claim", "Resolve the tension between X and Y"]`;

  try {
    const provider = getAIProvider();
    const raw = await provider.generateText(prompt, {
      maxTokens: 256,
      temperature: 0.4,
      systemPrompt:
        "You output only valid JSON arrays of strings. No markdown, no explanation.",
    });

    // Parse the JSON array from the response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      logger.warn({ raw }, "AI briefing: no JSON array found in response");
      return fallbackSuggestions(input);
    }

    const parsed: unknown = JSON.parse(match[0]);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((s) => typeof s === "string")
    ) {
      logger.warn({ parsed }, "AI briefing: unexpected response shape");
      return fallbackSuggestions(input);
    }

    return (parsed as string[]).slice(0, 3);
  } catch (error) {
    logger.warn(
      { error },
      "AI briefing: failed to generate suggestions, using fallback",
    );
    return fallbackSuggestions(input);
  }
}

// ─── Fallback (used when AI is unavailable) ───────────────────────────

function fallbackSuggestions(input: SuggestionInput): string[] {
  const suggestions: string[] = [];

  if (input.openQuestions.length > 0) {
    suggestions.push(
      `${input.openQuestions.length} open question${input.openQuestions.length === 1 ? "" : "s"} need${input.openQuestions.length === 1 ? "s" : ""} attention`,
    );
  }
  if (input.unitsAddedCount > 0) {
    suggestions.push("Review newly added units since your last visit");
  }

  // Check for imbalanced unit types
  const typeCounts: Record<string, number> = {};
  for (const u of input.recentUnits) {
    typeCounts[u.unitType] = (typeCounts[u.unitType] ?? 0) + 1;
  }
  const hasClaims = (typeCounts.claim ?? 0) > 0;
  const hasEvidence = (typeCounts.evidence ?? 0) > 0;
  const hasCounterargs = (typeCounts.counterargument ?? 0) > 0;

  if (hasClaims && !hasEvidence) {
    suggestions.push("Add evidence to support your claims");
  } else if (hasClaims && !hasCounterargs) {
    suggestions.push("Consider adding counterarguments to strengthen your reasoning");
  }

  return suggestions.slice(0, 3);
}
