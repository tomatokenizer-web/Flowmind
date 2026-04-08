import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type ScaleLevel = {
  name: string;
  range: [number, number];
  expectedMin: number;
  expectedMax: number;
};

export type DomainUnitType = {
  type: string;
  description: string;
  /** Core type this maps to in storage (e.g., hypothesis → claim) */
  coreType: string;
  epistemicAct?: string;
};

export type DomainRelation = {
  name: string;
  from: string;
  to: string;
  description: string;
};

export type ScaffoldQuestion = {
  unitType: string;
  content: string;
};

export type AssemblyFormat = {
  name: string;
  slug: string;
  slots: string[];
  compassRules: string[];
};

export type ExpectedTopology = {
  primary: string;
  acceptable: string[];
  forbidden: string[];
  meshOkUntil: string | null;
};

export type BuiltInTemplateConfig = {
  slug: string;
  name: string;
  description: string;
  unitTypes: DomainUnitType[];
  relations: DomainRelation[];
  scaleLevels: ScaleLevel[];
  scaffoldQuestions: ScaffoldQuestion[];
  assemblyFormats: AssemblyFormat[];
  expectedTopology: ExpectedTopology;
  navigatorPriority: string[];
  gapDetectionRules: string[];
  constraintLevel: "strict" | "guided" | "open";
};

// ─── 5 Built-In Templates (per spec Part 7.1) ─────────────────────

const ACADEMIC_RESEARCH: BuiltInTemplateConfig = {
  slug: "academic-research",
  name: "Academic Research",
  description: "Structured research with hypotheses, evidence, and methodology",
  unitTypes: [
    { type: "hypothesis", description: "Falsifiable prediction", coreType: "claim", epistemicAct: "hypothesized" },
    { type: "experimental_result", description: "Quantified outcome of a procedure", coreType: "evidence" },
    { type: "literature_claim", description: "Claim sourced from published work", coreType: "claim" },
    { type: "anomaly", description: "Observation that contradicts expectation", coreType: "observation" },
    { type: "confound", description: "Variable that threatens causal inference", coreType: "assumption" },
    { type: "methodology_note", description: "Description of procedure or protocol", coreType: "definition" },
  ],
  relations: [
    { name: "tests", from: "experimental_design", to: "hypothesis", description: "Experiment tests prediction" },
    { name: "replicates", from: "experimental_result", to: "experimental_result", description: "Reproduction of finding" },
    { name: "fails_to_replicate", from: "experimental_result", to: "experimental_result", description: "Failed reproduction" },
    { name: "contradicts_with_data", from: "evidence", to: "claim", description: "Data-based refutation" },
    { name: "supports_with_p", from: "evidence", to: "claim", description: "Statistical support" },
    { name: "cites", from: "any", to: "literature_claim", description: "Citation link" },
    { name: "controls_for", from: "methodology_note", to: "confound", description: "Confound mitigation" },
  ],
  scaleLevels: [
    { name: "Raw Data", range: [0.0, 1.9], expectedMin: 0, expectedMax: 0 },
    { name: "Evidence", range: [2.0, 3.9], expectedMin: 5, expectedMax: 30 },
    { name: "Hypothesis", range: [4.0, 5.9], expectedMin: 2, expectedMax: 6 },
    { name: "Theory", range: [6.0, 7.9], expectedMin: 1, expectedMax: 3 },
    { name: "Paradigm", range: [8.0, 10.0], expectedMin: 0, expectedMax: 1 },
  ],
  scaffoldQuestions: [
    { unitType: "question", content: "What is the central research question?" },
    { unitType: "question", content: "What existing work is this responding to?" },
    { unitType: "question", content: "What would falsify your main hypothesis?" },
    { unitType: "question", content: "What confounds must be controlled for?" },
  ],
  assemblyFormats: [
    {
      name: "IMRaD Paper",
      slug: "imrad",
      slots: ["Introduction", "Related Work", "Methodology", "Results", "Discussion", "Conclusion"],
      compassRules: [
        "Hypothesis requires falsification_condition",
        "Results require source_ref",
      ],
    },
    {
      name: "Literature Review",
      slug: "literature-review",
      slots: ["Theme A", "Theme B", "Theme C", "Synthesis"],
      compassRules: [
        "Each theme requires ≥2 literature_claim Units",
        "Synthesis requires scale ≥ Frame level",
      ],
    },
  ],
  expectedTopology: {
    primary: "convergent",
    acceptable: ["convergent", "dialectical", "cyclic"],
    forbidden: ["clique"],
    meshOkUntil: "seedling",
  },
  navigatorPriority: [
    "Argument Path: hypothesis → supports → evidence",
    "Discovery Path: anomaly → reframes → hypothesis",
    "Synthesis Path: multiple theories → synthesized claim",
  ],
  gapDetectionRules: [
    "Every Hypothesis must have a linked Methodology",
    "Every Finding must link to supporting Evidence",
    "Every Limitation must be acknowledged",
    "Every Source must be referenced by at least one Unit",
  ],
  constraintLevel: "guided",
};

