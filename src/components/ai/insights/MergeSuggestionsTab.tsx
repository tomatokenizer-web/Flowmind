"use client";

import * as React from "react";
import { Merge, CheckCircle2 } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { MergeSuggestion } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface MergeSuggestionsTabProps {
  contextId: string;
  sessionId?: string;
}

export function MergeSuggestionsTab({ contextId }: MergeSuggestionsTabProps) {
  const mutation = api.ai.suggestMerge.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Find Merge Candidates" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data || mutation.data.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <p className="text-sm text-text-secondary">No merge candidates found</p>
        <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })} className="mt-4">
          Re-scan
        </Button>
      </div>
    );
  }

  const data: MergeSuggestion[] = mutation.data;

  return (
    <div className="space-y-3">
      {data.map((m, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <Merge className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              Merge {m.unitIds.length} units
            </span>
            <span className="text-xs text-text-secondary">
              ({Math.round(m.confidence * 100)}% confidence)
            </span>
          </div>
          <p className="text-sm mb-2">{m.rationale}</p>
          <div className="p-2 rounded bg-bg-primary border border-border text-sm">
            <div className="text-xs text-text-secondary mb-1">
              Merged content preview:
            </div>
            {m.mergedContent}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Re-scan
      </Button>
    </div>
  );
}
