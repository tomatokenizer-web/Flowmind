"use client";

import * as React from "react";
import {
  Type,
  Brain,
  GitBranch,
  Clock,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { ParsedQuery, SearchLayer } from "~/hooks/use-search";

/* ─── Layer Config ─── */

interface LayerConfig {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}

const LAYER_CONFIG: Record<SearchLayer, LayerConfig> = {
  text: {
    icon: Type,
    label: "Text",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  semantic: {
    icon: Brain,
    label: "Semantic",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  structure: {
    icon: GitBranch,
    label: "Structure",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  temporal: {
    icon: Clock,
    label: "Temporal",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
  },
};

/* ─── Types ─── */

interface SearchInterpretationProps {
  interpretation: ParsedQuery;
  onClickChip?: (layer: SearchLayer, value: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function SearchInterpretation({
  interpretation,
  onClickChip,
  className,
}: SearchInterpretationProps) {
  const { textKeywords, semanticConcepts, structureFilters, temporalRange } =
    interpretation;

  const hasAny =
    textKeywords.length > 0 ||
    semanticConcepts.length > 0 ||
    structureFilters.length > 0 ||
    temporalRange !== null;

  if (!hasAny) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Search query interpretation"
    >
      <span className="text-[10px] text-text-tertiary uppercase tracking-wider mr-1 shrink-0">
        Parsed as
      </span>

      {/* Text layer chips */}
      {textKeywords.map((kw) => (
        <InterpretationChip
          key={`text-${kw}`}
          layer="text"
          value={kw}
          onClick={onClickChip}
        />
      ))}

      {/* Semantic layer chips */}
      {semanticConcepts.map((concept) => (
        <InterpretationChip
          key={`semantic-${concept}`}
          layer="semantic"
          value={concept}
          onClick={onClickChip}
        />
      ))}

      {/* Structure layer chips */}
      {structureFilters.map((filter) => (
        <InterpretationChip
          key={`structure-${filter.id}`}
          layer="structure"
          value={filter.label}
          onClick={onClickChip}
        />
      ))}

      {/* Temporal layer chip */}
      {temporalRange && (
        <InterpretationChip
          layer="temporal"
          value={
            temporalRange.since && temporalRange.until
              ? `${temporalRange.since} - ${temporalRange.until}`
              : temporalRange.since
                ? `Since ${temporalRange.since}`
                : `Until ${temporalRange.until}`
          }
          onClick={onClickChip}
        />
      )}
    </div>
  );
}

/* ─── Chip Subcomponent ─── */

function InterpretationChip({
  layer,
  value,
  onClick,
}: {
  layer: SearchLayer;
  value: string;
  onClick?: (layer: SearchLayer, value: string) => void;
}) {
  const config = LAYER_CONFIG[layer];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onClick?.(layer, value)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
        "text-[11px] font-medium leading-tight",
        "transition-all duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        config.bgColor,
        config.color,
        onClick && "cursor-pointer hover:brightness-110",
        !onClick && "cursor-default",
      )}
      aria-label={`${config.label} layer: ${value}`}
      disabled={!onClick}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[180px]">{value}</span>
    </button>
  );
}

SearchInterpretation.displayName = "SearchInterpretation";