const LEGAL_ANALYSIS: BuiltInTemplateConfig = {
  slug: "legal-analysis",
  name: "Legal Analysis",
  description: "IRAC-structured legal reasoning with precedents and rules",
  unitTypes: [
    { type: "legal_rule", description: "Statute, regulation, or binding precedent", coreType: "definition" },
    { type: "precedent", description: "Case that establishes applicable doctrine", coreType: "evidence" },
    { type: "legal_issue", description: "Disputed question to be resolved", coreType: "question" },
    { type: "legal_argument", description: "Structured application of rule to facts", coreType: "claim" },
    { type: "counterargument", description: "Opposing legal position", coreType: "claim" },
    { type: "court_finding", description: "Explicit holding in a case", coreType: "evidence" },
    { type: "factual_record", description: "Undisputed fact in the record", coreType: "observation" },
  ],
  relations: [
    { name: "governs", from: "legal_rule", to: "legal_issue", description: "Rule controls issue" },
    { name: "applies", from: "legal_rule", to: "factual_record", description: "Application of rule to facts" },
    { name: "overrules", from: "precedent", to: "precedent", description: "Supersedes prior case law" },
    { name: "distinguishes", from: "precedent", to: "factual_record", description: "Limits scope" },
    { name: "analogizes_to", from: "factual_record", to: "precedent", description: "Factual parallel to case" },
    { name: "rebuts", from: "legal_argument", to: "counterargument", description: "Refutation" },
    { name: "satisfies", from: "factual_record", to: "legal_rule", description: "Element met" },
  ],
  scaleLevels: [
    { name: "Text", range: [0.0, 2.4], expectedMin: 2, expectedMax: 20 },
    { name: "Precedent", range: [2.5, 4.9], expectedMin: 3, expectedMax: 15 },
    { name: "Doctrine", range: [5.0, 7.4], expectedMin: 1, expectedMax: 4 },
    { name: "Principle", range: [7.5, 10.0], expectedMin: 0, expectedMax: 2 },
  ],
  scaffoldQuestions: [
    { unitType: "question", content: "What is the central legal issue?" },
    { unitType: "question", content: "What rule governs this issue?" },
    { unitType: "question", content: "What facts are legally relevant?" },
    { unitType: "question", content: "What counterarguments must be addressed?" },
  ],
  assemblyFormats: [
    {
      name: "IRAC",
      slug: "irac",
      slots: ["Issue", "Rule", "Application", "Conclusion"],
      compassRules: [
        "Application without factual_record = WARN",
        "Rule without governing legal_rule = WARN",
      ],
    },
    {
      name: "Legal Memo",
      slug: "legal-memo",
      slots: ["Question Presented", "Brief Answer", "Facts", "Discussion", "Conclusion"],
      compassRules: [
        "Brief Answer must match Conclusion",
        "Facts require factual_record Units only",
      ],
    },
    {
      name: "Contract Review",
      slug: "contract-review",
      slots: ["Risk Flags", "Favorable Clauses", "Missing Provisions", "Recommendations"],
      compassRules: ["Risk Flags require legal_rule support"],
    },
  ],
  expectedTopology: {
    primary: "chain",
    acceptable: ["chain", "bipartite_argumentation"],
    forbidden: ["mesh", "clique"],
    meshOkUntil: null,
  },
  navigatorPriority: [
    "Argument Path: issue → rule → application → conclusion",
    "Evidence Path: factual_record → satisfies → rule elements",
    "Counterpoint: counterargument → rebuts → main argument",
  ],
  gapDetectionRules: [
    "Every legal_rule must be linked to a legal_issue",
    "Every legal_argument must reference a factual_record",
    "Every counterargument must have a rebuttal addressed",
    "Every precedent must cite its source",
  ],
  constraintLevel: "guided",
};

