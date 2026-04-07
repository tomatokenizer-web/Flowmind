import { z } from "zod";

// ─── Shared Enums ────────────────────────────────────────────────────────────

const unitTypeEnum = z.enum([
  "claim",
  "question",
  "evidence",
  "counterargument",
  "observation",
  "idea",
  "definition",
  "assumption",
  "action",
]);

const relationTypeEnum = z.enum([
  "supports",
  "contradicts",
  "derives_from",
  "expands",
  "references",
  "exemplifies",
  "defines",
  "questions",
]);

// ─── AI Response Schemas ─────────────────────────────────────────────────────

export const TypeSuggestionSchema = z.object({
  unitType: unitTypeEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
});

export const RelationSuggestionsSchema = z.object({
  relations: z.array(
    z.object({
      targetUnitId: z.string(),
      relationType: relationTypeEnum,
      strength: z.number().min(0).max(1),
      reasoning: z.string().max(300),
    })
  ).max(3),
});

export const PurposeClassificationSchema = z.object({
  purpose: z.enum(["arguing", "brainstorming", "researching", "defining", "other"]),
  confidence: z.number().min(0).max(1),
});

export const DecompositionBoundariesSchema = z.object({
  boundaries: z.array(
    z.object({
      startChar: z.number().min(0),
      endChar: z.number().min(0),
      content: z.string(),
      proposedType: unitTypeEnum,
      confidence: z.number().min(0).max(1),
    })
  ).max(3),
});

export const DecompositionRelationProposalsSchema = z.object({
  relations: z.array(
    z.object({
      sourceIdx: z.number().min(0).max(2),
      targetUnitId: z.string(),
      relationType: relationTypeEnum,
      strength: z.number().min(0).max(1),
      rationale: z.string().max(300),
    })
  ),
});

export const SplitReattributionSchema = z.object({
  proposals: z.array(
    z.object({
      relationId: z.string(),
      assignTo: z.enum(["A", "B"]),
      rationale: z.string().max(300),
    })
  ),
});

export const AlternativeFramingsSchema = z.object({
  framings: z.array(
    z.object({
      reframedContent: z.string().max(500),
      newType: unitTypeEnum,
      rationale: z.string().max(300),
      confidence: z.number().min(0).max(1),
    })
  ).max(3),
});

export const CounterArgumentsSchema = z.object({
  counterArguments: z.array(
    z.object({
      content: z.string().max(500),
      strength: z.number().min(0).max(1),
      targetsClaim: z.string().max(200),
      rationale: z.string().max(300),
    })
  ).max(3),
});

export const AssumptionsSchema = z.object({
  assumptions: z.array(
    z.object({
      content: z.string().max(500),
      isExplicit: z.boolean(),
      importance: z.enum(["critical", "moderate", "minor"]),
      rationale: z.string().max(300),
    })
  ).max(5),
});

export const ContradictionsSchema = z.object({
  contradictions: z.array(
    z.object({
      unitAId: z.string(),
      unitBId: z.string(),
      description: z.string().max(300),
      severity: z.enum(["direct", "tension", "potential"]),
      suggestedResolution: z.string().max(300),
    })
  ).max(5),
});

export const MergeSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      unitIds: z.array(z.string()).min(2),
      mergedContent: z.string().max(500),
      mergedType: unitTypeEnum,
      rationale: z.string().max(300),
      confidence: z.number().min(0).max(1),
    })
  ).max(3),
});

export const CompletenessAnalysisSchema = z.object({
  score: z.number().min(0).max(1),
  missingElements: z.array(
    z.object({
      type: z.enum(["evidence", "counterargument", "definition", "example", "assumption"]),
      description: z.string().max(300),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  suggestions: z.array(z.string().max(300)),
});

export const ContextSummarySchema = z.object({
  mainThesis: z.string().max(500),
  keyPoints: z.array(z.string().max(300)).max(5),
  openQuestions: z.array(z.string().max(300)).max(3),
  conflictingViews: z.array(z.string().max(300)).max(3),
});

export const GeneratedQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      content: z.string().max(300),
      type: z.enum(["clarifying", "challenging", "exploratory", "connecting"]),
      targetUnitId: z.string().optional(),
      rationale: z.string().max(300),
    })
  ).max(5),
});

