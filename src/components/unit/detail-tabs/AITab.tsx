"use client";

import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { ExternalKnowledgePanel } from "~/components/ai/ExternalKnowledgePanel";
import { toast } from "~/lib/toast";
import { useAIIntensity, isAtLeastBalanced, isProactive } from "~/hooks/useAIIntensity";

interface AITabProps {
  unitId: string;
  content: string;
  branchPotential?: number;
  onContentChange?: (c: string) => void;
  onAddAsUnit?: (content: string) => void;
}

export function AITab({ unitId, content, branchPotential, onContentChange, onAddAsUnit }: AITabProps) {
  const filled = Math.round((branchPotential ?? 0) * 4);
  const utils = api.useUtils();
  const { level: aiLevel } = useAIIntensity();
  const showAISections = isAtLeastBalanced(aiLevel);
  const showBranchPotential = isProactive(aiLevel);

  const suggestTypeMutation = api.ai.suggestType.useMutation({
    onError: (err) => {
      toast.error("AI suggestion failed", { description: err.message });
    },
  });
  const refineMutation = api.ai.refineUnit.useMutation({
    onError: (err) => {
      toast.error("AI refinement failed", { description: err.message });
    },
  });
  const updateMutation = api.unit.update.useMutation({
    onSuccess: (updated) => {
      void utils.unit.getById.invalidate({ id: unitId });
      void utils.unit.list.invalidate();
      onContentChange?.(updated.content);
      refineMutation.reset();
    },
    onError: (err) => {
      toast.error("Failed to save changes", { description: err.message });
    },
  });

  if (!showAISections) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-sm text-text-secondary">
            AI suggestions are disabled in Minimal mode.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Change your AI intensity in Settings to enable automatic suggestions.
          </p>
        </div>
        {branchPotential !== undefined && (
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm text-text-secondary">Branch Potential</span>
            <span className="inline-flex items-center gap-0.5" aria-label={`Branch potential: ${filled} of 4`}>
              {Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-base leading-none",
                    i < filled ? "text-accent-primary" : "text-text-tertiary",
                  )}
                  aria-hidden="true"
                >
                  {i < filled ? "●" : "○"}
                </span>
              ))}
            </span>
          </div>
        )}
        <ExternalKnowledgePanel
          unitId={unitId}
          unitContent={content}
          onAddAsUnit={onAddAsUnit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Type suggestion */}
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">AI Type Suggestion</p>
        {suggestTypeMutation.data ? (
          <div className="text-sm text-text-primary">
            Suggested: <strong>{suggestTypeMutation.data.suggestion?.unitType}</strong>
            <span className="ml-2 text-text-tertiary">({Math.round((suggestTypeMutation.data.suggestion?.confidence ?? 0) * 100)}% confidence)</span>
            <p className="mt-1 text-xs text-text-secondary">{suggestTypeMutation.data.suggestion?.reasoning}</p>
          </div>
        ) : (
          <button
            onClick={() => { if (content?.trim()) suggestTypeMutation.mutate({ content }); }}
            disabled={suggestTypeMutation.isPending || !content?.trim()}
            className="text-sm text-accent-primary hover:underline disabled:opacity-50"
          >
            {suggestTypeMutation.isPending ? "Analyzing..." : "Suggest type for this unit"}
          </button>
        )}
      </div>

      {/* Refine unit */}
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">AI Refinement</p>
        {refineMutation.data ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-bg-secondary p-2 text-xs text-text-secondary line-through">{refineMutation.data.original.slice(0, 100)}</div>
            <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/20 p-2 text-sm text-text-primary">{refineMutation.data.refined}</div>
            <div className="flex gap-2">
              <button onClick={() => updateMutation.mutate({ id: unitId, content: refineMutation.data!.refined })}
                className="text-xs text-accent-primary hover:underline">Accept</button>
              <button onClick={() => refineMutation.reset()} className="text-xs text-text-tertiary hover:underline">Discard</button>
            </div>
          </div>
        ) : (
          <button onClick={() => refineMutation.mutate({ unitId, content })} disabled={refineMutation.isPending}
            className="text-sm text-accent-primary hover:underline disabled:opacity-50">
            {refineMutation.isPending ? "Refining..." : "Refine this unit with AI"}
          </button>
        )}
      </div>

      {/* Branch potential — only shown in proactive mode */}
      {showBranchPotential && (
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <span className="text-sm text-text-secondary">Branch Potential</span>
          <span className="inline-flex items-center gap-0.5" aria-label={`Branch potential: ${filled} of 4`}>
            {Array.from({ length: 4 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "text-base leading-none",
                  i < filled ? "text-accent-primary" : "text-text-tertiary",
                )}
                aria-hidden="true"
              >
                {i < filled ? "●" : "○"}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* External knowledge search */}
      <ExternalKnowledgePanel
        unitId={unitId}
        unitContent={content}
        onAddAsUnit={onAddAsUnit}
      />
    </div>
  );
}