const STRATEGIC_DECISION: BuiltInTemplateConfig = {
  slug: "strategic-decision",
  name: "Strategic Decision",
  description: "Multi-option evaluation with criteria, risks, and constraints",
  unitTypes: [
    { type: "option", description: "A discrete choice under consideration", coreType: "claim" },
    { type: "criterion", description: "Evaluation dimension", coreType: "definition" },
    { type: "constraint", description: "Non-negotiable boundary", coreType: "assumption" },
    { type: "risk", description: "Negative outcome with probability and impact", coreType: "observation" },
    { type: "decision", description: "Chosen option with rationale", coreType: "claim", epistemicAct: "judged" },
    { type: "outcome", description: "Result of a past decision", coreType: "evidence" },
  ],
  relations: [
    { name: "evaluated_by", from: "option", to: "criterion", description: "Option measured against criterion" },
    { name: "satisfies", from: "option", to: "constraint", description: "Constraint met" },
    { name: "violates", from: "option", to: "constraint", description: "Constraint violated" },
    { name: "dominates", from: "option", to: "option", description: "Pareto superior" },
    { name: "depends_on", from: "decision", to: "assumption", description: "Decision relies on assumption" },
    { name: "exposes", from: "option", to: "risk", description: "Option creates risk" },
    { name: "mitigates", from: "option", to: "risk", description: "Option reduces risk" },
    { name: "supersedes", from: "decision", to: "decision", description: "Replaces earlier decision" },
  ],
  scaleLevels: [
    { name: "Evidence", range: [2.0, 3.9], expectedMin: 4, expectedMax: 20 },
    { name: "Claim", range: [4.0, 5.9], expectedMin: 3, expectedMax: 8 },
    { name: "Frame", range: [6.0, 7.9], expectedMin: 1, expectedMax: 2 },
  ],
  scaffoldQuestions: [
    { unitType: "question", content: "What is the decision to be made?" },
    { unitType: "question", content: "What are the non-negotiable constraints?" },
    { unitType: "question", content: "What criteria matter most?" },
    { unitType: "question", content: "What assumptions are you relying on?" },
    { unitType: "question", content: "What is the worst-case outcome of each option?" },
  ],
  assemblyFormats: [
    {
      name: "Decision Memo",
      slug: "decision-memo",
      slots: ["Situation", "Options", "Criteria", "Analysis", "Recommendation", "Risks"],
      compassRules: [
        "Options slot requires ≥2 option Units",
        "Criteria slot requires ≥1 criterion Unit",
        "Analysis requires evaluated_by relations",
      ],
    },
    {
      name: "Options Comparison",
      slug: "options-comparison",
      slots: ["Option A", "Option B", "Option C", "Verdict"],
      compassRules: [
        "All options evaluated on same criteria",
        "Verdict requires judged epistemic_act",
      ],
    },
  ],
  expectedTopology: {
    primary: "parallel",
    acceptable: ["parallel", "grid", "divergent", "convergent"],
    forbidden: ["clique", "dialectical"],
    meshOkUntil: "seedling",
  },
  navigatorPriority: [
    "Parallel path: all options side-by-side",
    "Argument path: criterion weights → evaluation → verdict",
    "Risk path: risks → mitigations → residual risk",
  ],
  gapDetectionRules: [
    "Every option must be evaluated by at least one criterion",
    "Every risk must have a mitigation strategy",
    "Every assumption must be explicitly stated",
    "Every action must link to the thesis it operationalizes",
  ],
  constraintLevel: "guided",
};

