/* ─── Graph Type Definitions ─── */

import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

/* ─── Node ─── */

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  content: string;
  primaryType: string;
  secondaryType?: string | null;
  lifecycle: string;
  isEvergreen: boolean;
  isArchived: boolean;
  importance: number;
  branchPotential: number;
  relationCount: number;
  contextIds: string[];
  /** Computed ThoughtRank (0-1) */
  thoughtRank: number;
  /** Cluster ID from community detection */
  clusterId?: number;
}

/* ─── Edge ─── */

export interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  layer: string;
  strength: number;
  direction: "one_way" | "bidirectional";
  purpose: string[];
  maturity: string;
}

/* ─── Cluster ─── */

export interface GraphCluster {
  id: number;
  nodeIds: string[];
  label: string;
  color: string;
  /** Convex hull points for rendering */
  hull: [number, number][] | null;
}

/* ─── View Mode ─── */

export type GraphViewMode = "global" | "local";

export type GraphLayoutMode = "force" | "radial" | "hierarchical";

/* ─── Filter State ─── */

export interface GraphFilterState {
  visibleUnitTypes: Set<string>;
  visibleLayers: Set<string>;
  showOrphans: boolean;
  showArchived: boolean;
}

/* ─── Graph Data (returned by useGraphData) ─── */

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
  clusters: GraphCluster[];
  isLoading: boolean;
}

/* ─── Tooltip Target ─── */

export type TooltipTarget =
  | { kind: "node"; node: GraphNode; x: number; y: number }
  | { kind: "edge"; edge: GraphEdge; x: number; y: number }
  | null;

/* ─── Layer color constants (matching relation-badge.tsx) ─── */

export const LAYER_EDGE_COLORS: Record<string, string> = {
  L1: "rgb(59,130,246)",   // blue
  L2: "rgb(34,197,94)",    // green
  L3: "rgb(249,115,22)",   // orange
  L4: "rgb(168,85,247)",   // purple
  L5: "rgb(20,184,166)",   // teal
  L6: "rgb(236,72,153)",   // pink
  L7: "rgb(234,179,8)",    // yellow
  L8: "rgb(239,68,68)",    // red
};

export const DEFAULT_EDGE_COLOR = "rgb(174,174,178)";

/* ─── Unit type accent colors for graph nodes ─── */

export const UNIT_TYPE_ACCENT_COLORS: Record<string, string> = {
  claim: "#1a56db",
  question: "#92400e",
  evidence: "#065f46",
  counterargument: "#991b1b",
  observation: "#4c1d95",
  idea: "#9a3412",
  definition: "#00695c",
  assumption: "#546e7a",
  action: "#283593",
  warrant: "#065f46",
  backing: "#065f46",
  decision: "#283593",
};

export const UNIT_TYPE_BG_COLORS: Record<string, string> = {
  claim: "#e8f0fe",
  question: "#fef3c7",
  evidence: "#ecfdf5",
  counterargument: "#fef2f2",
  observation: "#f5f3ff",
  idea: "#fff7ed",
  definition: "#e0f2f1",
  assumption: "#eceff1",
  action: "#e8eaf6",
  warrant: "#ecfdf5",
  backing: "#ecfdf5",
  decision: "#e8eaf6",
};

export const DEFAULT_NODE_COLOR = "#6e6e73";

/* ─── All available unit types ─── */

export const ALL_UNIT_TYPES = [
  "claim",
  "question",
  "evidence",
  "counterargument",
  "observation",
  "idea",
  "definition",
  "assumption",
  "action",
  "warrant",
  "backing",
  "decision",
] as const;

export const ALL_LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] as const;
