"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Loader2,
  Sparkles,
  Eye,
  ArrowLeftRight,
  Link2,
  TrendingUp,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface ReflectionPrompt {
  question: string;
  category: "assumption" | "opposite" | "connection" | "consequence" | "evidence" | "reframe";
  targetUnitId?: string;
  rationale: string;
}

interface ReflectionPromptsProps {
  contextId: string;
  onNavigateToUnit?: (unitId: string) => void;
  onCreateUnit?: (content: string, type: string) => void;
  className?: string;
}

// ─── Category Metadata ──────────────────────────────────────────────

const categoryMeta: Record<
  ReflectionPrompt["category"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  assumption: {
    label: "Hidden Assumption",
    icon: <Eye className="h-4 w-4" />,
    color: "bg-amber-500/20 text-amber-400",
  },
  opposite: {
    label: "Opposite View",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: "bg-red-500/20 text-red-400",
  },
  connection: {
    label: "Connection",
    icon: <Link2 className="h-4 w-4" />,
    color: "bg-green-500/20 text-green-400",
  },
  consequence: {
    label: "Consequence",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-purple-500/20 text-purple-400",
  },
  evidence: {
    label: "Evidence",
    icon: <Search className="h-4 w-4" />,
    color: "bg-blue-500/20 text-blue-400",
  },
  reframe: {
    label: "Reframe",
    icon: <RefreshCw className="h-4 w-4" />,
    color: "bg-cyan-500/20 text-cyan-400",
  },
};

// ─── Component ───────────────────────────────────────────────────────

export function ReflectionPrompts({
  contextId,
  onNavigateToUnit,
  onCreateUnit,
  className,
}: ReflectionPromptsProps) {
  const mutation = api.feedback.getReflectionPrompts.useMutation();

  const handleGenerate = () => {
    mutation.mutate({ contextId });
  };

  // Initial state: show generate button
  if (!mutation.data && !mutation.isPending) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8", className)}>
        <p className="text-sm text-text-secondary mb-4 text-center max-w-xs">
          Generate AI-powered reflection prompts to deepen your thinking
          about the ideas in this context.
        </p>
        <Button onClick={handleGenerate}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Reflections
        </Button>
      </div>
    );
  }

  // Loading state
  if (mutation.isPending) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">Generating reflection prompts</span>
      </div>
    );
  }

  // Error state
  if (mutation.error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-red-400 mb-3">
          Failed to generate reflection prompts.
        </p>
        <Button variant="outline" size="sm" onClick={handleGenerate}>
          Try Again
        </Button>
      </div>
    );
  }

  const prompts = mutation.data ?? [];

  if (prompts.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-text-secondary">
          No reflection prompts could be generated. Add more units to this context first.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {prompts.map((prompt, i) => {
        const meta = categoryMeta[prompt.category];

        return (
          <article
            key={i}
            className="rounded-lg border border-border bg-bg-secondary p-4 transition-colors hover:border-border/80"
          >
            {/* Category badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                  meta.color,
                )}
              >
                {meta.icon}
                {meta.label}
              </span>
            </div>

            {/* Question */}
            <p className="text-sm font-medium text-text-primary leading-relaxed mb-2">
              {prompt.question}
            </p>

            {/* Rationale */}
            <p className="text-xs text-text-secondary leading-relaxed">
              {prompt.rationale}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {prompt.targetUnitId && onNavigateToUnit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToUnit(prompt.targetUnitId!)}
                  className="text-xs"
                >
                  View Related Unit
                </Button>
              )}
              {onCreateUnit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateUnit(prompt.question, "question")}
                  className="text-xs"
                >
                  Add as Question
                </Button>
              )}
            </div>
          </article>
        );
      })}

      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={handleGenerate}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate More
        </Button>
      </div>
    </div>
  );
}
