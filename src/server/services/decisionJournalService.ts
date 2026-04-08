import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type DecisionOption = {
  label: string;
  description: string;
  pros: string[];
  cons: string[];
};

export type DecisionJournalEntry = {
  id: string;
  title: string;
  context: string;
  options: DecisionOption[];
  chosen: string | null;
  rationale: string | null;
  outcome: string | null;
  unitIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

// ─── Service Factory ───────────────────────────────────────────────

export function createDecisionJournalService(db: PrismaClient) {
  async function create(params: {
    title: string;
    context: string;
    options: DecisionOption[];
    userId: string;
    projectId: string;
    unitIds?: string[];
  }): Promise<DecisionJournalEntry> {
    const entry = await db.decisionJournal.create({
      data: {
        title: params.title,
        context: params.context,
        options: JSON.parse(JSON.stringify(params.options)),
        userId: params.userId,
        projectId: params.projectId,
        unitIds: params.unitIds ?? [],
      },
    });

    return mapEntry(entry);
  }

  async function listByProject(projectId: string): Promise<DecisionJournalEntry[]> {
    const entries = await db.decisionJournal.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return entries.map(mapEntry);
  }

  async function getById(id: string): Promise<DecisionJournalEntry | null> {
    const entry = await db.decisionJournal.findUnique({ where: { id } });
    return entry ? mapEntry(entry) : null;
  }

  async function recordDecision(
    id: string,
    chosen: string,
    rationale: string,
  ): Promise<DecisionJournalEntry> {
    const entry = await db.decisionJournal.update({
      where: { id },
      data: { chosen, rationale },
    });

    return mapEntry(entry);
  }

  async function recordOutcome(
    id: string,
    outcome: string,
  ): Promise<DecisionJournalEntry> {
    const entry = await db.decisionJournal.update({
      where: { id },
      data: { outcome },
    });

    return mapEntry(entry);
  }

  async function linkUnits(
    id: string,
    unitIds: string[],
  ): Promise<DecisionJournalEntry> {
    const existing = await db.decisionJournal.findUniqueOrThrow({
      where: { id },
      select: { unitIds: true },
    });

    const merged = [...new Set([...existing.unitIds, ...unitIds])];
    const entry = await db.decisionJournal.update({
      where: { id },
      data: { unitIds: merged },
    });

    return mapEntry(entry);
  }

  async function remove(id: string): Promise<void> {
    await db.decisionJournal.delete({ where: { id } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapEntry(row: any): DecisionJournalEntry {
    return {
      id: row.id,
      title: row.title,
      context: row.context,
      options: (row.options ?? []) as DecisionOption[],
      chosen: row.chosen,
      rationale: row.rationale,
      outcome: row.outcome,
      unitIds: row.unitIds ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return { create, listByProject, getById, recordDecision, recordOutcome, linkUnits, remove };
}

export type DecisionJournalService = ReturnType<typeof createDecisionJournalService>;
