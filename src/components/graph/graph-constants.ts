import { UNIT_TYPE_COLORS as UNIT_TYPE_COLOR_TOKENS } from "~/lib/unit-types";
import type { RelationWeight, RelationCategory } from "./graph-types";

// ─── Unit type → hex color (derived from canonical unit-types tokens) ─

export const UNIT_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(UNIT_TYPE_COLOR_TOKENS).map(([type, { accent }]) => [type, accent]),
);

// ─── Relation type → hex color ────────────────────────────────────

export const RELATION_TYPE_COLORS: Record<string, string> = {
  supports: "#10B981",
  contradicts: "#EF4444",
  derives_from: "#3B82F6",
  expands: "#8B5CF6",
  references: "#6B7280",
  exemplifies: "#F59E0B",
  defines: "#06B6D4",
  questions: "#F97316",
};

// ─── Relation type → stroke weight ────────────────────────────────
// thick = high-importance logical relations
// medium = elaboration / example / response
// thin = loose associative / contextual

export const RELATION_TYPE_WEIGHT: Record<string, RelationWeight> = {
  // thick: strong logical bonds
  supports: "thick",
  contradicts: "thick",
  derives_from: "thick",
  // medium: elaboration / exemplification / response
  elaborates: "medium",
  exemplifies: "medium",
  responds_to: "medium",
  expands: "medium",
  questions: "medium",
  defines: "medium",
  references: "medium",
  // thin: loose / contextual
  associated: "thin",
  contextual: "thin",
  inspires: "thin",
  echoes: "thin",
  parallels: "thin",
  transforms_into: "thin",
  foreshadows: "thin",
  contextualizes: "thin",
  operationalizes: "thin",
  contains: "thin",
  presupposes: "thin",
  defined_by: "thin",
  grounded_in: "thin",
  instantiates: "thin",
  precedes: "thin",
  supersedes: "thin",
  complements: "thin",
};

export const WEIGHT_STROKE: Record<RelationWeight, number> = {
  thick: 2.5,
  medium: 1.8,
  thin: 1.0,
};

// ─── Relation type → purpose category ─────────────────────────────
// Maps each system relation type name to its purpose category.
// Argument: solid thick lines | Creative/Research: dashed lines | Structural: dotted lighter lines

export const RELATION_TYPE_CATEGORY: Record<string, RelationCategory> = {
  // argument
  supports: "argument",
  contradicts: "argument",
  derives_from: "argument",
  expands: "argument",
  references: "argument",
  exemplifies: "argument",
  defines: "argument",
  questions: "argument",
  // creative_research
  inspires: "creative_research",
  echoes: "creative_research",
  transforms_into: "creative_research",
  foreshadows: "creative_research",
  parallels: "creative_research",
  contextualizes: "creative_research",
  operationalizes: "creative_research",
  // structure_containment
  contains: "structure_containment",
  presupposes: "structure_containment",
  defined_by: "structure_containment",
  grounded_in: "structure_containment",
  instantiates: "structure_containment",
  precedes: "structure_containment",
  supersedes: "structure_containment",
  complements: "structure_containment",
};

// ─── Node visual constants ─────────────────────────────────────────

export const NODE_RADIUS_MIN = 8;
export const NODE_RADIUS_MAX = 24;
export const LABEL_ZOOM_THRESHOLD = 0.8;

/** @deprecated Use getNodeRadius() instead */
export const NODE_RADIUS = NODE_RADIUS_MIN;

export const FOCUS_RING_COLOR = "#FFFFFF";
export const FOCUS_RING_WIDTH = 2;
export const FIT_ALL_PADDING = 60;
export const DIMMED_OPACITY = 0.3;
