"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { UnitCard } from "~/components/unit/unit-card";
import { Button } from "~/components/ui/button";

// ── Relation category -> line color ──────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  argument: "#3B82F6",
  creative_research: "#8B5CF6",
  structure_containment: "#6B7280",
};

function getRelationCategory(type: string): string {
  const argumentTypes = [
    "supports", "contradicts", "derives_from", "expands",
    "references", "exemplifies", "defines", "questions",
  ];
  const creativeTypes = [
    "inspires", "echoes", "transforms_into", "foreshadows",
    "parallels", "contextualizes", "operationalizes",
  ];
  if (argumentTypes.includes(type)) return "argument";
  if (creativeTypes.includes(type)) return "creative_research";
  return "structure_containment";
}

// ── Grid layout constants ────────────────────────────────────────

const CARD_WIDTH = 280;
const CARD_HEIGHT = 160;
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 800;
const CX = SVG_WIDTH / 2;
const CY = SVG_HEIGHT / 2;

// ── Framer Motion variants ───────────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: (depthLayer: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: depthLayer * 0.12,
      duration: 0.35,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.2 } },
};

const lineVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (depthLayer: number) => ({
    pathLength: 1,
    opacity: 0.6,
    transition: {
      delay: depthLayer * 0.12 + 0.1,
      duration: 0.4,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ── Component ────────────────────────────────────────────────────

export function LocalCardArray() {
  const localHubId = useGraphStore((s) => s.localHubId);
  const localDepth = useGraphStore((s) => s.localDepth);
  const setLocalDepth = useGraphStore((s) => s.setLocalDepth);
  const setLayer = useGraphStore((s) => s.setLayer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  // Fetch multi-depth subgraph via the new recursive endpoint
  const { data: subgraph } = api.relation.neighborsByDepth.useQuery(
    {
      hubId: localHubId!,
      depth: localDepth,
      contextId: activeContextId ?? undefined,
    },
    { enabled: !!localHubId },
  );

  const relations = subgraph?.relations ?? [];
  const layers = subgraph?.layers ?? [];

  // Collect all unit IDs across all depth layers
  const allIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const layer of layers) {
      for (const id of layer) {
        ids.push(id);
      }
    }
    return ids;
  }, [layers]);

  // Build a map: unitId -> depth layer index
  const unitDepthMap = React.useMemo(() => {
    const map = new Map<string, number>();
    layers.forEach((layer, depthIdx) => {
      for (const id of layer) {
        if (!map.has(id)) map.set(id, depthIdx);
      }
    });
    return map;
  }, [layers]);

  // Fetch all unit data in one query
  const { data: units } = api.unit.listByIds.useQuery(
    { ids: allIds },
    { enabled: allIds.length > 0 },
  );

  // Escape to go back
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLayer("global");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLayer]);

  const hubUnit = units?.find((u) => u.id === localHubId);

  // Calculate positions: hub at center, neighbors in concentric rings
  const positions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!localHubId || layers.length === 0) return map;

    // Hub at center
    map.set(localHubId, {
      x: CX - CARD_WIDTH / 2,
      y: CY - CARD_HEIGHT / 2,
    });

    // Place each depth layer on its own ring
    for (let ringIdx = 1; ringIdx < layers.length; ringIdx++) {
      const ringNodes = layers[ringIdx]!;
      const count = ringNodes.length;
      if (count === 0) continue;

      // Ring radius grows with each layer
      const baseRadius = 220;
      const radius = baseRadius + (ringIdx - 1) * 180;

      ringNodes.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
        const x = CX + Math.cos(angle) * radius - CARD_WIDTH / 2;
        const y = CY + Math.sin(angle) * radius - CARD_HEIGHT / 2;
        map.set(id, { x, y });
      });
    }

    return map;
  }, [localHubId, layers]);

  // Determine the depth layer for a relation line (for animation delay)
  const getRelationDepthLayer = React.useCallback(
    (sourceId: string, targetId: string): number => {
      const sd = unitDepthMap.get(sourceId) ?? 0;
      const td = unitDepthMap.get(targetId) ?? 0;
      return Math.max(sd, td);
    },
    [unitDepthMap],
  );

  return (
    <div className="h-full w-full overflow-auto bg-bg-primary p-4">
      {/* Controls bar */}
      <div className="mb-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLayer("global")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Global
        </Button>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <label htmlFor="depth-slider">Depth:</label>
          <input
            id="depth-slider"
            type="range"
            min={1}
            max={3}
            value={localDepth}
            onChange={(e) => setLocalDepth(Number(e.target.value))}
            className="h-1 w-24 accent-accent-primary"
          />
          <span className="w-4 text-center font-mono text-xs">{localDepth}</span>
        </div>

        {hubUnit && (
          <span className="text-sm font-medium text-text-primary">
            Hub: {hubUnit.content.slice(0, 40)}
            {hubUnit.content.length > 40 ? "..." : ""}
          </span>
        )}

        <span className="text-xs text-text-tertiary">
          {allIds.length} unit{allIds.length !== 1 ? "s" : ""} &middot;{" "}
          {relations.length} relation{relations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SVG with animated cards and lines */}
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="mx-auto rounded-lg border border-border bg-bg-secondary"
      >
        {/* Depth ring guides */}
        {layers.length > 1 &&
          Array.from({ length: layers.length - 1 }, (_, i) => {
            const radius = 220 + i * 180;
            return (
              <circle
                key={`ring-${i}`}
                cx={CX}
                cy={CY}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.5}
                strokeDasharray="4 6"
                className="text-text-tertiary/20"
              />
            );
          })}

        {/* Animated relation lines */}
        <AnimatePresence mode="popLayout">
          {relations.map((r) => {
            const sourcePos = positions.get(r.sourceUnitId);
            const targetPos = positions.get(r.targetUnitId);
            if (!sourcePos || !targetPos) return null;

            const category = getRelationCategory(r.type);
            const color = CATEGORY_COLORS[category] ?? "#6B7280";
            const depthLayer = getRelationDepthLayer(r.sourceUnitId, r.targetUnitId);

            const x1 = sourcePos.x + CARD_WIDTH / 2;
            const y1 = sourcePos.y + CARD_HEIGHT / 2;
            const x2 = targetPos.x + CARD_WIDTH / 2;
            const y2 = targetPos.y + CARD_HEIGHT / 2;

            return (
              <motion.line
                key={r.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={Math.max(1, r.strength * 4)}
                custom={depthLayer}
                variants={lineVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              />
            );
          })}
        </AnimatePresence>

        {/* Animated unit cards via foreignObject */}
        <AnimatePresence mode="popLayout">
          {allIds.map((id) => {
            const unit = units?.find((u) => u.id === id);
            const pos = positions.get(id);
            if (!unit || !pos) return null;

            const depthLayer = unitDepthMap.get(id) ?? 0;

            return (
              <motion.foreignObject
                key={id}
                x={pos.x}
                y={pos.y}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                custom={depthLayer}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="h-full w-full">
                  <UnitCard
                    unit={{
                      id: unit.id,
                      content: unit.content,
                      unitType: unit.unitType,
                      createdAt: new Date(unit.createdAt),
                      lifecycle: (
                        ["draft", "pending", "confirmed", "deferred", "complete"].includes(
                          unit.lifecycle,
                        )
                          ? unit.lifecycle
                          : "draft"
                      ) as
                        | "draft"
                        | "pending"
                        | "confirmed"
                        | "deferred"
                        | "complete",
                      originType: unit.originType ?? undefined,
                      sourceSpan:
                        typeof unit.sourceSpan === "string"
                          ? unit.sourceSpan
                          : null,
                    }}
                    variant="compact"
                    selected={id === localHubId}
                    className="h-full"
                  />
                </div>
              </motion.foreignObject>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
