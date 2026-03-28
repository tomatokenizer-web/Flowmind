"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";
import type { TooltipTarget } from "./graph-types";
import {
  UNIT_TYPE_ACCENT_COLORS,
  UNIT_TYPE_BG_COLORS,
  LAYER_EDGE_COLORS,
  DEFAULT_EDGE_COLOR,
  DEFAULT_NODE_COLOR,
} from "./graph-types";

/* ─── Props ─── */

interface GraphTooltipProps {
  target: TooltipTarget;
  containerRect: DOMRect | null;
}

/* ─── Component ─── */

export function GraphTooltip({ target, containerRect }: GraphTooltipProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !target || !containerRect) return null;

  const offsetX = 12;
  const offsetY = -8;

  // Position relative to viewport
  const left = containerRect.left + target.x + offsetX;
  const top = containerRect.top + target.y + offsetY;

  const tooltip = (
    <div
      className={cn(
        "fixed z-[9999] pointer-events-none",
        "rounded-lg px-3 py-2 shadow-elevated",
        "text-sm leading-relaxed",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        maxWidth: 280,
        transform: "translateY(-100%)",
      }}
      role="tooltip"
    >
      {target.kind === "node" && <NodeTooltipContent node={target.node} />}
      {target.kind === "edge" && <EdgeTooltipContent edge={target.edge} />}
    </div>
  );

  return createPortal(tooltip, document.body);
}

/* ─── Node Tooltip ─── */

function NodeTooltipContent({ node }: { node: NonNullable<Extract<TooltipTarget, { kind: "node" }>>["node"] }) {
  const accentColor = UNIT_TYPE_ACCENT_COLORS[node.primaryType] ?? DEFAULT_NODE_COLOR;
  const bgColor = UNIT_TYPE_BG_COLORS[node.primaryType] ?? "var(--bg-secondary)";

  return (
    <div className="flex flex-col gap-1.5">
      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize"
          style={{ backgroundColor: bgColor, color: accentColor }}
        >
          {node.primaryType}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {node.relationCount} relation{node.relationCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content preview */}
      <p
        className="text-xs leading-relaxed line-clamp-3"
        style={{ color: "var(--text-primary)" }}
      >
        {node.content}
      </p>

      {/* Salience bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          ThoughtRank
        </span>
        <div
          className="flex-1 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(node.thoughtRank * 100)}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {Math.round(node.thoughtRank * 100)}%
        </span>
      </div>
    </div>
  );
}

/* ─── Edge Tooltip ─── */

function EdgeTooltipContent({ edge }: { edge: NonNullable<Extract<TooltipTarget, { kind: "edge" }>>["edge"] }) {
  const layerColor = LAYER_EDGE_COLORS[edge.layer] ?? DEFAULT_EDGE_COLOR;

  return (
    <div className="flex flex-col gap-1">
      {/* Relation type */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize"
          style={{
            backgroundColor: `${layerColor}20`,
            color: layerColor,
          }}
        >
          {edge.type.replace(/_/g, " ")}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {edge.layer}
        </span>
      </div>

      {/* Strength */}
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          Strength
        </span>
        <div
          className="flex-1 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(edge.strength * 100)}%`,
              backgroundColor: layerColor,
            }}
          />
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {Math.round(edge.strength * 100)}%
        </span>
      </div>

      {/* Direction */}
      <span className="text-[10px] capitalize" style={{ color: "var(--text-tertiary)" }}>
        {edge.direction === "bidirectional" ? "Bidirectional" : "Directed"}
        {edge.purpose.length > 0 ? ` \u00b7 ${edge.purpose.join(", ")}` : ""}
      </span>
    </div>
  );
}

GraphTooltip.displayName = "GraphTooltip";
