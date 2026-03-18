"use client";

import type { UnitType } from "@prisma/client";
import * as LucideIcons from "lucide-react";
import { cn } from "~/lib/utils";
import { UNIT_TYPE_ICONS } from "~/lib/unit-types";

interface UnitTypeBadgeProps {
  unitType: UnitType;
  className?: string;
}

/** Maps unit type to Tailwind token classes for bg and text */
const TYPE_BADGE_STYLES: Record<UnitType, { bg: string; text: string }> = {
  claim:           { bg: "bg-unit-claim-bg",           text: "text-unit-claim-accent" },
  question:        { bg: "bg-unit-question-bg",        text: "text-unit-question-accent" },
  evidence:        { bg: "bg-unit-evidence-bg",        text: "text-unit-evidence-accent" },
  counterargument: { bg: "bg-unit-counterargument-bg", text: "text-unit-counterargument-accent" },
  observation:     { bg: "bg-unit-observation-bg",     text: "text-unit-observation-accent" },
  idea:            { bg: "bg-unit-idea-bg",            text: "text-unit-idea-accent" },
  definition:      { bg: "bg-unit-definition-bg",      text: "text-unit-definition-accent" },
  assumption:      { bg: "bg-unit-assumption-bg",      text: "text-unit-assumption-accent" },
  action:          { bg: "bg-unit-action-bg",          text: "text-unit-action-accent" },
};

/** Formatted display labels */
const TYPE_LABELS: Record<UnitType, string> = {
  claim: "Claim",
  question: "Question",
  evidence: "Evidence",
  counterargument: "Counter",
  observation: "Observation",
  idea: "Idea",
  definition: "Definition",
  assumption: "Assumption",
  action: "Action",
};

function getIcon(unitType: UnitType) {
  const iconName = UNIT_TYPE_ICONS[unitType] as keyof typeof LucideIcons;
  const IconComponent = LucideIcons[iconName] as LucideIcons.LucideIcon;
  return IconComponent;
}

export function UnitTypeBadge({ unitType, className }: UnitTypeBadgeProps) {
  const styles = TYPE_BADGE_STYLES[unitType];
  const label = TYPE_LABELS[unitType];
  const Icon = getIcon(unitType);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styles.bg,
        styles.text,
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}
