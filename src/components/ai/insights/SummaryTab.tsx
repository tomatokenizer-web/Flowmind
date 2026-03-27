"use client";

import * as React from "react";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { api } from "~/trpc/react";
import type { ContextSummary } from "~/server/ai";
import { Section, LoadingState, EmptyState, AIErrorState } from "./shared";

interface SummaryTabProps {
  contextId: string;
  sessionId?: string;
}

export function SummaryTab({ contextId }: SummaryTabProps) {
  const summaryQuery = api.ai.summarizeContext.useQuery(
    { contextId },
    { retry: false }
  );

  if (summaryQuery.isLoading) return <LoadingState />;
  if (summaryQuery.error) return <AIErrorState message={summaryQuery.error.message} />;
  if (!summaryQuery.data) return <EmptyState message="Loading summary..." />;

  const data: ContextSummary = summaryQuery.data;

  return (
    <div className="space-y-4">
      <Section title="Main Thesis">
        <p className="text-sm">{data.mainThesis}</p>
      </Section>

      <Section title="Key Points">
        <ul className="space-y-1">
          {data.keyPoints.map((point, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="text-accent">•</span>
              {point}
            </li>
          ))}
        </ul>
      </Section>

      {data.openQuestions.length > 0 && (
        <Section title="Open Questions">
          <ul className="space-y-1">
            {data.openQuestions.map((q, i) => (
              <li key={i} className="text-sm flex gap-2 text-amber-500">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.conflictingViews.length > 0 && (
        <Section title="Conflicting Views">
          <ul className="space-y-1">
            {data.conflictingViews.map((v, i) => (
              <li key={i} className="text-sm flex gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {v}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
