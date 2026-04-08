"use client";

import { cn } from "~/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  claim: "#3b82f6",
  evidence: "#10b981",
  question: "#f59e0b",
  concept: "#8b5cf6",
  definition: "#06b6d4",
  note: "#6b7280",
  analogy: "#ec4899",
  example: "#f97316",
  summary: "#14b8a6",
  counter: "#ef4444",
};

const DEFAULT_COLOR = "#9ca3af";

interface PathMiniGraphProps {
  units: Array<{ id: string; content: string; unitType: string }>;
  className?: string;
  activeIndex?: number;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function getDisplayNodes(
  units: PathMiniGraphProps["units"],
): Array<{ unit: PathMiniGraphProps["units"][number]; originalIndex: number } | { ellipsis: true }> {
  if (units.length <= 12) {
    return units.map((unit, i) => ({ unit, originalIndex: i }));
  }
  const head = units.slice(0, 5).map((unit, i) => ({ unit, originalIndex: i }));
  const tail = units.slice(-5).map((unit, i) => ({ unit, originalIndex: units.length - 5 + i }));
  return [...head, { ellipsis: true as const }, ...tail];
}

export function PathMiniGraph({ units, className, activeIndex }: PathMiniGraphProps) {
  if (units.length === 0) {
    return null;
  }

  const displayNodes = getDisplayNodes(units);
  const nodeCount = displayNodes.length;
  const padding = 16;
  const nodeRadius = 6;
  const activeRadius = 9;
  const viewBoxWidth = Math.max(nodeCount * 40, 120);
  const viewBoxHeight = 48;
  const usableWidth = viewBoxWidth - padding * 2;
  const spacing = nodeCount > 1 ? usableWidth / (nodeCount - 1) : 0;
  const cy = viewBoxHeight / 2;

  return (
    <div
      className={cn(
        "bg-bg-secondary rounded-lg border border-border px-2 py-1",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height={48}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Path mini graph"
      >
        {/* Connecting lines */}
        {displayNodes.map((node, i) => {
          if (i === 0) return null;
          const prev = displayNodes[i - 1];
          if (!prev) return null;
          const isEllipsisPair =
            ("ellipsis" in node) || ("ellipsis" in prev);

          const x1 = padding + (i - 1) * spacing;
          const x2 = padding + i * spacing;

          return (
            <line
              key={`line-${i}`}
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke={isEllipsisPair ? "#d1d5db" : "#9ca3af"}
              strokeWidth={isEllipsisPair ? 1 : 1.5}
              strokeDasharray={isEllipsisPair ? "2 2" : undefined}
            />
          );
        })}

        {/* Nodes */}
        {displayNodes.map((node, i) => {
          const cx = padding + i * spacing;

          if ("ellipsis" in node) {
            return (
              <g key="ellipsis">
                {[0, 6, 12].map((offset) => (
                  <circle
                    key={offset}
                    cx={cx - 6 + offset}
                    cy={cy}
                    r={1.5}
                    fill="#9ca3af"
                  />
                ))}
              </g>
            );
          }

          const { unit, originalIndex } = node;
          const isActive = activeIndex !== undefined && originalIndex === activeIndex;
          const color = TYPE_COLORS[unit.unitType] ?? DEFAULT_COLOR;
          const r = isActive ? activeRadius : nodeRadius;

          return (
            <g key={unit.id}>
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 3}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                stroke={isActive ? "#fff" : "none"}
                strokeWidth={isActive ? 1.5 : 0}
              >
                <title>{truncate(unit.content, 30)}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
