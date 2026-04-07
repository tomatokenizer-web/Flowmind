"use client";

import * as React from "react";
import { Merge, CheckCircle2, Loader2, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { Button } from "~/components/ui/button";
import type { MergeSuggestion } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface MergeSuggestionsTabProps {
  contextId: string;
  sessionId?: string;
}

export function MergeSuggestionsTab({ contextId }: MergeSuggestionsTabProps) {
  const mutation = api.ai.suggestMerge.useMutation();
  const [approvedIndexes, setApprovedIndexes] = React.useState<Set<number>>(new Set());

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
        <MergeSuggestionCard
          key={i}
          suggestion={m}
          index={i}
          approved={approvedIndexes.has(i)}
          onApproved={() => setApprovedIndexes((prev) => new Set(prev).add(i))}
        />
      ))}
      <Button variant="outline" size="sm" onClick={() => { setApprovedIndexes(new Set()); mutation.mutate({ contextId }); }}>
        Re-scan
      </Button>
    </div>
  );
}

// ─── Single Suggestion Card ──────────────────────────────────────────

function MergeSuggestionCard({
  suggestion,
  index,
  approved,
  onApproved,
}: {
  suggestion: MergeSuggestion;
  index: number;
  approved: boolean;
  onApproved: () => void;
}) {
  const utils = api.useUtils();

  const mergeMutation = api.relation.merge.useMutation({
    onSuccess: () => {
      void utils.context.getUnitsForContext.invalidate();
      void utils.context.list.invalidate();
    },
  });

  const updateUnitMutation = api.unit.update.useMutation();

  const [merging, setMerging] = React.useState(false);

  const handleApprove = async () => {
    if (suggestion.unitIds.length < 2) return;
    setMerging(true);

    try {
      // Merge all units into the first one sequentially
      const targetId = suggestion.unitIds[0]!;

      for (let i = 1; i < suggestion.unitIds.length; i++) {
        await mergeMutation.mutateAsync({
          sourceUnitId: suggestion.unitIds[i]!,
          targetUnitId: targetId,
          keepContent: "target",
        });
      }

      // Update target content to AI's merged content
      await updateUnitMutation.mutateAsync({
        id: targetId,
        content: suggestion.mergedContent,
      });

      toast.success("Units merged", {
        description: `${suggestion.unitIds.length} units merged into one`,
      });
      onApproved();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Merge failed";
      toast.error("Failed to merge units", { description: msg });
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-bg-secondary">
      <div className="flex items-center gap-2 mb-2">
        <Merge className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">
          Merge {suggestion.unitIds.length} units
        </span>
        <span className="text-xs text-text-secondary">
          ({Math.round(suggestion.confidence * 100)}% confidence)
        </span>
      </div>
      <p className="text-sm mb-2">{suggestion.rationale}</p>
      <div className="p-2 rounded bg-bg-primary border border-border text-sm mb-3">
        <div className="text-xs text-text-secondary mb-1">
          Merged content preview:
        </div>
        {suggestion.mergedContent}
      </div>

      {approved ? (
        <div className="flex items-center gap-2 text-sm text-accent-primary font-medium">
          <Check className="h-4 w-4" />
          Merged
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={merging}
        >
          {merging ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Merging...
            </>
          ) : (
            "Approve & Merge"
          )}
        </Button>
      )}
    </div>
  );
}
