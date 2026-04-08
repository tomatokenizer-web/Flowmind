import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 23 System Relation Types ───────────────────────────────────────────────

const systemRelationTypes = [
  // Argument-centered (8)
  {
    name: "supports",
    category: "argument",
    description:
      "This Unit logically backs the other Unit's claim or judgment",
    sortOrder: 1,
  },
  {
    name: "contradicts",
    category: "argument",
    description: "This Unit logically conflicts with the other",
    sortOrder: 2,
  },
  {
    name: "derives_from",
    category: "argument",
    description: "This Unit is logically derived from the other",
    sortOrder: 3,
  },
  {
    name: "expands",
    category: "argument",
    description: "This Unit develops the other more concretely",
    sortOrder: 4,
  },
  {
    name: "references",
    category: "argument",
    description:
      "This Unit references the other as background material",
    sortOrder: 5,
  },
  {
    name: "exemplifies",
    category: "argument",
    description:
      "This Unit is a concrete instance of the other Unit's principle or claim",
    sortOrder: 6,
  },
  {
    name: "defines",
    category: "argument",
    description:
      "This Unit clearly defines a key concept of the other",
    sortOrder: 7,
  },
  {
    name: "questions",
    category: "argument",
    description: "This Unit raises doubt about the other",
    sortOrder: 8,
  },

  // Creative / Research / Execution-centered (7)
  {
    name: "inspires",
    category: "creative_research",
    description: "This Unit is the creative spark for the other",
    sortOrder: 9,
  },
  {
    name: "echoes",
    category: "creative_research",
    description:
      "Shares the same pattern or structure across different contexts",
    sortOrder: 10,
  },
  {
    name: "transforms_into",
    category: "creative_research",
    description: "This idea morphs into that form",
    sortOrder: 11,
  },
  {
    name: "foreshadows",
    category: "creative_research",
    description:
      "In creative writing, this Unit is a foreshadowing of the other",
    sortOrder: 12,
  },
  {
    name: "parallels",
    category: "creative_research",
    description: "Similar structure but independent",
    sortOrder: 13,
  },
  {
    name: "contextualizes",
    category: "creative_research",
    description:
      "This Unit provides background context needed to understand the other",
    sortOrder: 14,
  },
  {
    name: "operationalizes",
    category: "creative_research",
    description:
      "This Unit converts the other's theory or principle into actual action",
    sortOrder: 15,
  },

  // Structure / Presupposition / Containment-centered (5)
  {
    name: "contains",
    category: "structure_containment",
    description:
      "A contains B as a component (hierarchical inclusion)",
    sortOrder: 16,
  },
  {
    name: "presupposes",
    category: "structure_containment",
    description:
      "This Unit requires the other Unit as a prerequisite",
    sortOrder: 17,
  },
  {
    name: "defined_by",
    category: "structure_containment",
    description:
      "The key concept of this Unit is defined by the other",
    sortOrder: 18,
  },
  {
    name: "grounded_in",
    category: "structure_containment",
    description:
      "The background context of this Unit lies in the other",
    sortOrder: 19,
  },
  {
    name: "instantiates",
    category: "structure_containment",
    description:
      "This Unit is a concrete instance of the other's principle or theory",
    sortOrder: 20,
  },

  // 3 additional structural types
  {
    name: "precedes",
    category: "structure_containment",
    description:
      "This Unit temporally or logically comes before the other",
    sortOrder: 21,
  },
  {
    name: "supersedes",
    category: "structure_containment",
    description:
      "This Unit replaces or overrides the other",
    sortOrder: 22,
  },
  {
    name: "complements",
    category: "structure_containment",
    description:
      "This Unit fills a gap left by the other, together forming a whole",
    sortOrder: 23,
  },
] as const;

// ─── 4 Domain Template Defaults ─────────────────────────────────────────────

