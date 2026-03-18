import type { UnitType } from "@prisma/client";
import { BASE_UNIT_TYPES, type BaseUnitType } from "@/lib/unit-types";

// ─── Domain-Specific Type Extensions ───────────────────────────────
// Base types are fixed system types. Domain types extend them for
// specific use-cases (e.g. academic, legal, product). Custom domain
// types map back to a base type for color/icon inheritance.

export interface DomainUnitType {
  /** Unique identifier within the domain (e.g. "hypothesis") */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of this domain-specific type */
  description: string;
  /** The base type this maps to (inherits color/icon) */
  baseType: UnitType;
  /** Domain this type belongs to */
  domain: string;
}

export interface DomainTypeConfig {
  /** Domain identifier (e.g. "academic", "legal", "product") */
  id: string;
  /** Human-readable domain name */
  label: string;
  /** Domain-specific types */
  types: DomainUnitType[];
}

// ─── Built-in Domain Templates ─────────────────────────────────────

export const DOMAIN_TEMPLATES: DomainTypeConfig[] = [
  {
    id: "academic",
    label: "Academic Research",
    types: [
      { id: "hypothesis",       label: "Hypothesis",       description: "A testable prediction derived from theory",              baseType: "claim",           domain: "academic" },
      { id: "research_question", label: "Research Question", description: "A formal question guiding investigation",               baseType: "question",        domain: "academic" },
      { id: "finding",          label: "Finding",           description: "An empirical result from data or experiment",            baseType: "evidence",        domain: "academic" },
      { id: "limitation",       label: "Limitation",        description: "A boundary or constraint on conclusions",                baseType: "counterargument", domain: "academic" },
      { id: "methodology",      label: "Methodology",       description: "An approach or procedure for investigation",             baseType: "action",          domain: "academic" },
    ],
  },
  {
    id: "product",
    label: "Product Development",
    types: [
      { id: "user_need",        label: "User Need",         description: "A problem or desire expressed by users",                 baseType: "observation",     domain: "product" },
      { id: "feature_proposal",  label: "Feature Proposal",  description: "A proposed solution or capability",                      baseType: "idea",            domain: "product" },
      { id: "requirement",      label: "Requirement",       description: "A concrete specification to implement",                  baseType: "claim",           domain: "product" },
      { id: "risk",             label: "Risk",              description: "A potential problem or blocker",                          baseType: "counterargument", domain: "product" },
      { id: "decision",         label: "Decision",          description: "A resolved choice with rationale",                       baseType: "action",          domain: "product" },
    ],
  },
  {
    id: "legal",
    label: "Legal Analysis",
    types: [
      { id: "argument",         label: "Argument",          description: "A legal position or line of reasoning",                  baseType: "claim",           domain: "legal" },
      { id: "precedent",        label: "Precedent",         description: "A prior ruling or established case law",                 baseType: "evidence",        domain: "legal" },
      { id: "statute",          label: "Statute",           description: "A legislative provision or regulatory text",             baseType: "definition",      domain: "legal" },
      { id: "objection",        label: "Objection",         description: "A challenge to admissibility or reasoning",              baseType: "counterargument", domain: "legal" },
      { id: "issue",            label: "Issue",             description: "A legal question to be resolved",                        baseType: "question",        domain: "legal" },
    ],
  },
  {
    id: "philosophy",
    label: "Philosophical Inquiry",
    types: [
      { id: "thesis",           label: "Thesis",            description: "A central philosophical position",                       baseType: "claim",           domain: "philosophy" },
      { id: "antithesis",       label: "Antithesis",        description: "A direct opposition to a thesis",                        baseType: "counterargument", domain: "philosophy" },
      { id: "thought_experiment", label: "Thought Experiment", description: "A hypothetical scenario for testing ideas",            baseType: "idea",            domain: "philosophy" },
      { id: "axiom",            label: "Axiom",             description: "A self-evident principle taken as starting point",        baseType: "assumption",      domain: "philosophy" },
      { id: "paradox",          label: "Paradox",           description: "A seemingly contradictory statement revealing deeper truth", baseType: "question",     domain: "philosophy" },
    ],
  },
];

// ─── Lookup Helpers ────────────────────────────────────────────────

/** Get all domain types for a given domain id */
export function getDomainTypes(domainId: string): DomainUnitType[] {
  const domain = DOMAIN_TEMPLATES.find((d) => d.id === domainId);
  return domain?.types ?? [];
}

/** Get a domain type's full config including inherited base type info */
export function getDomainTypeWithBase(
  domainId: string,
  typeId: string,
): (DomainUnitType & { base: BaseUnitType }) | undefined {
  const domainType = getDomainTypes(domainId).find((t) => t.id === typeId);
  if (!domainType) return undefined;

  const base = BASE_UNIT_TYPES.find((b) => b.id === domainType.baseType);
  if (!base) return undefined;

  return { ...domainType, base };
}

/** List all available domain template ids */
export function listDomainIds(): string[] {
  return DOMAIN_TEMPLATES.map((d) => d.id);
}
