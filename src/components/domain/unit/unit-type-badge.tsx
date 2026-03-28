"use client";

import * as React from "react";
import {
  MessageSquare,
  HelpCircle,
  BookOpen,
  Swords,
  Eye,
  Lightbulb,
  BookMarked,
  CircleDashed,
  Zap,
  Shield,
  ArrowUpRight,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

/* ─── Type Config ─── */

export type UnitType =
  | "claim"
  | "question"
  | "evidence"
  | "counterargument"
  | "observation"
  | "idea"
  | "definition"
  | "assumption"
  | "action"
  | "warrant"
  | "backing"
  | "decision";

interface UnitTypeConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind class for background — maps to unit-<type>-bg token */
  bgClass: string;
  /** Tailwind class for accent text — maps to unit-<type>-accent token */
  accentClass: string;
}

const UNIT_TYPE_CONFIG: Record<UnitType, UnitTypeConfig> = {
  claim: {
    label: "Claim",
    icon: MessageSquare,
    bgClass: "bg-unit-claim-bg",
    accentClass: "text-unit-claim-accent",
  },
  question: {
    label: "Question",
    icon: HelpCircle,
    bgClass: "bg-unit-question-bg",
    accentClass: "text-unit-question-accent",
  },
  evidence: {
    label: "Evidence",
    icon: BookOpen,
    bgClass: "bg-unit-evidence-bg",
    accentClass: "text-unit-evidence-accent",
  },
  counterargument: {
    label: "Counter",
    icon: Swords,
    bgClass: "bg-unit-counterargument-bg",
    accentClass: "text-unit-counterargument-accent",
  },
  observation: {
    label: "Observation",
    icon: Eye,
    bgClass: "bg-unit-observation-bg",
    accentClass: "text-unit-observation-accent",
  },
  idea: {
    label: "Idea",
    icon: Lightbulb,
    bgClass: "bg-unit-idea-bg",
    accentClass: "text-unit-idea-accent",
  },
  definition: {
    label: "Definition",
    icon: BookMarked,
    bgClass: "bg-unit-definition-bg",
    accentClass: "text-unit-definition-accent",
  },
  assumption: {
    label: "Assumption",
    icon: CircleDashed,
    bgClass: "bg-unit-assumption-bg",
    accentClass: "text-unit-assumption-accent",
  },
  action: {
    label: "Action",
    icon: Zap,
    bgClass: "bg-unit-action-bg",
    accentClass: "text-unit-action-accent",
  },
  warrant: {
    label: "Warrant",
    icon: Shield,
    bgClass: "bg-unit-evidence-bg",
    accentClass: "text-unit-evidence-accent",
  },
  backing: {
    label: "Backing",
    icon: ArrowUpRight,
    bgClass: "bg-unit-evidence-bg",
    accentClass: "text-unit-evidence-accent",
  },
  decision: {
    label: "Decision",
    icon: CheckSquare,
    bgClass: "bg-unit-action-bg",
    accentClass: "text-unit-action-accent",
  },
};

export function getUnitTypeConfig(type: string): UnitTypeConfig {
  return (
    UNIT_TYPE_CONFIG[type as UnitType] ?? {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      icon: MessageSquare,
      bgClass: "bg-bg-secondary",
      accentClass: "text-text-secondary",
    }
  );
}

/* ─── UnitTypeBadge Component ─── */

interface UnitTypeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: string;
  secondaryType?: string | null;
  size?: "sm" | "md";
}

export function UnitTypeBadge({
  type,
  secondaryType,
  size = "md",
  className,
  ...props
}: UnitTypeBadgeProps) {
  const config = getUnitTypeConfig(type);
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} {...props}>
      {/* Primary badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md font-medium",
          config.bgClass,
          config.accentClass,
          size === "sm" && "px-1.5 py-0.5 text-[10px] leading-tight",
          size === "md" && "px-2 py-1 text-xs",
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          )}
          aria-hidden="true"
        />
        {config.label}
      </span>

      {/* Secondary type — small muted tag */}
      {secondaryType && (
        <SecondaryTag type={secondaryType} />
      )}
    </span>
  );
}

function SecondaryTag({ type }: { type: string }) {
  const config = getUnitTypeConfig(type);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5",
        "text-[10px] leading-tight font-medium",
        "bg-bg-secondary text-text-tertiary",
      )}
    >
      {config.label}
    </span>
  );
}

UnitTypeBadge.displayName = "UnitTypeBadge";

export { UNIT_TYPE_CONFIG };