const domainTemplates = [
  {
    name: "Software Design",
    slug: "software-design",
    type: "system",
    config: {
      unitTypes: [
        "entity",
        "attribute",
        "behavior",
        "constraint",
        "interface",
        "flow",
        "decision",
        "open_question",
      ],
      relationTypes: [
        "implements",
        "validates",
        "has_attribute",
        "requires",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the core problem this software solves?",
        },
        {
          type: "open_question",
          content: "Who are the primary users?",
        },
        {
          type: "open_question",
          content: "Why are existing solutions insufficient?",
        },
        {
          type: "entity",
          content: "Core entities of the system",
          placeholder: true,
        },
        {
          type: "constraint",
          content: "Non-negotiable constraints",
          placeholder: true,
        },
        {
          type: "decision",
          content: "Most important technical decisions",
          placeholder: true,
        },
      ],
      gapDetectionRules: [
        "Every Behavior must have a corresponding Interface",
        "Every Entity must have at least one Attribute",
        "Every OpenQuestion must be answered or explicitly deferred",
        "Every Constraint must have a verification method linked",
      ],
      recommendedNavOrder: [
        "understand problem",
        "define user",
        "decide core features",
        "technical decisions",
        "detailed spec",
      ],
      assemblyTypes: [
        "PRD",
        "Feature Spec",
        "DB Schema",
        "API Spec",
        "Investor Pitch",
      ],
    },
  },
  {
    name: "Nonfiction Writing",
    slug: "nonfiction-writing",
    type: "system",
    config: {
      unitTypes: [
        "thesis",
        "evidence",
        "counterargument",
        "scene",
        "source",
      ],
      relationTypes: [
        "supports",
        "contradicts",
        "exemplifies",
        "contextualizes",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the central thesis of this work?",
        },
        {
          type: "open_question",
          content: "Who is the intended audience?",
        },
        {
          type: "open_question",
          content: "What is the strongest counterargument to your thesis?",
        },
        {
          type: "thesis",
          content: "Core argument",
          placeholder: true,
        },
        {
          type: "evidence",
          content: "Key evidence supporting the thesis",
          placeholder: true,
        },
      ],
      gapDetectionRules: [
        "Every Thesis must have at least one supporting Evidence",
        "Every Thesis should have at least one Counterargument addressed",
        "Every Source must be linked to at least one Evidence",
        "Every Chapter must have a clear Thesis",
      ],
      recommendedNavOrder: [
        "define thesis",
        "gather evidence",
        "address counterarguments",
        "organize chapters",
        "refine prose",
      ],
      assemblyTypes: [
        "Chapter Outline",
        "Argument Structure",
        "Manuscript",
        "Publisher Pitch",
      ],
    },
  },
  {
    name: "Investment Decision",
    slug: "investment-decision",
    type: "system",
    config: {
      unitTypes: [
        "signal",
        "risk",
        "assumption",
        "thesis",
        "action",
        "metric",
      ],
      relationTypes: [
        "supports",
        "contradicts",
        "presupposes",
        "operationalizes",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the core investment thesis?",
        },
        {
          type: "open_question",
          content: "What are the key assumptions underlying this thesis?",
        },
        {
          type: "open_question",
          content: "What would invalidate this thesis?",
        },
        {
          type: "signal",
          content: "Key market signals",
          placeholder: true,
        },
        {
          type: "risk",
          content: "Primary risk factors",
          placeholder: true,
        },
      ],
      gapDetectionRules: [
        "Every Thesis must have at least one supporting Signal",
        "Every Thesis must have at least one Risk identified",
        "Every Assumption must be explicitly stated",
        "Every Action must link to the Thesis it operationalizes",
      ],
      recommendedNavOrder: [
        "identify signals",
        "form thesis",
        "validate assumptions",
        "assess risks",
        "define actions",
      ],
      assemblyTypes: [
        "Investment Memo",
        "Risk Analysis",
        "Execution Plan",
      ],
    },
  },
  {
    name: "Academic Research",
    slug: "academic-research",
    type: "system",
    config: {
      unitTypes: [
        "hypothesis",
        "evidence",
        "methodology",
        "finding",
        "limitation",
        "source",
      ],
      relationTypes: [
        "supports",
        "contradicts",
        "derives_from",
        "references",
        "questions",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the primary research question?",
        },
        {
          type: "open_question",
          content: "What gap in existing literature does this address?",
        },
        {
          type: "open_question",
          content: "What methodology will be used and why?",
        },
        {
          type: "hypothesis",
          content: "Core hypothesis",
          placeholder: true,
        },
        {
          type: "methodology",
          content: "Research methodology",
          placeholder: true,
        },
      ],
      gapDetectionRules: [
        "Every Hypothesis must have a linked Methodology",
        "Every Finding must link to supporting Evidence",
        "Every Limitation must be acknowledged",
        "Every Source must be referenced by at least one Unit",
      ],
      recommendedNavOrder: [
        "define research question",
        "review literature",
        "design methodology",
        "collect evidence",
        "analyze findings",
        "acknowledge limitations",
      ],
      assemblyTypes: [
        "Research Proposal",
        "Literature Review",
        "Paper Structure",
      ],
    },
  },
  {
    name: "Legal Analysis",
    slug: "legal-analysis",
    type: "system",
    config: {
      unitTypes: [
        "legal_rule",
        "precedent",
        "legal_issue",
        "legal_argument",
        "counterargument",
        "court_finding",
        "factual_record",
      ],
      relationTypes: [
        "governs",
        "applies",
        "overrules",
        "distinguishes",
        "analogizes_to",
        "rebuts",
        "satisfies",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the central legal issue?",
        },
        {
          type: "open_question",
          content: "What rule governs this issue?",
        },
        {
          type: "open_question",
          content: "What facts are legally relevant?",
        },
        {
          type: "open_question",
          content: "What counterarguments must be addressed?",
        },
      ],
      gapDetectionRules: [
        "Every legal_rule must be linked to a legal_issue",
        "Every legal_argument must reference a factual_record",
        "Every counterargument must have a rebuttal addressed",
        "Every precedent must cite its source",
      ],
      recommendedNavOrder: [
        "identify issue",
        "find governing rule",
        "gather facts",
        "apply rule to facts",
        "address counterarguments",
        "reach conclusion",
      ],
      assemblyTypes: [
        "IRAC",
        "Legal Memo",
        "Contract Review",
      ],
    },
  },
  {
    name: "Creative Writing",
    slug: "creative-writing",
    type: "system",
    config: {
      unitTypes: [
        "premise",
        "character_trait",
        "plot_event",
        "thematic_claim",
        "scene_note",
        "worldbuilding",
        "narrative_arc",
      ],
      relationTypes: [
        "motivates",
        "reveals",
        "foreshadows",
        "contradicts_arc",
        "resolves",
        "embodies",
        "establishes",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the central premise of this work?",
        },
        {
          type: "open_question",
          content: "What does the protagonist want?",
        },
        {
          type: "open_question",
          content: "What does the protagonist need (differently)?",
        },
        {
          type: "open_question",
          content: "What is this story actually about?",
        },
      ],
      gapDetectionRules: [
        "Every premise must have at least one thematic_claim",
        "Every character must have at least one character_trait",
        "Every narrative_arc must have a resolution",
        "Every plot_event must link to at least one character",
      ],
      recommendedNavOrder: [
        "define premise",
        "create characters",
        "outline plot",
        "develop themes",
        "refine narrative arcs",
      ],
      assemblyTypes: [
        "Scene Outline",
        "Character Sheet",
        "Story Structure",
      ],
    },
  },
  {
    name: "Strategic Decision",
    slug: "strategic-decision",
    type: "system",
    config: {
      unitTypes: [
        "option",
        "criterion",
        "constraint",
        "risk",
        "decision",
        "outcome",
      ],
      relationTypes: [
        "evaluated_by",
        "satisfies",
        "violates",
        "dominates",
        "depends_on",
        "exposes",
        "mitigates",
        "supersedes",
      ],
      scaffoldQuestions: [
        {
          type: "open_question",
          content: "What is the decision to be made?",
        },
        {
          type: "open_question",
          content: "What are the non-negotiable constraints?",
        },
        {
          type: "open_question",
          content: "What criteria matter most?",
        },
        {
          type: "open_question",
          content: "What assumptions are you relying on?",
        },
        {
          type: "open_question",
          content: "What is the worst-case outcome of each option?",
        },
      ],
      gapDetectionRules: [
        "Every option must be evaluated by at least one criterion",
        "Every risk must have a mitigation strategy",
        "Every assumption must be explicitly stated",
        "Every action must link to the thesis it operationalizes",
      ],
      recommendedNavOrder: [
        "define decision",
        "identify constraints",
        "set criteria",
        "generate options",
        "evaluate options",
        "decide",
      ],
      assemblyTypes: [
        "Decision Memo",
        "Options Comparison",
      ],
    },
  },
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // Seed system relation types
  console.log("  → Seeding 23 system relation types...");
  for (const relationType of systemRelationTypes) {
    await prisma.systemRelationType.upsert({
      where: { name: relationType.name },
      update: {
        category: relationType.category,
        description: relationType.description,
        sortOrder: relationType.sortOrder,
      },
      create: relationType,
    });
  }
  console.log("  ✓ System relation types seeded\n");

  // Seed domain templates
  console.log("  → Seeding 7 domain templates...");
  for (const template of domainTemplates) {
    await prisma.domainTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        type: template.type,
        config: template.config,
      },
      create: template,
    });
  }
  console.log("  ✓ Domain templates seeded\n");

  // Summary
  const relationCount = await prisma.systemRelationType.count();
  const templateCount = await prisma.domainTemplate.count();
  console.log(`✅ Seed complete: ${relationCount} relation types, ${templateCount} domain templates`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