const CREATIVE_WRITING: BuiltInTemplateConfig = {
  slug: "creative-writing",
  name: "Creative Writing",
  description: "Narrative structure with characters, plot events, and thematic arcs",
  unitTypes: [
    { type: "premise", description: "The central 'what if' of the work", coreType: "claim" },
    { type: "character_trait", description: "Defining attribute of a character", coreType: "observation" },
    { type: "plot_event", description: "A discrete story event", coreType: "evidence" },
    { type: "thematic_claim", description: "The work's argument about the world", coreType: "claim" },
    { type: "scene_note", description: "Observation about a specific scene", coreType: "observation" },
    { type: "worldbuilding", description: "Rule or fact of the story's world", coreType: "definition" },
    { type: "narrative_arc", description: "Trajectory of a character or theme", coreType: "idea" },
  ],
  relations: [
    { name: "motivates", from: "character_trait", to: "plot_event", description: "Trait drives action" },
    { name: "reveals", from: "plot_event", to: "character_trait", description: "Event exposes trait" },
    { name: "foreshadows", from: "plot_event", to: "plot_event", description: "Early signal of later event" },
    { name: "contradicts_arc", from: "plot_event", to: "narrative_arc", description: "Tension with trajectory" },
    { name: "resolves", from: "plot_event", to: "narrative_arc", description: "Arc completion" },
    { name: "embodies", from: "plot_event", to: "thematic_claim", description: "Event carries theme" },
    { name: "establishes", from: "worldbuilding", to: "constraint", description: "World rule constrains events" },
  ],
  scaleLevels: [
    { name: "Detail", range: [0.0, 2.9], expectedMin: 0, expectedMax: 100 },
    { name: "Event", range: [3.0, 4.9], expectedMin: 5, expectedMax: 30 },
    { name: "Arc", range: [5.0, 6.9], expectedMin: 2, expectedMax: 5 },
    { name: "Theme", range: [7.0, 10.0], expectedMin: 1, expectedMax: 2 },
  ],
  scaffoldQuestions: [
    { unitType: "question", content: "What is the central premise of this work?" },
    { unitType: "question", content: "What does the protagonist want?" },
    { unitType: "question", content: "What does the protagonist need (differently)?" },
    { unitType: "question", content: "What is this story actually about?" },
  ],
  assemblyFormats: [
    {
      name: "Scene Outline",
      slug: "scene-outline",
      slots: ["Setup", "Conflict", "Turn", "Resolution"],
      compassRules: [
        "Turn requires character_trait → plot_event relation",
        "Resolution requires resolves relation",
      ],
    },
    {
      name: "Character Sheet",
      slug: "character-sheet",
      slots: ["Core Trait", "Wound", "Want", "Need", "Arc"],
      compassRules: [
        "Arc requires ≥2 plot_event Units",
        "Want and Need should have tension",
      ],
    },
    {
      name: "Story Structure",
      slug: "story-structure",
      slots: ["Premise", "Acts", "Theme", "Resolution"],
      compassRules: [
        "Theme requires thematic_claim Unit",
        "Resolution requires resolves → narrative_arc",
      ],
    },
  ],
  expectedTopology: {
    primary: "mesh",
    acceptable: ["mesh", "divergent", "convergent", "cyclic", "parallel", "chain", "dialectical", "bridge"],
    forbidden: [],
    meshOkUntil: "mature",
  },
  navigatorPriority: [
    "Narrative path: events in chronological/causal order",
    "Character path: all Units connected to one character",
    "Theme path: events → thematic_claims (meaning layer)",
  ],
  gapDetectionRules: [
    "Every premise must have at least one thematic_claim",
    "Every character must have at least one character_trait",
    "Every narrative_arc must have a resolution",
    "Every plot_event must link to at least one character",
  ],
  constraintLevel: "open",
};

