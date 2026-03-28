"use client";

import * as React from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Layer color map ─── */

const LAYER_COLORS: Record<string, { bg: string; text: string }> = {
  L1: { bg: "rgba(59,130,246,0.12)", text: "rgb(59,130,246)" },   // blue
  L2: { bg: "rgba(34,197,94,0.12)", text: "rgb(34,197,94)" },     // green
  L3: { bg: "rgba(249,115,22,0.12)", text: "rgb(249,115,22)" },   // orange
  L4: { bg: "rgba(168,85,247,0.12)", text: "rgb(168,85,247)" },   // purple
  L5: { bg: "rgba(20,184,166,0.12)", text: "rgb(20,184,166)" },   // teal
  L6: { bg: "rgba(236,72,153,0.12)", text: "rgb(236,72,153)" },   // pink
  L7: { bg: "rgba(234,179,8,0.12)", text: "rgb(234,179,8)" },     // yellow
  L8: { bg: "rgba(239,68,68,0.12)", text: "rgb(239,68,68)" },     // red
};

const DEFAULT_LAYER_COLOR = { bg: "var(--bg-secondary)", text: "var(--text-secondary)" };

/* ─── Types ─── */

interface RelationBadgeProps {
  /** The relation type name (e.g. "supports", "contradicts") */
  type: string;
  /** The layer key (e.g. "L1", "L2") */
  layer?: string;
  /** Whether the relation is bidirectional */
  bidirectional?: boolean;
  /** Target unit name or content for tooltip */
  targetLabel?: string;
  /** Click handler (e.g. navigate to connected unit) */
  onClick?: () => void;
  className?: string;
}

/* ─── Component ─── */

export function RelationBadge({
  type,
  layer,
  bidirectional = false,
  targetLabel,
  onClick,
  className,
}: RelationBadgeProps) {
  const colors = (layer ? LAYER_COLORS[layer] : undefined) ?? DEFAULT_LAYER_COLOR;

  const DirectionIcon = bidirectional ? ArrowLeftRight : ArrowRight;

  const tooltipContent = targetLabel
    ? `${type} → ${targetLabel}`
    : type;

  const badge = (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
        "text-xs font-medium leading-none whitespace-nowrap",
        "transition-all duration-fast",
        onClick && "cursor-pointer hover:brightness-95 active:brightness-90",
        !onClick && "cursor-default",
        className,
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      aria-label={`Relation: ${type}${targetLabel ? ` to ${targetLabel}` : ""}`}
    >
      <DirectionIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="capitalize">{type.replace(/_/g, " ")}</span>
    </button>
  );

  if (targetLabel) {
    return (
      <SimpleTooltip content={tooltipContent}>
        {badge}
      </SimpleTooltip>
    );
  }

  return badge;
}

export { LAYER_COLORS };
