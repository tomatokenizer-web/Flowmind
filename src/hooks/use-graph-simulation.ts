"use client";

import * as React from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphNode, GraphEdge, GraphLayoutMode } from "~/components/domain/graph/graph-types";

/* ─── Configuration ─── */

interface SimulationConfig {
  /** Layout mode */
  layout: GraphLayoutMode;
  /** Width of the container */
  width: number;
  /** Height of the container */
  height: number;
  /** Charge (repulsion) strength — negative values repel */
  chargeStrength?: number;
  /** Link distance */
  linkDistance?: number;
  /** Collision radius multiplier (applied to node radius) */
  collisionMultiplier?: number;
  /** Alpha target — set > 0 for continuous gentle motion */
  alphaTarget?: number;
}

const DEFAULT_CONFIG: Required<SimulationConfig> = {
  layout: "force",
  width: 800,
  height: 600,
  chargeStrength: -120,
  linkDistance: 80,
  collisionMultiplier: 1.5,
  alphaTarget: 0.02,
};

/* ─── Hook Return ─── */

export interface GraphSimulationResult {
  /** Reference to the D3 simulation */
  simulation: Simulation<GraphNode, GraphEdge> | null;
  /** Current tick counter (triggers re-renders) */
  tick: number;
  /** Re-heat the simulation (e.g. after filter change) */
  reheat: () => void;
  /** Fully restart with new data */
  restart: (nodes: GraphNode[], links: GraphEdge[]) => void;
  /** Pin a node at position */
  pinNode: (nodeId: string, x: number, y: number) => void;
  /** Unpin a node */
  unpinNode: (nodeId: string) => void;
  /** Update layout mode */
  setLayout: (mode: GraphLayoutMode) => void;
}

/* ─── Hook ─── */

export function useGraphSimulation(
  initialNodes: GraphNode[],
  initialLinks: GraphEdge[],
  config: Partial<SimulationConfig> = {},
): GraphSimulationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const simulationRef = React.useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const nodesRef = React.useRef<GraphNode[]>(initialNodes);
  const linksRef = React.useRef<GraphEdge[]>(initialLinks);
  const layoutRef = React.useRef<GraphLayoutMode>(cfg.layout);
  const [tick, setTick] = React.useState(0);
  const rafRef = React.useRef<number>(0);
  const tickCountRef = React.useRef(0);

  // Throttled tick handler — update React state every 2 ticks for performance
  const onTick = React.useCallback(() => {
    tickCountRef.current += 1;
    if (tickCountRef.current % 2 === 0) {
      setTick((t) => t + 1);
    }
  }, []);

  // Build or rebuild the simulation
  const buildSimulation = React.useCallback(
    (nodes: GraphNode[], links: GraphEdge[]) => {
      // Stop existing simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      nodesRef.current = nodes;
      linksRef.current = links;

      const sim = forceSimulation<GraphNode>(nodes)
        .force(
          "link",
          forceLink<GraphNode, GraphEdge>(links)
            .id((d) => d.id)
            .distance(cfg.linkDistance)
            .strength((d) => d.strength * 0.5),
        )
        .force(
          "charge",
          forceManyBody<GraphNode>().strength(cfg.chargeStrength),
        )
        .force(
          "center",
          forceCenter<GraphNode>(cfg.width / 2, cfg.height / 2).strength(0.05),
        )
        .force(
          "collision",
          forceCollide<GraphNode>()
            .radius((d) => {
              const baseRadius = 8 + d.thoughtRank * 4;
              return baseRadius * cfg.collisionMultiplier;
            })
            .strength(0.7),
        )
        .alphaTarget(cfg.alphaTarget)
        .alphaDecay(0.02)
        .velocityDecay(0.4);

      // Apply layout-specific forces
      if (layoutRef.current === "radial") {
        sim.force(
          "radial",
          forceRadial<GraphNode>(
            Math.min(cfg.width, cfg.height) * 0.3,
            cfg.width / 2,
            cfg.height / 2,
          ).strength(0.3),
        );
        sim.force("center", null);
      } else if (layoutRef.current === "hierarchical") {
        // Hierarchical: use Y-force based on thoughtRank
        sim.force("center", null);
        sim.force(
          "x",
          {
            initialize: () => {},
            force: (alpha: number) => {
              for (const node of nodes) {
                const targetX = cfg.width / 2;
                node.vx = ((node.vx ?? 0) + (targetX - (node.x ?? 0)) * 0.01 * alpha);
              }
            },
          } as unknown as Parameters<typeof sim.force>[1],
        );
        sim.force(
          "y",
          {
            initialize: () => {},
            force: (alpha: number) => {
              for (const node of nodes) {
                const targetY = (1 - node.thoughtRank) * cfg.height * 0.8 + cfg.height * 0.1;
                node.vy = ((node.vy ?? 0) + (targetY - (node.y ?? 0)) * 0.03 * alpha);
              }
            },
          } as unknown as Parameters<typeof sim.force>[1],
        );
      }

      // Use rAF-based ticking for smooth rendering
      sim.on("tick", onTick);

      simulationRef.current = sim;
    },
    [cfg.chargeStrength, cfg.collisionMultiplier, cfg.height, cfg.linkDistance, cfg.width, cfg.alphaTarget, onTick],
  );

  // Initialize on mount / when initial data changes
  React.useEffect(() => {
    if (initialNodes.length === 0) return;

    // Warm start: preserve positions of existing nodes
    const existingPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodesRef.current) {
      if (node.x != null && node.y != null) {
        existingPositions.set(node.id, { x: node.x, y: node.y });
      }
    }

    for (const node of initialNodes) {
      const existing = existingPositions.get(node.id);
      if (existing) {
        node.x = existing.x;
        node.y = existing.y;
      }
    }

    buildSimulation(initialNodes, initialLinks);

    return () => {
      simulationRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initialNodes, initialLinks, buildSimulation]);

  // Reheat
  const reheat = React.useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.8).restart();
    }
  }, []);

  // Restart
  const restart = React.useCallback(
    (nodes: GraphNode[], links: GraphEdge[]) => {
      buildSimulation(nodes, links);
    },
    [buildSimulation],
  );

  // Pin node
  const pinNode = React.useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  // Unpin node
  const unpinNode = React.useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  // Set layout
  const setLayout = React.useCallback(
    (mode: GraphLayoutMode) => {
      layoutRef.current = mode;
      buildSimulation(nodesRef.current, linksRef.current);
    },
    [buildSimulation],
  );

  return {
    simulation: simulationRef.current,
    tick,
    reheat,
    restart,
    pinNode,
    unpinNode,
    setLayout,
  };
}