const SOFTWARE_DESIGN: BuiltInTemplateConfig = {
  slug: "software-design",
  name: "Software Design",
  description: "Requirements, solutions, tradeoffs, and failure mode analysis",
  unitTypes: [
    { type: "requirement", description: "Functional or non-functional need", coreType: "claim" },
    { type: "constraint", description: "Technical boundary (performance, security)", coreType: "assumption" },
    { type: "solution", description: "Design decision addressing a requirement", coreType: "claim", epistemicAct: "judged" },
    { type: "failure_mode", description: "Way a solution can break", coreType: "observation" },
    { type: "tradeoff", description: "Acknowledged cost of a design decision", coreType: "observation" },
    { type: "benchmark", description: "Measured performance characteristic", coreType: "evidence" },
    { type: "api_contract", description: "Interface specification", coreType: "definition" },
    { type: "dependency", description: "External system or library relied upon", coreType: "observation" },
  ],
  relations: [
    { name: "satisfies", from: "solution", to: "requirement", description: "Solution addresses need" },
    { name: "violates", from: "solution", to: "constraint", description: "Solution breaks boundary" },
    { name: "introduces", from: "solution", to: "failure_mode", description: "Solution creates risk" },
    { name: "mitigates", from: "solution", to: "failure_mode", description: "Partial risk reduction" },
    { name: "depends_on", from: "solution", to: "dependency", description: "External dependency" },
    { name: "measured_by", from: "solution", to: "benchmark", description: "Performance measurement" },
    { name: "replaces", from: "solution", to: "solution", description: "Supersedes earlier design" },
    { name: "exposes", from: "api_contract", to: "requirement", description: "Surface area" },
  ],
  scaleLevels: [
    { name: "Detail", range: [0.0, 2.9], expectedMin: 0, expectedMax: 100 },
    { name: "Decision", range: [3.0, 4.9], expectedMin: 5, expectedMax: 30 },
    { name: "Pattern", range: [5.0, 6.9], expectedMin: 2, expectedMax: 8 },
    { name: "Principle", range: [7.0, 10.0], expectedMin: 1, expectedMax: 2 },
  ],
  scaffoldQuestions: [
    { unitType: "question", content: "What problem is this system solving?" },
    { unitType: "question", content: "What are the non-goals?" },
    { unitType: "question", content: "What are the critical failure modes?" },
    { unitType: "question", content: "What tradeoffs are acceptable?" },
  ],
  assemblyFormats: [
    {
      name: "Architecture Decision Record",
      slug: "adr",
      slots: ["Context", "Decision", "Alternatives", "Consequences", "Status"],
      compassRules: [
        "Decision requires solution Unit",
        "Alternatives requires ≥1 rejected option",
        "Consequences requires tradeoff Unit",
      ],
    },
    {
      name: "Technical Spec",
      slug: "technical-spec",
      slots: ["Requirements", "Constraints", "Design", "API Contracts", "Failure Modes", "Benchmarks"],
      compassRules: [
        "Design requires satisfies → all requirements",
        "Failure Modes requires ≥1 failure_mode per solution",
      ],
    },
    {
      name: "System Design Doc",
      slug: "system-design-doc",
      slots: ["Problem", "Goals", "Non-Goals", "Architecture", "Open Questions"],
      compassRules: [
        "Open Questions require question Units",
        "Architecture requires api_contract Units",
      ],
    },
  ],
  expectedTopology: {
    primary: "divergent",
    acceptable: ["divergent", "cyclic", "mesh"],
    forbidden: [],
    meshOkUntil: "developing",
  },
  navigatorPriority: [
    "Argument path: requirement → solution → tradeoffs",
    "Risk path: solution → failure_modes → mitigations",
    "Dependency path: all dependency Units and their consumers",
  ],
  gapDetectionRules: [
    "Every requirement must have a linked solution",
    "Every solution must have at least one tradeoff acknowledged",
    "Every failure_mode must have a mitigation strategy",
    "Every api_contract must link to a requirement",
  ],
  constraintLevel: "guided",
};

// ─── Template Registry ─────────────────────────────────────────────

const BUILT_IN_TEMPLATES: BuiltInTemplateConfig[] = [
  ACADEMIC_RESEARCH,
  LEGAL_ANALYSIS,
  STRATEGIC_DECISION,
  CREATIVE_WRITING,
  SOFTWARE_DESIGN,
];

