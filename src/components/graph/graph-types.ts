import type {
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";

// ─── Domain types (raw data from store) ──────────────────────────

export interface GraphUnit {
  id: string;
  content: string;
  unitType: string;
  lifecycle?: string;
}

export interface GraphRelation {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
  direction: string;
  isLoopback?: boolean;
}

// ─── Simulation node / link types ────────────────────────────────

export interface SimNode extends SimulationNodeDatum {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  x?: number;
  y?: number;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
  strength: number;
  isLoopback: boolean;
  source: string | SimNode;
  target: string | SimNode;
}

// ─── Component props ──────────────────────────────────────────────

export interface Props {
  units: GraphUnit[];
  relations: GraphRelation[];
  onNodeClick?: (nodeId: string) => void;
}

// ─── Relation weight / category ──────────────────────────────────

export type RelationWeight = "thick" | "medium" | "thin";
export type RelationCategory = "argument" | "creative_research" | "structure_containment";

// ─── Bounding box ─────────────────────────────────────────────────

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

// ─── Renderer options ─────────────────────────────────────────────

export interface RenderOptions {
  panOffset: { x: number; y: number };
  zoomLevel: number;
  hiddenRelationTypes: Set<string>;
  connectedNodeIds: Set<string> | null;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  prefersReducedMotion: boolean;
}
