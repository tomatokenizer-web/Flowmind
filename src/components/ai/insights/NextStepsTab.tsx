"use client";

import * as React from "react";
import { Target } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { NextStepSuggestion } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface NextStepsTabProps {
  contextId: string;
  sessionId?: string;
}

export function NextStepsTab({ contextId }: NextStepsTabProps) {
  const mutation = api.ai.suggestNextSteps.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Suggest Next Steps" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data || mutation.data.length === 0) return null;

  const data: NextStepSuggestion[] = mutation.data;

  const priorityColors: Record<string, string> = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-3">
      {data.map((step, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-accent" />
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[step.priority]}`}
            >
              {step.priority}
            </span>
            <span className="text-xs text-text-secondary">{step.type}</span>
          </div>
          <p className="text-sm mb-1">{step.action}</p>
          <p className="text-xs text-text-secondary">{step.rationale}</p>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Refresh
      </Button>
    </div>
  );
}
