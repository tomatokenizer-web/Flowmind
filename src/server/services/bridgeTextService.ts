import type { PrismaClient } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BridgeStyle = "academic" | "conversational" | "minimal" | "narrative";
export type BridgeLength = "sentence" | "paragraph" | "detailed";

export type GeneratedBridge = {
  afterStepIndex: number;
  text: string;
  style: BridgeStyle;
};

// ─── Template Data ───────────────────────────────────────────────────────────

type UnitInfo = { id: string; content: string; unitType: string };

const STYLE_TRANSITIONS: Record<BridgeStyle, string[]> = {
  academic: [
    "Furthermore,",
    "In contrast,",
    "Building upon this foundation,",
    "It follows that",
    "Notably,",
    "Moreover,",
    "Consequently,",
  ],
  conversational: [
    "Next,",
    "Building on this,",
    "So then,",
    "With that in mind,",
    "Here's where it gets interesting:",
    "Now consider this:",
    "Along those lines,",
  ],
  minimal: ["\u2192", "Also:", "Then:", "Note:", "Related:", "Next:", "So:"],
  narrative: [
    "This leads us to consider",
    "Following this thread,",
    "The story continues with",
    "From here, we turn to",
    "Picking up the thread,",
    "And so we arrive at",
    "This naturally brings us to",
  ],
};

const TYPE_TRANSITIONS: Record<string, string> = {
  "claim->evidence": "This claim is supported by the following evidence.",
  "evidence->claim": "From this evidence, a claim emerges.",
  "question->claim": "One possible answer is the following.",
  "claim->counterargument": "However, a counterargument arises.",
  "counterargument->claim": "In response to this objection,",
  "claim->question": "This raises an important question.",
  "observation->claim": "This observation leads to the following claim.",
  "claim->example": "Consider the following example.",
  "definition->claim": "With this definition in place,",
  "evidence->question": "This evidence prompts a further question.",
  "question->evidence": "Some evidence bearing on this question:",
  "idea->claim": "This idea can be stated more precisely.",
  "assumption->claim": "Given this assumption,",
};

// ─── Private Helper ──────────────────────────────────────────────────────────

function pickRandom(arr: string[], seed: number): string {
  return arr[seed % arr.length]!;
}

function generateTemplateBridge(
  from: UnitInfo,
  to: UnitInfo,
  style: BridgeStyle,
  length: BridgeLength,
): string {
  const transitionKey = `${from.unitType}->${to.unitType}`;
  const typeSpecific = TYPE_TRANSITIONS[transitionKey];

  // Seed from content lengths for deterministic-ish but varied output
  const seed = from.content.length + to.content.length;
  const connector = pickRandom(STYLE_TRANSITIONS[style], seed);

  // Build the base sentence
  let base: string;
  if (typeSpecific && style !== "minimal") {
    base = typeSpecific;
  } else if (style === "minimal") {
    base = connector;
  } else {
    base = `${connector} we turn to a ${to.unitType} that follows.`;
  }

  if (length === "sentence") {
    return base;
  }

  // Extend for paragraph/detailed
  const toPreview = to.content.slice(0, 60).trim();
  const elaboration =
    style === "academic"
      ? `This transition moves from a ${from.unitType} to a ${to.unitType}, advancing the argument.`
      : style === "narrative"
        ? `The thread of thought shifts here, weaving together what came before with what follows.`
        : `The next piece — a ${to.unitType} — connects to the previous ${from.unitType}.`;

  if (length === "paragraph") {
    return `${base} ${elaboration}`;
  }

  // detailed: 3-5 sentences
  const contextLine = toPreview
    ? `What follows begins: "${toPreview}..."`
    : `The next step continues the discussion.`;
  const closingLine =
    style === "academic"
      ? "This progression strengthens the overall line of reasoning."
      : style === "narrative"
        ? "And so the narrative unfolds further."
        : "This keeps the flow of ideas moving forward.";

  return `${base} ${elaboration} ${contextLine} ${closingLine}`;
}

// ─── Service Factory ─────────────────────────────────────────────────────────

export function createBridgeTextService(db: PrismaClient) {
  /**
   * Generate bridge text between each pair of units in a navigator path.
   * Returns an array of bridge texts, one for each gap between consecutive steps.
   *
   * NOTE: This is a template-based generator. For AI-powered bridges,
   * use the ai.detectBridgeGaps endpoint which already exists.
   */
  async function generateBridges(
    navigatorId: string,
    style: BridgeStyle = "conversational",
    length: BridgeLength = "sentence",
  ): Promise<GeneratedBridge[]> {
    const nav = await db.navigator.findUnique({
      where: { id: navigatorId },
      select: { path: true },
    });
    if (!nav?.path || !Array.isArray(nav.path) || nav.path.length < 2) return [];

    const unitIds = nav.path as string[];
    const units = await db.unit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, content: true, unitType: true },
    });
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const bridges: GeneratedBridge[] = [];
    for (let i = 0; i < unitIds.length - 1; i++) {
      const from = unitMap.get(unitIds[i]!);
      const to = unitMap.get(unitIds[i + 1]!);
      if (!from || !to) continue;

      const text = generateTemplateBridge(from, to, style, length);
      bridges.push({ afterStepIndex: i, text, style });
    }
    return bridges;
  }

  return { generateBridges };
}

export type BridgeTextService = ReturnType<typeof createBridgeTextService>;
