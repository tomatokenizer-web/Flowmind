import type { PrismaClient, UnitType, Lifecycle, OriginType } from "@prisma/client";

type ScaffoldQuestion = {
  type: string;
  content: string;
  placeholder?: boolean;
};

type TemplateConfig = {
  scaffoldQuestions?: ScaffoldQuestion[];
  gapDetectionRules?: string[];
};

/**
 * Create scaffold units from a template's scaffold questions.
 * These are draft units that guide the user through the initial setup of their project.
 */
export async function createScaffoldUnits(
  projectId: string,
  config: TemplateConfig,
  userId: string,
  db: PrismaClient
): Promise<string[]> {
  const scaffoldQuestions = config.scaffoldQuestions ?? [];
  if (scaffoldQuestions.length === 0) {
    return [];
  }

  // Create a default "Main" context for the project if it doesn't exist
  let mainContext = await db.context.findFirst({
    where: {
      projectId,
      name: "Main",
      parentId: null,
    },
  });

  if (!mainContext) {
    mainContext = await db.context.create({
      data: {
        name: "Main",
        description: "Primary context for scaffold questions",
        projectId,
      },
    });
  }

  const createdUnitIds: string[] = [];

  // Create units for each scaffold question
  for (let i = 0; i < scaffoldQuestions.length; i++) {
    const question = scaffoldQuestions[i];
    if (!question) continue;

    // Map template unit type to Prisma UnitType enum
    const unitType = mapToUnitType(question.type);

    const unit = await db.unit.create({
      data: {
        content: question.content,
        userId,
        projectId,
        unitType,
        lifecycle: "draft" as Lifecycle,
        originType: "ai_generated" as OriginType,
        sortOrder: i,
        meta: {
          scaffold: true,
          scaffoldQuestion: question.content,
          placeholder: question.placeholder ?? false,
        },
      },
    });

    // Add unit to the main context
    await db.unitContext.create({
      data: {
        unitId: unit.id,
        contextId: mainContext.id,
      },
    });

    createdUnitIds.push(unit.id);
  }

  return createdUnitIds;
}

/**
 * Detect gaps in scaffold question completion.
 * Returns which questions have been answered (confirmed) vs still pending.
 */
export async function detectGaps(
  projectId: string,
  config: TemplateConfig,
  db: PrismaClient
): Promise<{
  answered: string[];
  unanswered: string[];
  completeness: number;
}> {
  const scaffoldQuestions = config.scaffoldQuestions ?? [];

  if (scaffoldQuestions.length === 0) {
    return { answered: [], unanswered: [], completeness: 1 };
  }

  // Get all scaffold units for this project
  const scaffoldUnits = await db.unit.findMany({
    where: {
      projectId,
      meta: {
        path: ["scaffold"],
        equals: true,
      },
    },
    select: {
      id: true,
      content: true,
      lifecycle: true,
      meta: true,
    },
  });

  const answered: string[] = [];
  const unanswered: string[] = [];

  for (const question of scaffoldQuestions) {
    const matchingUnit = scaffoldUnits.find(
      (u) => {
        const meta = u.meta as { scaffoldQuestion?: string } | null;
        return meta?.scaffoldQuestion === question.content;
      }
    );

    // A question is "answered" if its unit exists and is confirmed
    if (matchingUnit && matchingUnit.lifecycle === "confirmed") {
      answered.push(question.content);
    } else {
      unanswered.push(question.content);
    }
  }

  const total = scaffoldQuestions.length;
  const completeness = total > 0 ? answered.length / total : 1;

  return { answered, unanswered, completeness };
}

/**
 * Map a template's unit type string to the Prisma UnitType enum.
 * Template types may use domain-specific names that need mapping to core types.
 */
function mapToUnitType(templateType: string): UnitType {
  const mapping: Record<string, UnitType> = {
    // Core types (direct mapping)
    claim: "claim",
    question: "question",
    evidence: "evidence",
    counterargument: "counterargument",
    observation: "observation",
    idea: "idea",
    definition: "definition",
    assumption: "assumption",
    action: "action",

    // Software design template mappings
    open_question: "question",
    entity: "claim",
    behavior: "action",
    constraint: "claim",
    interface: "definition",
    flow: "observation",
    decision: "claim",

    // Nonfiction writing template mappings
    thesis: "claim",
    scene: "observation",
    source: "evidence",

    // Investment decision template mappings
    signal: "evidence",
    risk: "counterargument",
    metric: "evidence",

    // Academic research template mappings
    hypothesis: "claim",
    methodology: "definition",
    finding: "evidence",
    limitation: "counterargument",
  };

  return mapping[templateType.toLowerCase()] ?? "claim";
}
