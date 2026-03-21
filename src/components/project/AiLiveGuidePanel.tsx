"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface AiLiveGuidePanelProps {
  projectId: string;
  className?: string;
}

export function AiLiveGuidePanel({ projectId, className }: AiLiveGuidePanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const { data: project } = api.project.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  const { data: gaps } = api.project.getGaps.useQuery(
    { projectId },
    { enabled: !!projectId && !!project?.templateId },
  );

  // Don't render if there is no template
  if (!project?.templateId || !project.template) return null;

  const templateConfig = project.template.config as {
    scaffoldQuestions?: Array<{ type: string; content: string; placeholder?: boolean }>;
    description?: string;
    aiGuidePrompts?: string[];
  } | null;

  const scaffoldQuestions = templateConfig?.scaffoldQuestions ?? [];
  const total = scaffoldQuestions.length;

  // If no scaffold questions, nothing to show
  if (total === 0) return null;

  const answered = gaps?.answered ?? [];
  const unanswered = gaps?.unanswered ?? [];
  const completeness = gaps?.completeness ?? 0;
  const allDone = unanswered.length === 0;

  // Collapse automatically when all scaffolds are fulfilled
  const isEffectivelyCollapsed = allDone || collapsed;

  // Suggestions: first 3 unanswered questions
  const suggestions = unanswered.slice(0, 3);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-primary shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-accent-primary" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary truncate">
                {project.template.name}
              </span>
              {allDone && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Complete
                </span>
              )}
            </div>
            {/* Progress line */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-24 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    allDone ? "bg-green-500" : "bg-accent-primary",
                  )}
                  style={{ width: `${Math.round(completeness * 100)}%` }}
                />
              </div>
              <span className="text-xs text-text-tertiary">
                {answered.length}/{total} complete
              </span>
            </div>
          </div>
        </div>
        {isEffectivelyCollapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-tertiary" />
        )}
      </button>

      {/* Body */}
      {!isEffectivelyCollapsed && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Template description if present */}
          {templateConfig?.description && (
            <p className="text-xs text-text-secondary">{templateConfig.description}</p>
          )}

          {/* What to work on next */}
          {suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                What to work on next
              </p>
              <ul className="space-y-1.5">
                {suggestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Answered items (collapsed summary) */}
          {answered.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Answered ({answered.length})
              </p>
              <ul className="space-y-1">
                {answered.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-tertiary line-through">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500 no-underline" style={{ textDecoration: "none" }} />
                    <span style={{ textDecoration: "line-through" }}>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* All done state */}
      {allDone && !collapsed && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-text-secondary">
            All scaffold questions are answered. Your project foundation is complete.
          </p>
        </div>
      )}
    </div>
  );
}