export const NextStepsSchema = z.object({
  steps: z.array(
    z.object({
      action: z.string().max(300),
      type: z.enum(["research", "define", "challenge", "connect", "expand", "resolve"]),
      priority: z.enum(["high", "medium", "low"]),
      relatedUnitIds: z.array(z.string()),
      rationale: z.string().max(300),
    })
  ).max(5),
});

export const ExtractedTermsSchema = z.object({
  terms: z.array(
    z.object({
      term: z.string().max(100),
      definition: z.string().max(300).optional(),
      occurrences: z.number().min(1),
      importance: z.enum(["key", "supporting", "peripheral"]),
      suggestDefine: z.boolean(),
    })
  ).max(10),
});

export const StanceClassificationSchema = z.object({
  stance: z.enum(["support", "oppose", "neutral", "exploring"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(300),
  keyIndicators: z.array(z.string().max(100)).max(3),
});

export const ReflectionPromptsSchema = z.object({
  prompts: z.array(
    z.object({
      question: z.string().max(300),
      category: z.enum(["assumption", "opposite", "connection", "consequence", "evidence", "reframe"]),
      targetUnitId: z.string().optional(),
      rationale: z.string().max(200),
    })
  ).max(5),
});

// ─── Router-level AI Response Schemas ────────────────────────────────────────

export const ExplorationDirectionsSchema = z.object({
  directions: z.array(
    z.object({
      prompt: z.string(),
      expectedType: z.enum(["question", "idea", "claim", "evidence", "counterargument"]),
    })
  ),
});

export const RefinementSchema = z.object({
  refined: z.string(),
  changes: z.array(z.string()),
});

export const DerivationSuggestionsSchema = z.object({
  derivations: z.array(
    z.object({
      content: z.string().max(2000),
      unitType: z.enum(["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"]),
      relationToOrigin: z.enum(["supports", "contradicts", "derives_from", "expands", "references", "exemplifies", "defines", "questions"]),
      rationale: z.string().max(500),
    })
  ).max(5),
});

// ─── Navigation Path AI Schemas ─────────────────────────────────────────────

export const PathProposalSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(500),
  reasoning: z.string().max(300),
  orderedUnitIds: z.array(z.string()).optional(),
});

export const BridgeSuggestionsSchema = z.object({
  bridges: z.array(
    z.object({
      afterStepIndex: z.number().min(0),
      content: z.string().max(2000),
      unitType: unitTypeEnum,
      rationale: z.string().max(500),
      relationToPrev: relationTypeEnum,
      relationToNext: relationTypeEnum,
    })
  ).max(5),
  completeness: z.array(
    z.object({
      suggestion: z.string().max(500),
      unitType: unitTypeEnum,
      priority: z.enum(["high", "medium", "low"]),
    })
  ).max(5).optional(),
});

export const DerivationPlacementSchema = z.object({
  insertIntoCurrentPath: z.object({
    recommended: z.boolean(),
    insertAfterIndex: z.number().nullable(),
    reason: z.string().max(200),
  }),
  otherNavigators: z.array(
    z.object({
      navigatorId: z.string(),
      recommended: z.boolean(),
      insertAfterIndex: z.number().nullable(),
      reason: z.string().max(200),
    })
  ).max(5),
  suggestedContextId: z.string().nullable(),
  suggestedContextName: z.string().max(100).nullable(),
});

// ─── Story 5.11: Scope Jump Detection ────────────────────────────────────────

export const ScopeJumpSchema = z.object({
  isJump: z.boolean(),
  currentScope: z.string().max(200),
  suggestedScope: z.string().max(200),
  confidence: z.number().min(0).max(1),
});

// ─── Story 6.7: Natural Language Query ───────────────────────────────────────

export const NLQIntentSchema = z.object({
  keywords: z.array(z.string().max(100)).max(10),
  unitTypes: z
    .array(
      z.enum([
        "claim",
        "question",
        "evidence",
        "counterargument",
        "observation",
        "idea",
        "definition",
        "assumption",
        "action",
      ])
    )
    .optional(),
  summary: z.string().max(300),
});
