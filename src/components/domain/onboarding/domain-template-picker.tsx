"use client";

import * as React from "react";
import {
  FlaskConical,
  Scale,
  BookOpen,
  Briefcase,
  GraduationCap,
  Wrench,
  PenTool,
  BookHeart,
  Layers,
} from "lucide-react";
import { cn } from "~/lib/utils";

/* ─── Types ─── */

interface DomainTemplatePickerProps {
  selected: string;
  onSelect: (template: string) => void;
  /** Compact mode for onboarding wizard */
  compact?: boolean;
  className?: string;
}

interface TemplateConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  exampleTypes: string[];
}

/* ─── Template data ─── */

const TEMPLATES: TemplateConfig[] = [
  {
    id: "general",
    name: "General",
    icon: Layers,
    description: "No domain-specific types. A blank canvas for any thinking.",
    exampleTypes: ["Note", "Claim", "Question", "Evidence"],
  },
  {
    id: "science",
    name: "Science",
    icon: FlaskConical,
    description: "Hypotheses, experiments, observations, and findings.",
    exampleTypes: ["Hypothesis", "Observation", "Method", "Result"],
  },
  {
    id: "law",
    name: "Law",
    icon: Scale,
    description: "Legal arguments, precedents, statutes, and analysis.",
    exampleTypes: ["Argument", "Precedent", "Statute", "Analysis"],
  },
  {
    id: "philosophy",
    name: "Philosophy",
    icon: BookOpen,
    description: "Theses, objections, thought experiments, and definitions.",
    exampleTypes: ["Thesis", "Objection", "Definition", "Argument"],
  },
  {
    id: "business",
    name: "Business",
    icon: Briefcase,
    description: "Strategy, market analysis, decisions, and metrics.",
    exampleTypes: ["Strategy", "Decision", "Metric", "Insight"],
  },
  {
    id: "academic",
    name: "Academic",
    icon: GraduationCap,
    description: "Literature review, citations, methodology, and findings.",
    exampleTypes: ["Citation", "Finding", "Method", "Gap"],
  },
  {
    id: "technical",
    name: "Technical",
    icon: Wrench,
    description: "Architecture decisions, requirements, and specifications.",
    exampleTypes: ["Requirement", "Decision", "Spec", "Trade-off"],
  },
  {
    id: "narrative",
    name: "Narrative",
    icon: PenTool,
    description: "Characters, plot points, themes, and scenes.",
    exampleTypes: ["Character", "Scene", "Theme", "Plot Point"],
  },
  {
    id: "journal",
    name: "Journal",
    icon: BookHeart,
    description: "Reflections, insights, gratitudes, and daily notes.",
    exampleTypes: ["Reflection", "Insight", "Gratitude", "Plan"],
  },
];

/* ─── Component ─── */

export function DomainTemplatePicker({
  selected,
  onSelect,
  compact = false,
  className,
}: DomainTemplatePickerProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3",
        className,
      )}
      role="radiogroup"
      aria-label="Domain template selection"
    >
      {TEMPLATES.map((template) => {
        const isSelected = selected === template.id;
        return (
          <button
            key={template.id}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(template.id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-card border p-3 text-left transition-all duration-fast",
              isSelected
                ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary"
                : "border-border bg-bg-surface hover:bg-bg-hover hover:border-text-tertiary",
              compact && "p-2.5",
            )}
          >
            <div className="flex items-center gap-2">
              <template.icon
                className={cn(
                  "shrink-0",
                  compact ? "h-4 w-4" : "h-5 w-5",
                  isSelected ? "text-accent-primary" : "text-text-tertiary",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "font-semibold",
                  compact ? "text-xs" : "text-sm",
                  isSelected ? "text-accent-primary" : "text-text-primary",
                )}
              >
                {template.name}
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-text-secondary leading-relaxed">
                {template.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {template.exampleTypes.slice(0, compact ? 2 : 4).map((type) => (
                <span
                  key={type}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    isSelected
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "bg-bg-secondary text-text-tertiary",
                  )}
                >
                  {type}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
