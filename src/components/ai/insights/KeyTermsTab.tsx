"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { ExtractedTerm } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface KeyTermsTabProps {
  contextId: string;
  sessionId?: string;
  onCreateUnit?: (content: string, type: string) => void;
}

export function KeyTermsTab({ contextId, onCreateUnit }: KeyTermsTabProps) {
  const mutation = api.ai.extractKeyTerms.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Extract Key Terms" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data || mutation.data.length === 0) return null;

  const data: ExtractedTerm[] = mutation.data;

  const importanceColors: Record<string, string> = {
    key: "bg-accent/20 text-accent",
    supporting: "bg-blue-500/20 text-blue-400",
    peripheral: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-2">
      {data.map((term, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{term.term}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${importanceColors[term.importance]}`}
            >
              {term.importance}
            </span>
            {term.suggestDefine && (
              <span className="text-xs text-amber-400">needs definition</span>
            )}
          </div>
          {term.suggestDefine && onCreateUnit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onCreateUnit(`${term.term}: ${term.definition ?? ""}`, "definition")
              }
            >
              Define
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Re-extract
      </Button>
    </div>
  );
}
