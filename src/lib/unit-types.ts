import type { UnitType } from "@prisma/client";

// ─── Unit Type Color Tokens ────────────────────────────────────────
// Exact values from project-context.md / tokens.css

export interface UnitTypeColors {
  /** Light background tint (e.g. card fill) */
  bg: string;
  /** Dark accent (e.g. border-left, icon, badge text) */
  accent: string;
}

export const UNIT_TYPE_COLORS: Record<UnitType, UnitTypeColors> = {
  claim:            { bg: "#E8F0FE", accent: "#1A56DB" },
  question:         { bg: "#FEF3C7", accent: "#92400E" },
  evidence:         { bg: "#ECFDF5", accent: "#065F46" },
  counterargument:  { bg: "#FEF2F2", accent: "#991B1B" },
  observation:      { bg: "#F5F3FF", accent: "#4C1D95" },
  idea:             { bg: "#FFF7ED", accent: "#9A3412" },
  definition:       { bg: "#E0F2F1", accent: "#00695C" },
  assumption:       { bg: "#ECEFF1", accent: "#546E7A" },
  action:           { bg: "#E8EAF6", accent: "#283593" },
};

// ─── Lucide Icon Names ─────────────────────────────────────────────
// Using Lucide React icon names (the ONLY allowed icon set)

export const UNIT_TYPE_ICONS: Record<UnitType, string> = {
  claim:            "MessageSquare",
  question:         "HelpCircle",
  evidence:         "FileCheck",
  counterargument:  "ShieldAlert",
  observation:      "Eye",
  idea:             "Lightbulb",
  definition:       "BookOpen",
  assumption:       "AlertTriangle",
  action:           "Zap",
};

// ─── Descriptions ──────────────────────────────────────────────────

export const UNIT_TYPE_DESCRIPTIONS: Record<UnitType, string> = {
  claim:            "A statement or assertion that can be supported or challenged",
  question:         "An inquiry that opens exploration or needs resolution",
  evidence:         "Data, fact, or reference that supports or refutes a claim",
  counterargument:  "An objection or alternative perspective to an existing claim",
  observation:      "A noticed pattern, phenomenon, or factual remark",
  idea:             "A creative thought, possibility, or proposal to explore",
  definition:       "A clarification of meaning for a term or concept",
  assumption:       "An unstated premise or belief taken as given",
  action:           "A concrete step, task, or decision to execute",
};

// ─── Naturally-Follows Relationships ───────────────────────────────
// Maps each type to the types that commonly follow it in reasoning flow

export const UNIT_TYPE_NATURALLY_FOLLOWS: Record<UnitType, UnitType[]> = {
  claim:            ["evidence", "counterargument", "question", "assumption"],
  question:         ["claim", "idea", "observation", "evidence"],
  evidence:         ["claim", "counterargument", "observation"],
  counterargument:  ["evidence", "claim", "question"],
  observation:      ["question", "claim", "idea"],
  idea:             ["question", "claim", "action", "assumption"],
  definition:       ["claim", "observation", "question"],
  assumption:       ["question", "evidence", "counterargument"],
  action:           ["observation", "question", "evidence"],
};

// ─── Full Base Type Definition ─────────────────────────────────────

export interface BaseUnitType {
  id: UnitType;
  label: string;
  description: string;
  icon: string;
  colors: UnitTypeColors;
  naturallyFollows: UnitType[];
}

export const BASE_UNIT_TYPES: BaseUnitType[] = [
  { id: "claim",           label: "Claim",           description: UNIT_TYPE_DESCRIPTIONS.claim,           icon: UNIT_TYPE_ICONS.claim,           colors: UNIT_TYPE_COLORS.claim,           naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.claim },
  { id: "question",        label: "Question",        description: UNIT_TYPE_DESCRIPTIONS.question,        icon: UNIT_TYPE_ICONS.question,        colors: UNIT_TYPE_COLORS.question,        naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.question },
  { id: "evidence",        label: "Evidence",        description: UNIT_TYPE_DESCRIPTIONS.evidence,        icon: UNIT_TYPE_ICONS.evidence,        colors: UNIT_TYPE_COLORS.evidence,        naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.evidence },
  { id: "counterargument", label: "Counterargument", description: UNIT_TYPE_DESCRIPTIONS.counterargument, icon: UNIT_TYPE_ICONS.counterargument, colors: UNIT_TYPE_COLORS.counterargument, naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.counterargument },
  { id: "observation",     label: "Observation",     description: UNIT_TYPE_DESCRIPTIONS.observation,     icon: UNIT_TYPE_ICONS.observation,     colors: UNIT_TYPE_COLORS.observation,     naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.observation },
  { id: "idea",            label: "Idea",            description: UNIT_TYPE_DESCRIPTIONS.idea,            icon: UNIT_TYPE_ICONS.idea,            colors: UNIT_TYPE_COLORS.idea,            naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.idea },
  { id: "definition",      label: "Definition",      description: UNIT_TYPE_DESCRIPTIONS.definition,      icon: UNIT_TYPE_ICONS.definition,      colors: UNIT_TYPE_COLORS.definition,      naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.definition },
  { id: "assumption",      label: "Assumption",      description: UNIT_TYPE_DESCRIPTIONS.assumption,      icon: UNIT_TYPE_ICONS.assumption,      colors: UNIT_TYPE_COLORS.assumption,      naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.assumption },
  { id: "action",          label: "Action",          description: UNIT_TYPE_DESCRIPTIONS.action,          icon: UNIT_TYPE_ICONS.action,          colors: UNIT_TYPE_COLORS.action,          naturallyFollows: UNIT_TYPE_NATURALLY_FOLLOWS.action },
];

/** Lookup a base type by its id */
export function getBaseUnitType(id: UnitType): BaseUnitType | undefined {
  return BASE_UNIT_TYPES.find((t) => t.id === id);
}

/** All valid base type ids */
export const BASE_UNIT_TYPE_IDS: UnitType[] = BASE_UNIT_TYPES.map((t) => t.id);
