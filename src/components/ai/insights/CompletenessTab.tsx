"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { CompletenessAnalysis } from "~/server/ai";
import { Section, LoadingState, AIErrorState, RunButton } from "./shared";

interface CompletenessTabProps {
  contextId: string;
  sessionId?: string;
}

export function CompletenessTab({ contextId }: CompletenessTabProps) {
  const mutation = api.ai.analyzeCompleteness.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Analyze Completeness" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data) return null;

  const data: CompletenessAnalysis = mutation.data;

  const scoreColor =
    data.score >= 0.7
      ? "text-green-500"
      : data.score >= 0.4
        ? "text-amber-500"
        : "text-red-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-bold ${scoreColor}`}>
          {Math.round(data.score * 100)}%
        </div>
        <div className="text-sm text-text-secondary">Completeness Score</div>
      </div>

      {data.missingElements.length > 0 && (
        <Section title="Missing Elements">
          <ul className="space-y-2">
            {data.missingElements.map((el, i) => (
              <li
                key={i}
                className="text-sm p-2 rounded bg-bg-secondary border border-border"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      el.priority === "high"
                        ? "bg-red-500/20 text-red-400"
                        : el.priority === "medium"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {el.priority}
                  </span>
                  <span className="text-text-secondary">{el.type}</span>
                </div>
                <p className="mt-1">{el.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.suggestions.length > 0 && (
        <Section title="Suggestions">
          <ul className="space-y-1">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-sm flex gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Re-analyze
      </Button>
    </div>
  );
}