const TEMPLATE_MAP = new Map(BUILT_IN_TEMPLATES.map((t) => [t.slug, t]));

// ─── Core Unit Types (always available) ────────────────────────────

const CORE_UNIT_TYPES = [
  "claim", "question", "evidence", "observation",
  "idea", "definition", "analogy", "assumption",
] as const;

// ─── Service Factory ───────────────────────────────────────────────

export function createDomainTemplateService(db: PrismaClient) {
  /** Get all 5 built-in template configs (no DB call needed) */
  function getBuiltInTemplates(): BuiltInTemplateConfig[] {
    return BUILT_IN_TEMPLATES;
  }

  /** Get a single built-in template config by slug */
  function getTemplateConfig(slug: string): BuiltInTemplateConfig | undefined {
    return TEMPLATE_MAP.get(slug);
  }

  /** Get core + domain-specific unit types for a template */
  function getAvailableUnitTypes(slug: string): Array<{ type: string; description: string; isDomain: boolean }> {
    const core = CORE_UNIT_TYPES.map((t) => ({
      type: t,
      description: `Core type: ${t}`,
      isDomain: false,
    }));
    const template = TEMPLATE_MAP.get(slug);
    if (!template) return core;

    const domain = template.unitTypes.map((ut) => ({
      type: ut.type,
      description: ut.description,
      isDomain: true,
    }));

    return [...core, ...domain];
  }

  /** Get scale level names for a template slug */
  function getScaleLevels(slug: string): ScaleLevel[] {
    return TEMPLATE_MAP.get(slug)?.scaleLevels ?? [];
  }

  /** Get assembly format options for a template */
  function getAssemblyFormats(slug: string): AssemblyFormat[] {
    return TEMPLATE_MAP.get(slug)?.assemblyFormats ?? [];
  }

  /** Apply scaffold questions to a context — creates Unit rows */
  async function applyScaffold(
    templateSlug: string,
    projectId: string,
    contextId: string,
    userId: string,
  ): Promise<{ created: number }> {
    const template = TEMPLATE_MAP.get(templateSlug);
    if (!template) return { created: 0 };

    const units = template.scaffoldQuestions.map((sq) => ({
      content: sq.content,
      unitType: sq.unitType as "question",
      lifecycle: "draft" as const,
      userId,
      projectId,
      certainty: "uncertain" as const,
      importance: 0.3,
      pinned: false,
      flagged: false,
    }));

    const result = await db.unit.createMany({ data: units });

    // Link units to context
    const createdUnits = await db.unit.findMany({
      where: {
        projectId,
        userId,
        content: { in: template.scaffoldQuestions.map((sq) => sq.content) },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: template.scaffoldQuestions.length,
    });

    if (createdUnits.length > 0) {
      await db.unitContext.createMany({
        data: createdUnits.map((u) => ({
          unitId: u.id,
          contextId,
        })),
        skipDuplicates: true,
      });
    }

    return { created: result.count };
  }

  /** Resolve a domain display type to its core storage type */
  function resolveCoreType(templateSlug: string, displayType: string): string {
    if ((CORE_UNIT_TYPES as readonly string[]).includes(displayType)) {
      return displayType;
    }
    const template = TEMPLATE_MAP.get(templateSlug);
    if (!template) return displayType;
    const domainType = template.unitTypes.find((ut) => ut.type === displayType);
    return domainType?.coreType ?? displayType;
  }

  /** Get gap detection rules for a template */
  function getGapDetectionRules(slug: string): string[] {
    return TEMPLATE_MAP.get(slug)?.gapDetectionRules ?? [];
  }

  /** Get expected topology for a template */
  function getExpectedTopology(slug: string): ExpectedTopology | undefined {
    return TEMPLATE_MAP.get(slug)?.expectedTopology;
  }

  return {
    getBuiltInTemplates,
    getTemplateConfig,
    getAvailableUnitTypes,
    getScaleLevels,
    getAssemblyFormats,
    applyScaffold,
    resolveCoreType,
    getGapDetectionRules,
    getExpectedTopology,
  };
}

export type DomainTemplateService = ReturnType<typeof createDomainTemplateService>;
