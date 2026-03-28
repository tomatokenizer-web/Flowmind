import { PrismaClient, NsDirection, TypeTier } from "@prisma/client";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: SystemRelationType — 60+ types across 8 layers
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemRelationDef {
  name: string;
  layer: number;
  category: string;
  description: string;
  defaultNs: NsDirection | null;
  uiTier: number;
  sortOrder: number;
}

const systemRelationTypes: SystemRelationDef[] = [
  // ── Layer 1: Argumentative (Epistemic) ──────────────────────────────────────
  { name: "supports",     layer: 1, category: "argumentative",     description: "Source provides logical backing for target's claim or judgment", defaultNs: "satellite_to_nucleus", uiTier: 1, sortOrder: 101 },
  { name: "contradicts",  layer: 1, category: "argumentative",     description: "Source logically conflicts with target", defaultNs: "multinuclear", uiTier: 1, sortOrder: 102 },
  { name: "qualifies",    layer: 1, category: "argumentative",     description: "Source limits the scope or applicability of target", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 103 },
  { name: "rebuts",       layer: 1, category: "argumentative",     description: "Source directly addresses and refutes target's argument", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 104 },
  { name: "concedes",     layer: 1, category: "argumentative",     description: "Source acknowledges validity of target while maintaining its own position", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 105 },

  // ── Layer 2: Epistemic Derivation ───────────────────────────────────────────
  { name: "derives_from",     layer: 2, category: "epistemic_derivation", description: "Source is logically derived from target", defaultNs: "satellite_to_nucleus", uiTier: 1, sortOrder: 201 },
  { name: "generalizes",      layer: 2, category: "epistemic_derivation", description: "Source abstracts target into a broader principle", defaultNs: "nucleus_to_satellite", uiTier: 2, sortOrder: 202 },
  { name: "specializes",      layer: 2, category: "epistemic_derivation", description: "Source narrows target to a more specific case", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 203 },
  { name: "operationalizes",  layer: 2, category: "epistemic_derivation", description: "Source converts target's theory or principle into actionable steps", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 204 },
  { name: "exemplifies",      layer: 2, category: "epistemic_derivation", description: "Source is a concrete instance illustrating target's principle", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 205 },

  // ── Layer 3: Rhetorical (RST-based) ────────────────────────────────────────
  { name: "elaboration",   layer: 3, category: "rhetorical", description: "Source provides additional detail about target", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 301 },
  { name: "cause",         layer: 3, category: "rhetorical", description: "Source is the cause of target", defaultNs: "nucleus_to_satellite", uiTier: 2, sortOrder: 302 },
  { name: "condition",     layer: 3, category: "rhetorical", description: "Source states a condition under which target holds", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 303 },
  { name: "contrast",      layer: 3, category: "rhetorical", description: "Source and target are juxtaposed to highlight differences", defaultNs: "multinuclear", uiTier: 2, sortOrder: 304 },
  { name: "sequence",      layer: 3, category: "rhetorical", description: "Source and target form a sequential progression", defaultNs: "multinuclear", uiTier: 2, sortOrder: 305 },
  { name: "purpose",       layer: 3, category: "rhetorical", description: "Source exists to achieve or enable target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 306 },
  { name: "background",    layer: 3, category: "rhetorical", description: "Source provides background context for understanding target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 307 },
  { name: "evaluation",    layer: 3, category: "rhetorical", description: "Source evaluates or assesses target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 308 },
  { name: "summary",       layer: 3, category: "rhetorical", description: "Source summarizes or distills target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 309 },
  { name: "restatement",   layer: 3, category: "rhetorical", description: "Source restates target in different terms", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 310 },
  { name: "means",         layer: 3, category: "rhetorical", description: "Source describes the method or means by which target is achieved", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 311 },
  { name: "concession",    layer: 3, category: "rhetorical", description: "Source concedes a point while target maintains the main argument", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 312 },
  { name: "solutionhood",  layer: 3, category: "rhetorical", description: "Source presents a solution to the problem stated in target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 313 },
  { name: "enablement",    layer: 3, category: "rhetorical", description: "Source enables the reader to understand or perform target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 314 },

  // ── Layer 4: Semantic / Conceptual ──────────────────────────────────────────
  { name: "is_type_of",     layer: 4, category: "semantic", description: "Source is a subtype or kind of target", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 401 },
  { name: "is_part_of",     layer: 4, category: "semantic", description: "Source is a component or part of target", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 402 },
  { name: "is_instance_of", layer: 4, category: "semantic", description: "Source is a specific instance of target's general concept", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 403 },
  { name: "contains",       layer: 4, category: "semantic", description: "Source contains target as a component (hierarchical inclusion)", defaultNs: "nucleus_to_satellite", uiTier: 1, sortOrder: 404 },
  { name: "preconditions",  layer: 4, category: "semantic", description: "Source is a precondition that must hold for target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 405 },
  { name: "results_in",     layer: 4, category: "semantic", description: "Source leads to or produces target as an outcome", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 406 },

  // ── Layer 5: Temporal / Narrative ───────────────────────────────────────────
  { name: "precedes",     layer: 5, category: "temporal", description: "Source temporally or logically comes before target", defaultNs: "nucleus_to_satellite", uiTier: 2, sortOrder: 501 },
  { name: "follows",      layer: 5, category: "temporal", description: "Source temporally or logically comes after target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 502 },
  { name: "co_occurs",    layer: 5, category: "temporal", description: "Source and target happen simultaneously", defaultNs: "multinuclear", uiTier: 3, sortOrder: 503 },
  { name: "interrupts",   layer: 5, category: "temporal", description: "Source breaks the flow of target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 504 },
  { name: "enables_next",  layer: 5, category: "temporal", description: "Source makes the next step (target) possible", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 505 },
  { name: "continues",    layer: 5, category: "temporal", description: "Source continues or resumes the narrative of target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 506 },
  { name: "echoes",       layer: 5, category: "temporal", description: "Source repeats or mirrors a pattern from target across time or context", defaultNs: "multinuclear", uiTier: 3, sortOrder: 507 },

  // ── Layer 6: Associative / Heuristic ────────────────────────────────────────
  { name: "related_to",  layer: 6, category: "associative", description: "Source and target are thematically related", defaultNs: "multinuclear", uiTier: 2, sortOrder: 601 },
  { name: "inspires",    layer: 6, category: "associative", description: "Source is the creative spark or inspiration for target", defaultNs: "nucleus_to_satellite", uiTier: 1, sortOrder: 602 },
  { name: "reminds",     layer: 6, category: "associative", description: "Source evokes or reminds of target", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 603 },
  { name: "parallels",   layer: 6, category: "associative", description: "Source and target share similar structure but are independent", defaultNs: "multinuclear", uiTier: 3, sortOrder: 604 },
  { name: "analogizes",  layer: 6, category: "associative", description: "Source draws an analogy to target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 605 },
  { name: "triggers",    layer: 6, category: "associative", description: "Source triggers or activates the thought in target", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 606 },

  // ── Layer 7: Meta / Structural ──────────────────────────────────────────────
  { name: "references",    layer: 7, category: "meta", description: "Source references target as background material or citation", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 701 },
  { name: "comments_on",   layer: 7, category: "meta", description: "Source is a meta-commentary on target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 702 },
  { name: "questions",     layer: 7, category: "meta", description: "Source raises a question or doubt about target", defaultNs: "satellite_to_nucleus", uiTier: 1, sortOrder: 703 },
  { name: "answers",       layer: 7, category: "meta", description: "Source provides an answer to target's question", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 704 },
  { name: "revises",       layer: 7, category: "meta", description: "Source is a revised version of target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 705 },
  { name: "supersedes",    layer: 7, category: "meta", description: "Source replaces or overrides target entirely", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 706 },
  { name: "branches_from", layer: 7, category: "meta", description: "Source diverges from target into a new line of thought", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 707 },

  // ── Layer 8: Action / Execution ─────────────────────────────────────────────
  { name: "requires",      layer: 8, category: "action", description: "Source requires target to be fulfilled first", defaultNs: "nucleus_to_satellite", uiTier: 2, sortOrder: 801 },
  { name: "blocks",        layer: 8, category: "action", description: "Source prevents or blocks progress on target", defaultNs: "nucleus_to_satellite", uiTier: 2, sortOrder: 802 },
  { name: "depends_on",    layer: 8, category: "action", description: "Source depends on target for its completion", defaultNs: "satellite_to_nucleus", uiTier: 2, sortOrder: 803 },
  { name: "implements",    layer: 8, category: "action", description: "Source implements or realizes the plan described in target", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 804 },
  { name: "validates",     layer: 8, category: "action", description: "Source validates or verifies target's claim or result", defaultNs: "satellite_to_nucleus", uiTier: 3, sortOrder: 805 },
  { name: "delegates",     layer: 8, category: "action", description: "Source delegates responsibility to target", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 806 },
  { name: "matures_into",  layer: 8, category: "action", description: "Source evolves or matures into target over time", defaultNs: "nucleus_to_satellite", uiTier: 3, sortOrder: 807 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: DomainTemplate — 8 domains with full config
// ═══════════════════════════════════════════════════════════════════════════════

interface DomainTemplateDef {
  name: string;
  slug: string;
  description: string;
  config: {
    seedTypes: Array<{
      name: string;
      icon: string;
      description: string;
      naturalNext: string[];
      maturationTarget: string | null;
    }>;
    formalTypes: Array<{
      name: string;
      description: string;
      requiredAttributes: string[];
    }>;
    relationExtensions: Array<{
      name: string;
      description: string;
      layer: number;
    }>;
    frames: string[];
    compassRules: string[];
  };
}

const domainTemplates: DomainTemplateDef[] = [
  // ── 1. Natural Science & Engineering ────────────────────────────────────────
  {
    name: "Natural Science & Engineering",
    slug: "natural_science",
    description: "Domain template for scientific research, experiments, and engineering analysis",
    config: {
      seedTypes: [
        { name: "anomaly", icon: "flask-round", description: "Unexpected observation that challenges existing understanding", naturalNext: ["hunch", "question"], maturationTarget: "Finding" },
        { name: "hunch", icon: "lightbulb", description: "Intuitive guess about a mechanism or explanation", naturalNext: ["claim", "evidence"], maturationTarget: "Hypothesis" },
        { name: "method-note", icon: "microscope", description: "Quick note about experimental procedure or methodology", naturalNext: ["evidence", "data-point"], maturationTarget: "Method" },
        { name: "lit-flag", icon: "bookmark", description: "Flag for relevant literature to review", naturalNext: ["evidence", "question"], maturationTarget: "Background" },
        { name: "pattern", icon: "grid-3x3", description: "Recurring regularity noticed in data or observations", naturalNext: ["hunch", "claim"], maturationTarget: "Finding" },
        { name: "data-point", icon: "bar-chart-2", description: "Single data observation or measurement", naturalNext: ["pattern", "evidence"], maturationTarget: "Finding" },
        { name: "control-note", icon: "shield-check", description: "Note about experimental controls or confounding variables", naturalNext: ["method-note", "evidence"], maturationTarget: "Limitation" },
      ],
      formalTypes: [
        { name: "Hypothesis", description: "Testable prediction about a natural phenomenon", requiredAttributes: ["testability", "falsifiability_criteria"] },
        { name: "Method", description: "Detailed experimental or analytical procedure", requiredAttributes: ["reproducibility_steps", "variables"] },
        { name: "Finding", description: "Verified result from observation or experiment", requiredAttributes: ["data_source", "confidence_level"] },
        { name: "Interpretation", description: "Explanatory account of findings", requiredAttributes: ["supported_by_findings", "alternative_explanations"] },
        { name: "Background", description: "Established knowledge providing context", requiredAttributes: ["source_citations"] },
        { name: "Limitation", description: "Acknowledged boundary or weakness of the study", requiredAttributes: ["scope_of_impact", "mitigation"] },
      ],
      relationExtensions: [
        { name: "replicates", description: "This finding replicates another finding", layer: 2 },
        { name: "falsifies", description: "This evidence falsifies the hypothesis", layer: 1 },
        { name: "controls_for", description: "This method controls for a confounding variable", layer: 4 },
      ],
      frames: ["IMRAD", "Problem-Method-Result", "Theory-Experiment-Analysis"],
      compassRules: [
        "Every Hypothesis must have a linked Method",
        "Every Finding must reference supporting evidence",
        "Every Interpretation must address at least one Limitation",
        "Every Method must specify variables and controls",
      ],
    },
  },

  // ── 2. Law ──────────────────────────────────────────────────────────────────
  {
    name: "Law",
    slug: "law",
    description: "Domain template for legal analysis, case law, and argumentation",
    config: {
      seedTypes: [
        { name: "case-flag", icon: "gavel", description: "Flag for a relevant case to analyze", naturalNext: ["arg-sketch", "fact-note"], maturationTarget: "Holding" },
        { name: "fact-note", icon: "file-text", description: "Quick note about a relevant fact", naturalNext: ["evidence", "arg-sketch"], maturationTarget: "Fact_Pattern" },
        { name: "arg-sketch", icon: "pen-line", description: "Rough outline of a legal argument", naturalNext: ["claim", "evidence"], maturationTarget: "Application" },
        { name: "statute-ref", icon: "scale", description: "Reference to a statute or regulation", naturalNext: ["arg-sketch", "fact-note"], maturationTarget: "Rule" },
        { name: "tension", icon: "zap", description: "Identified tension between legal principles or cases", naturalNext: ["question", "arg-sketch"], maturationTarget: "Legal_Issue" },
        { name: "holding-note", icon: "bookmark-check", description: "Quick note about a court's holding", naturalNext: ["case-flag", "arg-sketch"], maturationTarget: "Holding" },
        { name: "client-fact", icon: "user", description: "Fact specific to the client's situation", naturalNext: ["fact-note", "arg-sketch"], maturationTarget: "Fact_Pattern" },
      ],
      formalTypes: [
        { name: "Legal_Issue", description: "Specific legal question to be resolved", requiredAttributes: ["jurisdiction", "area_of_law"] },
        { name: "Rule", description: "Legal rule, statute, or established principle", requiredAttributes: ["source", "jurisdiction"] },
        { name: "Application", description: "Application of rule to specific facts", requiredAttributes: ["rule_applied", "facts_used"] },
        { name: "Conclusion", description: "Legal conclusion drawn from analysis", requiredAttributes: ["supporting_application", "confidence"] },
        { name: "Fact_Pattern", description: "Organized set of relevant facts", requiredAttributes: ["source_type", "disputed_status"] },
        { name: "Holding", description: "Court's decision on a legal issue", requiredAttributes: ["court", "case_citation", "year"] },
        { name: "Analogical_Argument", description: "Argument by analogy to prior case", requiredAttributes: ["source_case", "shared_features"] },
        { name: "Distinguishing_Argument", description: "Argument distinguishing the current case from precedent", requiredAttributes: ["distinguished_case", "distinguishing_features"] },
      ],
      relationExtensions: [
        { name: "cites", description: "This unit cites a legal authority", layer: 7 },
        { name: "distinguishes", description: "This argument distinguishes from precedent", layer: 1 },
        { name: "overrules", description: "This holding overrules a prior holding", layer: 7 },
      ],
      frames: ["IRAC", "CREAC", "TREAT", "Problem-Rule-Application-Conclusion"],
      compassRules: [
        "Every Legal_Issue must have at least one applicable Rule",
        "Every Application must link a Rule to a Fact_Pattern",
        "Every Conclusion must be supported by an Application",
        "Every Analogical_Argument must identify shared features with source case",
      ],
    },
  },

  // ── 3. Philosophy / Humanistic Argumentation ────────────────────────────────
  {
    name: "Philosophy / Humanistic Argumentation",
    slug: "philosophy",
    description: "Domain template for philosophical inquiry, conceptual analysis, and humanistic argumentation",
    config: {
      seedTypes: [
        { name: "intuition", icon: "brain", description: "Pre-theoretical feeling about what is true or important", naturalNext: ["claim", "question"], maturationTarget: "Thesis" },
        { name: "objection-sketch", icon: "message-circle-warning", description: "Rough formulation of a potential objection", naturalNext: ["counterargument", "question"], maturationTarget: "Objection" },
        { name: "distinction", icon: "split", description: "Important conceptual distinction to draw", naturalNext: ["definition", "claim"], maturationTarget: "Distinction" },
        { name: "thought-experiment", icon: "flask-conical", description: "Hypothetical scenario testing a principle", naturalNext: ["claim", "counterargument"], maturationTarget: "Counterexample" },
        { name: "premise-sketch", icon: "list-ordered", description: "Rough formulation of an argument premise", naturalNext: ["claim", "warrant"], maturationTarget: "Supporting_Argument" },
        { name: "analogy-note", icon: "link-2", description: "Noted analogy between domains or concepts", naturalNext: ["claim", "evidence"], maturationTarget: "Supporting_Argument" },
        { name: "aporia", icon: "help-circle", description: "Genuine puzzlement or impasse in reasoning", naturalNext: ["question", "distinction"], maturationTarget: "Thesis" },
      ],
      formalTypes: [
        { name: "Thesis", description: "Central philosophical claim or position", requiredAttributes: ["scope", "tradition"] },
        { name: "Objection", description: "Formalized objection to a thesis", requiredAttributes: ["target_thesis", "force"] },
        { name: "Reply", description: "Response to an objection", requiredAttributes: ["target_objection", "strategy"] },
        { name: "Distinction", description: "Formal conceptual distinction", requiredAttributes: ["terms_distinguished", "criterion"] },
        { name: "Presupposition", description: "Unstated assumption underlying an argument", requiredAttributes: ["scope_of_impact"] },
        { name: "Counterexample", description: "Case that challenges a general claim", requiredAttributes: ["target_claim", "specificity"] },
        { name: "Supporting_Argument", description: "Argument providing support for a thesis", requiredAttributes: ["logical_form", "premises"] },
      ],
      relationExtensions: [
        { name: "presupposes", description: "This argument presupposes the truth of another", layer: 4 },
        { name: "dialectically_responds", description: "This unit responds in a dialectical exchange", layer: 1 },
      ],
      frames: ["Thesis-Antithesis-Synthesis", "Socratic-Dialogue", "Analytic-Argument", "Phenomenological-Description"],
      compassRules: [
        "Every Thesis must have at least one Supporting_Argument",
        "Every Thesis should address at least one Objection",
        "Every Distinction must clarify its criterion of division",
        "Every Presupposition must be made explicit",
      ],
    },
  },

  // ── 4. Historical Writing ───────────────────────────────────────────────────
  {
    name: "Historical Writing",
    slug: "history",
    description: "Domain template for historical analysis, primary source interpretation, and historiography",
    config: {
      seedTypes: [
        { name: "source-flag", icon: "archive", description: "Flag for a primary or secondary source to examine", naturalNext: ["evidence", "question"], maturationTarget: "Primary_Source" },
        { name: "period-note", icon: "calendar", description: "Note about a historical period or era", naturalNext: ["claim", "evidence"], maturationTarget: "Contextual_Frame" },
        { name: "cause-link", icon: "arrow-right", description: "Potential causal connection between events", naturalNext: ["claim", "evidence"], maturationTarget: "Causal_Claim" },
        { name: "perspective-note", icon: "eye", description: "Note about a particular historical perspective or viewpoint", naturalNext: ["claim", "counterargument"], maturationTarget: "Historical_Perspective" },
        { name: "continuity", icon: "trending-up", description: "Observation of continuity across time", naturalNext: ["claim", "evidence"], maturationTarget: "Continuity_Thesis" },
        { name: "rupture", icon: "trending-down", description: "Observation of a break or discontinuity", naturalNext: ["claim", "evidence"], maturationTarget: "Rupture_Thesis" },
        { name: "evidence-trace", icon: "search", description: "Trace of evidence to follow up on", naturalNext: ["source-flag", "evidence"], maturationTarget: "Source_Analysis" },
        { name: "counter-narrative", icon: "message-square-diff", description: "Alternative narrative challenging the dominant account", naturalNext: ["counterargument", "perspective-note"], maturationTarget: "Alternative_Interpretation" },
      ],
      formalTypes: [
        { name: "Primary_Source", description: "First-hand historical document or artifact", requiredAttributes: ["date", "provenance", "reliability_assessment"] },
        { name: "Contextual_Frame", description: "Broader historical context for understanding events", requiredAttributes: ["period", "geographic_scope"] },
        { name: "Causal_Claim", description: "Claim about historical causation", requiredAttributes: ["mechanism", "evidence_basis"] },
        { name: "Historical_Perspective", description: "A particular historiographic viewpoint", requiredAttributes: ["school_of_thought", "key_proponents"] },
        { name: "Continuity_Thesis", description: "Claim about persistence across historical periods", requiredAttributes: ["time_span", "evidence_of_persistence"] },
        { name: "Rupture_Thesis", description: "Claim about a significant break or transformation", requiredAttributes: ["turning_point", "before_after_contrast"] },
        { name: "Source_Analysis", description: "Critical analysis of a historical source", requiredAttributes: ["source_type", "bias_assessment", "corroboration"] },
        { name: "Alternative_Interpretation", description: "Competing interpretation of historical events", requiredAttributes: ["standard_view", "revision_basis"] },
      ],
      relationExtensions: [
        { name: "corroborates", description: "This source corroborates another source", layer: 2 },
        { name: "contextualizes_period", description: "This frame contextualizes events in a period", layer: 3 },
      ],
      frames: ["Chronological-Narrative", "Thematic-Analysis", "Comparative-History", "Microhistory"],
      compassRules: [
        "Every Causal_Claim must reference at least one Primary_Source",
        "Every Historical_Perspective must be situated in a Contextual_Frame",
        "Every Source_Analysis must assess bias and reliability",
        "Every Alternative_Interpretation must engage with the standard view",
      ],
    },
  },

  // ── 5. Social Science ───────────────────────────────────────────────────────
  {
    name: "Social Science",
    slug: "social_science",
    description: "Domain template for social science research, qualitative and quantitative methods",
    config: {
      seedTypes: [
        { name: "variable-note", icon: "variable", description: "Note about a variable of interest", naturalNext: ["claim", "evidence"], maturationTarget: "Variable" },
        { name: "finding-flag", icon: "flag", description: "Flag for a notable finding in the data", naturalNext: ["evidence", "claim"], maturationTarget: "Finding" },
        { name: "method-question", icon: "help-circle", description: "Question about methodological approach", naturalNext: ["question", "claim"], maturationTarget: "Methodology_Choice" },
        { name: "population-note", icon: "users", description: "Note about a population or sample", naturalNext: ["evidence", "variable-note"], maturationTarget: "Sample_Description" },
        { name: "theory-link", icon: "git-branch", description: "Connection to a theoretical framework", naturalNext: ["claim", "evidence"], maturationTarget: "Theoretical_Framework" },
        { name: "bias-flag", icon: "alert-triangle", description: "Potential source of bias identified", naturalNext: ["question", "counterargument"], maturationTarget: "Limitation" },
        { name: "context-note", icon: "map-pin", description: "Note about the social or cultural context", naturalNext: ["claim", "evidence"], maturationTarget: "Context_Factor" },
        { name: "positionality-note", icon: "compass", description: "Note about researcher's positionality", naturalNext: ["question", "assumption"], maturationTarget: "Limitation" },
      ],
      formalTypes: [
        { name: "Variable", description: "Defined variable in a study (independent, dependent, control)", requiredAttributes: ["variable_type", "measurement"] },
        { name: "Finding", description: "Verified research finding", requiredAttributes: ["method_used", "statistical_significance"] },
        { name: "Methodology_Choice", description: "Justified methodological decision", requiredAttributes: ["alternatives_considered", "rationale"] },
        { name: "Sample_Description", description: "Description of research sample or population", requiredAttributes: ["size", "selection_criteria", "demographics"] },
        { name: "Theoretical_Framework", description: "Framework guiding the research", requiredAttributes: ["key_concepts", "origin_tradition"] },
        { name: "Limitation", description: "Acknowledged limitation of the study", requiredAttributes: ["type", "impact_assessment"] },
        { name: "Context_Factor", description: "Contextual factor influencing the research", requiredAttributes: ["scope", "relevance"] },
        { name: "Hypothesis", description: "Testable social science hypothesis", requiredAttributes: ["variables_involved", "predicted_relationship"] },
        { name: "Phenomenon", description: "Social phenomenon under investigation", requiredAttributes: ["definition", "scope"] },
        { name: "Theme", description: "Emergent theme from qualitative analysis", requiredAttributes: ["data_source", "prevalence"] },
        { name: "Participant_Voice", description: "Direct participant perspective or quote", requiredAttributes: ["anonymization", "context"] },
      ],
      relationExtensions: [
        { name: "correlates_with", description: "Statistical correlation between variables", layer: 4 },
        { name: "mediates", description: "This variable mediates the relationship between others", layer: 4 },
        { name: "moderates", description: "This variable moderates the relationship between others", layer: 4 },
      ],
      frames: ["APA-Research-Article", "Grounded-Theory", "Mixed-Methods", "Ethnographic-Account"],
      compassRules: [
        "Every Finding must link to a Methodology_Choice",
        "Every Hypothesis must specify Variables involved",
        "Every Sample_Description must include selection criteria",
        "Every study must acknowledge at least one Limitation",
        "Every Theoretical_Framework must connect to observed Phenomena",
      ],
    },
  },

  // ── 6. Business / Strategy ──────────────────────────────────────────────────
  {
    name: "Business / Strategy",
    slug: "business",
    description: "Domain template for business analysis, strategic planning, and decision-making",
    config: {
      seedTypes: [
        { name: "signal", icon: "radio", description: "Market or industry signal worth tracking", naturalNext: ["claim", "evidence"], maturationTarget: "Market_Observation" },
        { name: "risk-flag", icon: "alert-octagon", description: "Identified risk factor", naturalNext: ["counterargument", "question"], maturationTarget: "Risk_Assessment" },
        { name: "opportunity", icon: "target", description: "Potential business opportunity spotted", naturalNext: ["claim", "action"], maturationTarget: "Opportunity" },
        { name: "stakeholder-note", icon: "users", description: "Note about a stakeholder's interests or power", naturalNext: ["claim", "evidence"], maturationTarget: "Stakeholder_Analysis" },
        { name: "metric-note", icon: "bar-chart", description: "Key metric or KPI observation", naturalNext: ["evidence", "signal"], maturationTarget: "KPI_Definition" },
        { name: "benchmark", icon: "trending-up", description: "Competitive benchmark or comparison point", naturalNext: ["evidence", "claim"], maturationTarget: "Competitive_Point" },
        { name: "decision-sketch", icon: "git-pull-request", description: "Rough outline of a strategic decision", naturalNext: ["action", "claim"], maturationTarget: "Strategic_Decision" },
        { name: "lesson", icon: "graduation-cap", description: "Lesson learned from experience or failure", naturalNext: ["claim", "assumption"], maturationTarget: "Lesson_Learned" },
      ],
      formalTypes: [
        { name: "Market_Observation", description: "Verified market trend or observation", requiredAttributes: ["data_source", "time_frame"] },
        { name: "Risk_Assessment", description: "Formal risk evaluation", requiredAttributes: ["probability", "impact", "mitigation"] },
        { name: "Opportunity", description: "Validated business opportunity", requiredAttributes: ["market_size", "time_window"] },
        { name: "Stakeholder_Analysis", description: "Analysis of stakeholder interests and influence", requiredAttributes: ["power_level", "interest_level"] },
        { name: "KPI_Definition", description: "Defined key performance indicator", requiredAttributes: ["metric", "target_value", "measurement_frequency"] },
        { name: "Competitive_Point", description: "Competitive positioning data point", requiredAttributes: ["competitor", "dimension"] },
        { name: "Strategic_Decision", description: "Formal strategic decision with rationale", requiredAttributes: ["options_considered", "chosen_option", "rationale"] },
        { name: "Lesson_Learned", description: "Documented lesson from experience", requiredAttributes: ["context", "applicable_future_scenarios"] },
        { name: "Situation", description: "Current business situation analysis", requiredAttributes: ["scope", "stakeholders"] },
        { name: "Options", description: "Strategic options under consideration", requiredAttributes: ["option_list", "evaluation_criteria"] },
        { name: "Recommendation", description: "Formal strategic recommendation", requiredAttributes: ["recommended_option", "expected_outcomes"] },
      ],
      relationExtensions: [
        { name: "mitigates", description: "This action mitigates the identified risk", layer: 8 },
        { name: "competes_with", description: "This entity competes with another", layer: 4 },
      ],
      frames: ["SWOT", "Situation-Complication-Resolution", "MECE-Analysis", "Blue-Ocean-Canvas"],
      compassRules: [
        "Every Strategic_Decision must have at least two Options considered",
        "Every Risk_Assessment must have a mitigation strategy",
        "Every Recommendation must reference supporting Market_Observations",
        "Every KPI_Definition must have a measurable target",
      ],
    },
  },

  // ── 7. Creative / Narrative ─────────────────────────────────────────────────
  {
    name: "Creative / Narrative",
    slug: "creative",
    description: "Domain template for creative writing, storytelling, and narrative construction",
    config: {
      seedTypes: [
        { name: "image-seed", icon: "image", description: "Vivid image or sensory detail to develop", naturalNext: ["observation", "idea"], maturationTarget: "Descriptive_Element" },
        { name: "voice-note", icon: "mic", description: "Character voice or dialogue snippet", naturalNext: ["observation", "idea"], maturationTarget: "Character_Voice" },
        { name: "mood", icon: "cloud", description: "Emotional atmosphere or tone to capture", naturalNext: ["observation", "idea"], maturationTarget: "Tone_Setting" },
        { name: "structure-idea", icon: "layout", description: "Idea about narrative structure or form", naturalNext: ["idea", "action"], maturationTarget: "Plot_Structure" },
        { name: "detail", icon: "zoom-in", description: "Specific detail that could enrich the narrative", naturalNext: ["observation", "image-seed"], maturationTarget: "Descriptive_Element" },
        { name: "resonance", icon: "waves", description: "Moment of thematic or emotional resonance", naturalNext: ["idea", "observation"], maturationTarget: "Reader_Effect" },
        { name: "turning-point", icon: "rotate-ccw", description: "Potential narrative turning point or reversal", naturalNext: ["structure-idea", "idea"], maturationTarget: "Inciting_Event" },
        { name: "character-sketch", icon: "user-pen", description: "Quick sketch of a character trait or behavior", naturalNext: ["voice-note", "observation"], maturationTarget: "Character" },
      ],
      formalTypes: [
        { name: "Scene", description: "Fully developed narrative scene", requiredAttributes: ["setting", "characters_present", "purpose_in_narrative"] },
        { name: "Character_Voice", description: "Defined character voice and speech patterns", requiredAttributes: ["character_name", "voice_characteristics"] },
        { name: "Tone_Setting", description: "Established emotional tone or atmosphere", requiredAttributes: ["mood", "sensory_details"] },
        { name: "Plot_Structure", description: "Structural element of the narrative arc", requiredAttributes: ["position_in_arc", "function"] },
        { name: "Descriptive_Element", description: "Polished descriptive passage", requiredAttributes: ["sensory_channels", "function_in_scene"] },
        { name: "Reader_Effect", description: "Intended effect on the reader", requiredAttributes: ["target_emotion", "technique"] },
        { name: "Inciting_Event", description: "Event that sets the narrative in motion", requiredAttributes: ["stakes", "affected_characters"] },
        { name: "Climax", description: "Peak moment of narrative tension", requiredAttributes: ["conflict_resolved", "transformation"] },
        { name: "Character", description: "Fully developed character profile", requiredAttributes: ["motivation", "arc", "relationships"] },
        { name: "Setting", description: "Developed setting or world element", requiredAttributes: ["sensory_details", "narrative_function"] },
        { name: "Event", description: "Narrative event in the plot", requiredAttributes: ["causation", "consequences"] },
        { name: "Resolution", description: "Resolution of a narrative thread", requiredAttributes: ["thread_resolved", "new_equilibrium"] },
      ],
      relationExtensions: [
        { name: "foreshadows", description: "This element foreshadows a later development", layer: 5 },
        { name: "mirrors", description: "This element mirrors another structurally or thematically", layer: 6 },
        { name: "transforms_into", description: "This character or element transforms into another", layer: 8 },
      ],
      frames: ["Three-Act-Structure", "Hero-Journey", "Kishoten-Ketsu", "Frame-Narrative", "In-Medias-Res"],
      compassRules: [
        "Every Scene must have at least one Character present",
        "Every Inciting_Event must connect to the Climax",
        "Every Character must have a defined motivation and arc",
        "Every Plot_Structure element must have a clear function",
      ],
    },
  },

  // ── 8. Journalism / Personal Records ────────────────────────────────────────
  {
    name: "Journalism / Personal Records",
    slug: "journalism",
    description: "Domain template for journalistic writing, reporting, and personal record-keeping",
    config: {
      seedTypes: [
        { name: "lead", icon: "newspaper", description: "Potential story lead or hook", naturalNext: ["evidence", "question"], maturationTarget: "Lead" },
        { name: "source-contact", icon: "phone", description: "Contact information or note about a source", naturalNext: ["evidence", "lead"], maturationTarget: "Attribution" },
        { name: "angle", icon: "compass", description: "Potential angle or framing for the story", naturalNext: ["claim", "lead"], maturationTarget: "Nut_graf" },
        { name: "fact-check", icon: "check-circle", description: "Item requiring fact-checking", naturalNext: ["evidence", "question"], maturationTarget: "Verified_Fact" },
        { name: "quote-flag", icon: "quote", description: "Notable quote to potentially use", naturalNext: ["evidence", "lead"], maturationTarget: "Direct_Quote" },
        { name: "timeline-note", icon: "clock", description: "Event to place on the story timeline", naturalNext: ["evidence", "lead"], maturationTarget: "Timeline_Event" },
        { name: "reflection", icon: "pen-tool", description: "Personal reflection or interpretive note", naturalNext: ["claim", "observation"], maturationTarget: "Personal_Reflection" },
      ],
      formalTypes: [
        { name: "Lead", description: "Opening hook of the story", requiredAttributes: ["news_value", "timeliness"] },
        { name: "Attribution", description: "Attributed statement from a named or anonymous source", requiredAttributes: ["source_type", "reliability", "on_record_status"] },
        { name: "Nut_graf", description: "Paragraph explaining why the story matters", requiredAttributes: ["significance", "broader_context"] },
        { name: "Verified_Fact", description: "Fact that has been independently verified", requiredAttributes: ["verification_method", "sources_count"] },
        { name: "Direct_Quote", description: "Verbatim quote from a source", requiredAttributes: ["speaker", "context", "date"] },
        { name: "Timeline_Event", description: "Event placed on the story timeline", requiredAttributes: ["date", "significance"] },
        { name: "Personal_Reflection", description: "Journalist's personal reflection or analysis", requiredAttributes: ["context", "ethical_considerations"] },
        { name: "Supporting_Detail", description: "Detail that supports or enriches the narrative", requiredAttributes: ["source", "relevance"] },
      ],
      relationExtensions: [
        { name: "corroborates", description: "This source corroborates another source's claim", layer: 2 },
        { name: "contradicts_source", description: "This source contradicts another source", layer: 1 },
      ],
      frames: ["Inverted-Pyramid", "Narrative-Feature", "Investigative-Structure", "Personal-Essay"],
      compassRules: [
        "Every Lead must connect to a Nut_graf",
        "Every Verified_Fact must have at least two independent sources",
        "Every Direct_Quote must have Attribution",
        "Every story must have at least one on-record source",
      ],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: UnitType — 3-tier type palette
// ═══════════════════════════════════════════════════════════════════════════════

interface UnitTypeDef {
  name: string;
  tier: TypeTier;
  domain: string | null;
  icon: string | null;
  description: string;
  naturalNextTypes: string[];
  maturationTarget: string | null;
  sortOrder: number;
}

// --- Base types (12) — domain-independent ---
const baseTypes: UnitTypeDef[] = [
  { name: "claim",            tier: "base", domain: null, icon: "message-square", description: "An assertion or proposition the user believes or considers", naturalNextTypes: ["evidence", "counterargument", "warrant"], maturationTarget: null, sortOrder: 1 },
  { name: "question",         tier: "base", domain: null, icon: "help-circle",    description: "An open question the user wants to explore", naturalNextTypes: ["claim", "evidence", "idea"], maturationTarget: null, sortOrder: 2 },
  { name: "evidence",         tier: "base", domain: null, icon: "file-check",     description: "Data, facts, or observations supporting or undermining a claim", naturalNextTypes: ["claim", "counterargument"], maturationTarget: null, sortOrder: 3 },
  { name: "counterargument",  tier: "base", domain: null, icon: "shield",         description: "An argument opposing or challenging another unit", naturalNextTypes: ["claim", "evidence", "warrant"], maturationTarget: null, sortOrder: 4 },
  { name: "observation",      tier: "base", domain: null, icon: "eye",            description: "A noticed phenomenon or pattern without judgment", naturalNextTypes: ["claim", "question", "idea"], maturationTarget: null, sortOrder: 5 },
  { name: "idea",             tier: "base", domain: null, icon: "lightbulb",      description: "A creative thought or potential direction to explore", naturalNextTypes: ["claim", "action", "question"], maturationTarget: null, sortOrder: 6 },
  { name: "definition",       tier: "base", domain: null, icon: "book-open",      description: "A precise definition of a concept or term", naturalNextTypes: ["claim", "evidence"], maturationTarget: null, sortOrder: 7 },
  { name: "assumption",       tier: "base", domain: null, icon: "alert-circle",   description: "An unstated or stated premise taken as given", naturalNextTypes: ["claim", "question", "evidence"], maturationTarget: null, sortOrder: 8 },
  { name: "action",           tier: "base", domain: null, icon: "play-circle",    description: "A concrete next step or task to execute", naturalNextTypes: ["claim", "evidence"], maturationTarget: null, sortOrder: 9 },
  { name: "warrant",          tier: "base", domain: null, icon: "key",            description: "The logical bridge connecting evidence to a claim", naturalNextTypes: ["claim", "backing"], maturationTarget: null, sortOrder: 10 },
  { name: "backing",          tier: "base", domain: null, icon: "layers",         description: "Support for a warrant — the deeper justification", naturalNextTypes: ["warrant", "evidence"], maturationTarget: null, sortOrder: 11 },
  { name: "decision",         tier: "base", domain: null, icon: "check-square",   description: "A resolved decision with rationale", naturalNextTypes: ["action", "claim"], maturationTarget: null, sortOrder: 12 },
];

// --- Seed types per domain ---
function buildSeedTypes(): UnitTypeDef[] {
  const seeds: UnitTypeDef[] = [];

  // Collect seed types from each domain template config
  const domainSeedMap: Record<string, Array<{
    name: string;
    icon: string;
    description: string;
    naturalNext: string[];
    maturationTarget: string | null;
  }>> = {};

  for (const dt of domainTemplates) {
    domainSeedMap[dt.slug] = dt.config.seedTypes;
  }

  let globalSort = 100;
  for (const [domain, seedList] of Object.entries(domainSeedMap)) {
    for (const s of seedList) {
      seeds.push({
        name: s.name,
        tier: "seed",
        domain,
        icon: s.icon,
        description: s.description,
        naturalNextTypes: s.naturalNext,
        maturationTarget: s.maturationTarget,
        sortOrder: globalSort++,
      });
    }
  }

  return seeds;
}

// --- Formal types per domain ---
function buildFormalTypes(): UnitTypeDef[] {
  const formals: UnitTypeDef[] = [];

  let globalSort = 500;
  for (const dt of domainTemplates) {
    for (const f of dt.config.formalTypes) {
      formals.push({
        name: f.name,
        tier: "formal",
        domain: dt.slug,
        icon: null,
        description: f.description,
        naturalNextTypes: [],
        maturationTarget: null,
        sortOrder: globalSort++,
      });
    }
  }

  return formals;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("Seeding FlowMind database...\n");

  // ── 1. SystemRelationType ───────────────────────────────────────────────────
  console.log(`  [1/3] Seeding ${systemRelationTypes.length} system relation types across 8 layers...`);

  for (const rt of systemRelationTypes) {
    await prisma.systemRelationType.upsert({
      where: { name: rt.name },
      update: {
        layer: rt.layer,
        category: rt.category,
        description: rt.description,
        defaultNs: rt.defaultNs,
        uiTier: rt.uiTier,
        sortOrder: rt.sortOrder,
      },
      create: {
        name: rt.name,
        layer: rt.layer,
        category: rt.category,
        description: rt.description,
        defaultNs: rt.defaultNs,
        uiTier: rt.uiTier,
        sortOrder: rt.sortOrder,
      },
    });
  }

  const tier1Count = systemRelationTypes.filter((r) => r.uiTier === 1).length;
  const tier2Count = systemRelationTypes.filter((r) => r.uiTier === 2).length;
  const tier3Count = systemRelationTypes.filter((r) => r.uiTier === 3).length;
  console.log(`        Tier 1 (always visible): ${tier1Count} types`);
  console.log(`        Tier 2 (accessible):     ${tier2Count} types`);
  console.log(`        Tier 3 (expert):         ${tier3Count} types`);
  console.log("  DONE  System relation types seeded.\n");

  // ── 2. DomainTemplate ───────────────────────────────────────────────────────
  console.log(`  [2/3] Seeding ${domainTemplates.length} domain templates...`);

  for (const dt of domainTemplates) {
    await prisma.domainTemplate.upsert({
      where: { slug: dt.slug },
      update: {
        name: dt.name,
        description: dt.description,
        config: dt.config as any,
      },
      create: {
        name: dt.name,
        slug: dt.slug,
        description: dt.description,
        config: dt.config as any,
      },
    });
    console.log(`        - ${dt.slug}: ${dt.config.seedTypes.length} seed types, ${dt.config.formalTypes.length} formal types, ${dt.config.frames.length} frames`);
  }

  console.log("  DONE  Domain templates seeded.\n");

  // ── 3. UnitType — 3-tier type palette ───────────────────────────────────────
  const seedTypes = buildSeedTypes();
  const formalTypes = buildFormalTypes();
  const allUnitTypes = [...baseTypes, ...seedTypes, ...formalTypes];

  console.log(`  [3/3] Seeding ${allUnitTypes.length} unit types (${baseTypes.length} base, ${seedTypes.length} seed, ${formalTypes.length} formal)...`);

  for (const ut of allUnitTypes) {
    // PostgreSQL treats NULLs as distinct in unique constraints, so
    // upsert cannot match on domain=NULL reliably. We store empty string
    // "" for domain-independent (base) types to ensure idempotent upserts.
    const domainValue = ut.domain ?? "";

    await prisma.unitType.upsert({
      where: {
        name_tier_domain: {
          name: ut.name,
          tier: ut.tier,
          domain: domainValue,
        },
      },
      update: {
        icon: ut.icon,
        description: ut.description,
        naturalNextTypes: ut.naturalNextTypes,
        maturationTarget: ut.maturationTarget,
        sortOrder: ut.sortOrder,
      },
      create: {
        name: ut.name,
        tier: ut.tier,
        domain: domainValue,
        icon: ut.icon,
        description: ut.description,
        naturalNextTypes: ut.naturalNextTypes,
        maturationTarget: ut.maturationTarget,
        sortOrder: ut.sortOrder,
      },
    });
  }

  console.log("  DONE  Unit types seeded.\n");

  // ── Summary ─────────────────────────────────────────────────────────────────
  const [relCount, templateCount, unitTypeCount] = await Promise.all([
    prisma.systemRelationType.count(),
    prisma.domainTemplate.count(),
    prisma.unitType.count(),
  ]);

  console.log("=== Seed Summary ===");
  console.log(`  SystemRelationType : ${relCount}`);
  console.log(`  DomainTemplate     : ${templateCount}`);
  console.log(`  UnitType           : ${unitTypeCount}`);
  console.log("\nSeed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
