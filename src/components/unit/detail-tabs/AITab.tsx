"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { ExternalKnowledgePanel } from "~/components/ai/ExternalKnowledgePanel";
import { toast } from "~/lib/toast";
import { useAIIntensity, isAtLeastBalanced, isProactive } from "~/hooks/useAIIntensity";
import { Loader2, Check, RotateCcw, FolderPlus, ArrowRight } from "lucide-react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";

interface AITabProps {
  unitId: string;
  content: string;
  unitType?: string;
  branchPotential?: number;
  onContentChange?: (c: string) => void;
  onMetadataChange?: (field: string, value: string | null) => void;
  onAddAsUnit?: (content: string) => void;
}

export function AITab({ unitId, content, unitType, branchPotential, onContentChange, onMetadataChange, onAddAsUnit }: AITabProps) {
  const filled = Math.round((branchPotential ?? 0) * 4);
  const utils = api.useUtils();
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const { level: aiLevel } = useAIIntensity();
  const showAISections = isAtLeastBalanced(aiLevel);
  const showBranchPotential = isProactive(aiLevel);

  const suggestTypeMutation = api.ai.suggestType.useMutation({
    onError: (err) => {
      toast.error("AI suggestion failed", { description: err.message });
    },
  });

  // Auto-trigger classification on mount
  const autoClassifiedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (
      showAISections &&
      content?.trim() &&
      unitId !== autoClassifiedRef.current &&
      !suggestTypeMutation.data &&
      !suggestTypeMutation.isPending
    ) {
      autoClassifiedRef.current = unitId;
      suggestTypeMutation.mutate({ content, contextId: activeContextId ?? undefined });
    }
  }, [unitId, showAISections]); // eslint-disable-line react-hooks/exhaustive-deps
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
      {/* Type suggestion — auto-classify with apply */}
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">AI Classification</p>
          {unitType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-tertiary">
              Current: {unitType}
            </span>
          )}
        </div>
        {suggestTypeMutation.isPending ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />
            <span className="text-sm text-text-secondary">Classifying...</span>
          </div>
        ) : suggestTypeMutation.data ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent-primary/10 px-2 py-1 text-sm font-medium text-accent-primary">
                {suggestTypeMutation.data.suggestion?.unitType}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                (suggestTypeMutation.data.suggestion?.confidence ?? 0) >= 0.8
                  ? "bg-green-500/10 text-green-400"
                  : (suggestTypeMutation.data.suggestion?.confidence ?? 0) >= 0.5
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-text-tertiary/10 text-text-tertiary",
              )}>
                {Math.round((suggestTypeMutation.data.suggestion?.confidence ?? 0) * 100)}%
              </span>
            </div>
            <p className="text-xs text-text-secondary">{suggestTypeMutation.data.suggestion?.reasoning}</p>
            <div className="flex items-center gap-2">
              {suggestTypeMutation.data.suggestion?.unitType !== unitType && onMetadataChange && (
                <button
                  onClick={() => {
                    onMetadataChange("unitType", suggestTypeMutation.data!.suggestion?.unitType ?? null);
                    toast.success(`Type changed to ${suggestTypeMutation.data!.suggestion?.unitType}`);
                  }}
                  className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20"
                >
                  <Check className="h-3 w-3" /> Apply
                </button>
              )}
              {suggestTypeMutation.data.suggestion?.unitType === unitType && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <Check className="h-3 w-3" /> Already correct
                </span>
              )}
              <button
                onClick={() => { suggestTypeMutation.reset(); suggestTypeMutation.mutate({ content, contextId: activeContextId ?? undefined }); }}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
              >
                <RotateCcw className="h-3 w-3" /> Re-analyze
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { if (content?.trim()) suggestTypeMutation.mutate({ content, contextId: activeContextId ?? undefined }); }}
            disabled={!content?.trim()}
            className="text-sm text-accent-primary hover:underline disabled:opacity-50"
          >
            Classify this unit with AI
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

      {/* Context suggestion */}
      {projectId && <ContextSuggestionSection unitId={unitId} projectId={projectId} />}

      {/* External knowledge search */}
      <ExternalKnowledgePanel
        unitId={unitId}
        unitContent={content}
        onAddAsUnit={onAddAsUnit}
      />
    </div>
  );
}

// ─── Context Suggestion Sub-component ────────────────────────────────

function ContextSuggestionSection({ unitId, projectId }: { unitId: string; projectId: string }) {
  const utils = api.useUtils();

  const { data, isLoading } = api.ai.suggestContextForUnit.useQuery(
    { unitId, projectId },
    { enabled: !!unitId && !!projectId },
  );

  const addToContext = api.context.addUnit.useMutation({
    onSuccess: () => {
      void utils.ai.suggestContextForUnit.invalidate({ unitId, projectId });
      void utils.context.list.invalidate({ projectId });
      toast.success("Unit added to context");
    },
    onError: (err) => toast.error("Failed to add to context", { description: err.message }),
  });

  const autoCreate = api.ai.autoCreateContext.useMutation({
    onSuccess: (result) => {
      void utils.context.list.invalidate({ projectId });
      void utils.ai.suggestContextForUnit.invalidate({ unitId, projectId });
      toast.success(`Created context "${result.contextName}"`);
    },
    onError: (err) => toast.error("Failed to create context", { description: err.message }),
  });

  const suggestions = data?.suggestions ?? [];
  const newContextName = data?.newContextName;

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
        <FolderPlus className="h-3 w-3 text-accent-primary" />
        Context Suggestion
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />
          <span className="text-xs text-text-secondary">Analyzing context fit...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.contextId}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary p-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{s.contextName}</span>
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                    s.confidence >= 0.8 ? "bg-green-500/10 text-green-400" :
                    s.confidence >= 0.5 ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-text-tertiary/10 text-text-tertiary",
                  )}>
                    {Math.round(s.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5 truncate">{s.reason}</p>
              </div>
              {s.alreadyLinked ? (
                <span className="text-xs text-green-400 shrink-0 ml-2">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <button
                  onClick={() => addToContext.mutate({ unitId, contextId: s.contextId })}
                  disabled={addToContext.isPending}
                  className="shrink-0 ml-2 flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
                >
                  <ArrowRight className="h-3 w-3" /> Add
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">No matching contexts found</p>
      )}

      {/* Suggest creating a new context */}
      {newContextName && !suggestions.some((s) => s.confidence >= 0.7) && (
        <button
          onClick={() => autoCreate.mutate({ projectId, unitIds: [unitId] })}
          disabled={autoCreate.isPending}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-accent-primary/30 bg-accent-primary/5 p-2 text-left hover:bg-accent-primary/10 disabled:opacity-50"
        >
          <FolderPlus className="h-4 w-4 shrink-0 text-accent-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent-primary">Create new context</p>
            <p className="text-xs text-text-tertiary truncate">&ldquo;{newContextName}&rdquo;</p>
          </div>
          {autoCreate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />}
        </button>
      )}
    </div>
  );
}
