"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useGraphStore } from "~/stores/graphStore";
import { UnitCard } from "~/components/unit/unit-card";
import { Button } from "~/components/ui/button";

// ─── Relation category → line color ──────────────────────────────

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

// ─── Grid layout constants ───────────────────────────────────────

const CARD_WIDTH = 280;
const CARD_HEIGHT = 160;
const GAP = 40;

export function LocalCardArray() {
  const localHubId = useGraphStore((s) => s.localHubId);
  const localDepth = useGraphStore((s) => s.localDepth);
  const setLocalDepth = useGraphStore((s) => s.setLocalDepth);
  const setLayer = useGraphStore((s) => s.setLayer);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  // Fetch relations for hub unit
  const { data: relations } = api.relation.listByUnit.useQuery(
    { unitId: localHubId!, contextId: activeContextId ?? undefined },
    { enabled: !!localHubId },
  );

  // Collect neighbor IDs (depth 1 for now — deeper requires recursive queries)
  const neighborIds = React.useMemo(() => {
    if (!relations || !localHubId) return [];
    const ids = new Set<string>();
    for (const r of relations) {
      if (r.sourceUnitId !== localHubId) ids.add(r.sourceUnitId);
      if (r.targetUnitId !== localHubId) ids.add(r.targetUnitId);
    }
    return Array.from(ids);
  }, [relations, localHubId]);

  // Fetch all neighbor units + hub unit
  const allIds = React.useMemo(
    () => (localHubId ? [localHubId, ...neighborIds] : []),
    [localHubId, neighborIds],
  );

  const { data: units } = api.unit.list.useQuery(
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

  // Layout: hub in center, neighbors in a ring
  const hubUnit = units?.find((u) => u.id === localHubId);
  const neighborUnits = units?.filter((u) => u.id !== localHubId) ?? [];

  // Calculate positions
  const positions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!localHubId) return map;

    // SVG center
    const cx = 600;
    const cy = 400;

    map.set(localHubId, { x: cx - CARD_WIDTH / 2, y: cy - CARD_HEIGHT / 2 });

    const count = neighborUnits.length;
    const radius = Math.max(220, count * 30);

    neighborUnits.forEach((u, i) => {
      const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius - CARD_WIDTH / 2;
      const y = cy + Math.sin(angle) * radius - CARD_HEIGHT / 2;
      map.set(u.id, { x, y });
    });

    return map;
  }, [localHubId, neighborUnits]);

  // SVG dimensions
  const svgWidth = 1200;
  const svgHeight = 800;

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
      </div>

      {/* SVG with cards and lines */}
      <svg
        width={svgWidth}
        height={svgHeight}
        className="mx-auto rounded-lg border border-border bg-bg-secondary"
      >
        {/* Relation lines */}
        {relations?.map((r) => {
          const sourcePos = positions.get(r.sourceUnitId);
          const targetPos = positions.get(r.targetUnitId);
          if (!sourcePos || !targetPos) return null;

          const category = getRelationCategory(r.type);
          const color = CATEGORY_COLORS[category] ?? "#6B7280";

          return (
            <line
              key={r.id}
              x1={sourcePos.x + CARD_WIDTH / 2}
              y1={sourcePos.y + CARD_HEIGHT / 2}
              x2={targetPos.x + CARD_WIDTH / 2}
              y2={targetPos.y + CARD_HEIGHT / 2}
              stroke={color}
              strokeWidth={Math.max(1, r.strength * 4)}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* Unit cards via foreignObject */}
        {allIds.map((id) => {
          const unit = units?.find((u) => u.id === id);
          const pos = positions.get(id);
          if (!unit || !pos) return null;

          return (
            <foreignObject
              key={id}
              x={pos.x}
              y={pos.y}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
            >
              <div className="h-full w-full">
                <UnitCard
                  unit={{
                    ...unit,
                    createdAt: new Date(unit.createdAt),
                    lifecycle: unit.lifecycle as "draft" | "pending" | "confirmed" | "deferred" | "complete" | "archived" | "discarded",
                  }}
                  variant="compact"
                  selected={id === localHubId}
                  className="h-full"
                />
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
