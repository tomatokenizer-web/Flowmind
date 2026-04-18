"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { ExternalKnowledgePanel } from "~/components/ai/ExternalKnowledgePanel";
import { toast } from "~/lib/toast";
import { useAIIntensity, isAtLeastBalanced, isProactive } from "~/hooks/useAIIntensity";
import { Loader2, Check, RotateCcw, FolderPlus, ArrowRight, Telescope, MessageCircleQuestion, Sparkles, ChevronRight, Layers, Scissors } from "lucide-react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { useAITabCacheStore } from "~/stores/aiTabCacheStore";

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
  const [deepDiveUnitIds, setDeepDiveUnitIds] = React.useState<string[]>([]);
  const utils = api.useUtils();
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const { level: aiLevel } = useAIIntensity();
  const showAISections = isAtLeastBalanced(aiLevel);
  const showBranchPotential = isProactive(aiLevel);

  // Persistent cache for AI results
  const aiCache = useAITabCacheStore((s) => s.getCache(unitId));
  const setClassification = useAITabCacheStore((s) => s.setClassification);
  const setRefinement = useAITabCacheStore((s) => s.setRefinement);

  const suggestTypeMutation = api.ai.suggestType.useMutation({
    retry: false,
    onSuccess: (data) => {
      if (data.suggestion) {
        setClassification(unitId, {
          unitType: data.suggestion.unitType ?? "",
          confidence: data.suggestion.confidence ?? 0,
          reasoning: data.suggestion.reasoning ?? "",
        });
      }
    },
    onError: () => {
      // Silently fail for auto-classification — user can manually retry
    },
  });

  // Use cached classification if available
  const classificationData = suggestTypeMutation.data?.suggestion ?? (aiCache.classification ? {
    unitType: aiCache.classification.unitType,
    confidence: aiCache.classification.confidence,
    reasoning: aiCache.classification.reasoning,
  } : null);

  // Auto-trigger classification on mount — skip if unit already has a non-default type
  const autoClassifiedRef = React.useRef<string | null>(null);
  const alreadyClassified = !!unitType && unitType !== "claim";
  React.useEffect(() => {
    if (
      showAISections &&
      !alreadyClassified &&
      content?.trim() &&
      unitId !== autoClassifiedRef.current &&
      !classificationData &&
      !suggestTypeMutation.isPending
    ) {
      autoClassifiedRef.current = unitId;
      suggestTypeMutation.mutate({ content, contextId: activeContextId ?? undefined });
    }
  }, [unitId, showAISections, alreadyClassified]); // eslint-disable-line react-hooks/exhaustive-deps
  const refineMutation = api.ai.refineUnit.useMutation({
    onSuccess: (data) => {
      setRefinement(unitId, { original: data.original, refined: data.refined });
    },
    onError: (err) => {
      toast.error("AI refinement failed", { description: err.message });
    },
  });

  // Use cached refinement if available
  const refinementData = refineMutation.data ?? aiCache.refinement;
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
        ) : classificationData ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent-primary/10 px-2 py-1 text-sm font-medium text-accent-primary">
                {classificationData.unitType}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                (classificationData.confidence ?? 0) >= 0.8
                  ? "bg-green-500/10 text-green-400"
                  : (classificationData.confidence ?? 0) >= 0.5
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-text-tertiary/10 text-text-tertiary",
              )}>
                {Math.round((classificationData.confidence ?? 0) * 100)}%
              </span>
            </div>
            <p className="text-xs text-text-secondary">{classificationData.reasoning}</p>
            <div className="flex items-center gap-2">
              {classificationData.unitType !== unitType && onMetadataChange && (
                <button
                  onClick={() => {
                    onMetadataChange("unitType", classificationData.unitType ?? null);
                    toast.success(`Type changed to ${classificationData.unitType}`);
                  }}
                  className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20"
                >
                  <Check className="h-3 w-3" /> Apply
                </button>
              )}
              {classificationData.unitType === unitType && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <Check className="h-3 w-3" /> Already correct
                </span>
              )}
              <button
                onClick={() => { suggestTypeMutation.reset(); setClassification(unitId, null); suggestTypeMutation.mutate({ content, contextId: activeContextId ?? undefined }); }}
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
        {refinementData ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-bg-secondary p-2 text-xs text-text-secondary line-through">{refinementData.original.slice(0, 100)}</div>
            <div className="rounded-lg bg-accent-primary/5 border border-accent-primary/20 p-2 text-sm text-text-primary">{refinementData.refined}</div>
            <div className="flex gap-2">
              <button onClick={() => updateMutation.mutate({ id: unitId, content: refinementData.refined })}
                className="text-xs text-accent-primary hover:underline">Accept</button>
              <button onClick={() => { refineMutation.reset(); setRefinement(unitId, null); }} className="text-xs text-text-tertiary hover:underline">Discard</button>
            </div>
          </div>
        ) : (
          <button onClick={() => refineMutation.mutate({ unitId, content })} disabled={refineMutation.isPending}
            className="text-sm text-accent-primary hover:underline disabled:opacity-50">
            {refineMutation.isPending ? "Refining..." : "Refine this unit with AI"}
          </button>
        )}
      </div>

      {/* Decompose — split long unit into smaller focused units */}
      {projectId && content.length > 100 && (
        <DecomposeSection
          unitId={unitId}
          content={content}
          projectId={projectId}
          contextId={activeContextId ?? undefined}
          onAddAsUnit={onAddAsUnit}
        />
      )}

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

      {/* Deep Dive — prompt-based exploration */}
      {projectId && (
        <DeepDiveSection
          unitId={unitId}
          content={content}
          unitType={unitType}
          projectId={projectId}
          onBranchedUnitsChange={setDeepDiveUnitIds}
        />
      )}

      {/* Context suggestion — includes deep dive branched units */}
      {projectId && (
        <ContextSuggestionSection
          unitId={unitId}
          projectId={projectId}
          deepDiveUnitIds={deepDiveUnitIds}
        />
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

// ─── Decompose Sub-component ──────────────────────────────────────────

function DecomposeSection({
  unitId,
  content,
  projectId,
  contextId,
  onAddAsUnit,
}: {
  unitId: string;
  content: string;
  projectId: string;
  contextId?: string;
  onAddAsUnit?: (content: string) => void;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const utils = api.useUtils();

  const decomposeMutation = api.ai.decomposeUnit.useMutation({
    onSuccess: (data) => {
      setSelected(new Set(data.proposals.map((_, i) => i)));
    },
    onError: (err) => {
      toast.error("Decomposition failed", { description: err.message });
    },
  });

  const createUnit = api.unit.create.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
    },
  });

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleAccept = async () => {
    if (!decomposeMutation.data) return;
    const accepted = decomposeMutation.data.proposals.filter((_, i) => selected.has(i));
    for (const p of accepted) {
      if (onAddAsUnit) {
        onAddAsUnit(p.content);
      } else {
        await createUnit.mutateAsync({
          content: p.content,
          unitType: p.proposedType as "claim" | "question" | "evidence" | "counterargument" | "observation" | "idea" | "definition" | "assumption" | "action",
          lifecycle: "draft",
          originType: "ai_generated",
          sourceSpan: { derivedFrom: unitId },
          projectId,
        });
      }
    }
    toast.success(`${accepted.length} units created from decomposition`);
    decomposeMutation.reset();
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5" />
          Decompose
        </p>
        <span className="text-[10px] text-text-tertiary">
          {content.length} chars
        </span>
      </div>

      {decomposeMutation.data ? (
        <div className="space-y-2">
          <div className="max-h-[300px] overflow-auto space-y-1.5">
            {decomposeMutation.data.proposals.map((p, i) => (
              <label
                key={i}
                className={cn(
                  "flex gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                  selected.has(i)
                    ? "border-accent-primary/40 bg-accent-primary/5"
                    : "border-border bg-bg-secondary opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] px-1 py-0.5 rounded bg-accent-primary/10 text-accent-primary">
                    {p.proposedType}
                  </span>
                  <p className="text-xs mt-1 line-clamp-3">{p.content}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-text-tertiary">
              {selected.size}/{decomposeMutation.data.proposals.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => decomposeMutation.reset()}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={selected.size === 0 || createUnit.isPending}
                className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                Create {selected.size} units
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => decomposeMutation.mutate({ unitId, projectId, contextId })}
          disabled={decomposeMutation.isPending}
          className="text-sm text-accent-primary hover:underline disabled:opacity-50"
        >
          {decomposeMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Decomposing...
            </span>
          ) : (
            "Split into smaller thought units"
          )}
        </button>
      )}
    </div>
  );
}

// ─── Deep Dive Sub-component ──────────────────────────────────────────

interface DeepDiveProps {
  unitId: string;
  content: string;
  unitType?: string;
  projectId: string;
  onBranchedUnitsChange?: (unitIds: string[]) => void;
}

const _ANGLE_ICONS: Record<string, string> = {
  evidence: "evidence",
  counter: "counterargument",
  implication: "idea",
  definition: "definition",
  related: "observation",
  application: "action",
};

function DeepDiveSection({ unitId, content, unitType, projectId, onBranchedUnitsChange }: DeepDiveProps) {
  const aiCache = useAITabCacheStore((s) => s.getCache(unitId));
  const addDeepDiveEntry = useAITabCacheStore((s) => s.addDeepDiveEntry);
  const setDeepDivePrompt = useAITabCacheStore((s) => s.setDeepDivePrompt);

  // Use cached history and prompt
  const history = aiCache.deepDiveHistory;
  const prompt = aiCache.deepDivePrompt;
  const setPrompt = React.useCallback((v: string) => setDeepDivePrompt(unitId, v), [unitId, setDeepDivePrompt]);

  const utils = api.useUtils();
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Restore branched unit IDs from cached history on mount
  React.useEffect(() => {
    if (history.length > 0) {
      onBranchedUnitsChange?.(history.flatMap((h) => h.units.map((u) => u.id)));
    }
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-generated question suggestions
  const questionsMutation = api.ai.deepDiveQuestions.useMutation();

  // Store the prompt at submission time so it survives re-renders
  const submittedPromptRef = React.useRef("");

  // Answer + organize mutation
  const answerMutation = api.ai.deepDiveAnswer.useMutation({
    onSuccess: (result) => {
      if (!result || !("answer" in result)) return;
      const entry = {
        question: submittedPromptRef.current,
        answer: result.answer,
        units: result.createdUnits,
        suggestContext: result.suggestContext ?? false,
        contextName: result.contextName,
      };
      addDeepDiveEntry(unitId, entry);
      // Notify parent of all branched unit IDs so context suggestions can include them
      const allIds = [...history, entry].flatMap((h) => h.units.map((u) => u.id));
      onBranchedUnitsChange?.(allIds);
      setPrompt("");
      // Only invalidate relations — the new branched units are shown in history,
      // no need to invalidate unit.list which causes parent re-render and textarea reset
      void utils.relation.listByUnit.invalidate({ unitId });
      toast.success(`${result.createdUnits.length} units branched`);
    },
    onError: (err) => {
      toast.error("Deep dive failed", { description: err.message });
    },
  });

  // Bundle into context
  const bundleMutation = api.ai.deepDiveBundleContext.useMutation({
    onSuccess: (result) => {
      void utils.context.list.invalidate({ projectId });
      toast.success(`Context "${result.contextName}" created with ${result.unitsAdded} units`);
    },
    onError: (err) => toast.error("Failed to create context", { description: err.message }),
  });

  const handleSubmit = () => {
    const q = prompt.trim();
    if (!q || answerMutation.isPending) return;
    submittedPromptRef.current = q;
    answerMutation.mutate({ unitId, question: q, projectId });
  };

  // Collect all branched unit IDs for context bundling
  const allBranchedIds = React.useMemo(
    () => [unitId, ...history.flatMap((h) => h.units.map((u) => u.id))],
    [unitId, history],
  );

  const latestSuggestContext = history.length > 0 ? history[history.length - 1] : null;
  const showContextSuggestion =
    latestSuggestContext?.suggestContext && allBranchedIds.length >= 3;

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
          <Telescope className="h-3.5 w-3.5 text-accent-primary" />
          Deep Dive
        </p>
        {/* Quick question suggestions */}
        {!questionsMutation.data && !questionsMutation.isPending && (
          <button
            onClick={() => questionsMutation.mutate({ unitId, content, unitType })}
            className="text-[10px] text-text-tertiary hover:text-accent-primary transition-colors"
          >
            Suggest questions
          </button>
        )}
      </div>

      {/* Suggested questions — clickable chips */}
      {questionsMutation.isPending && (
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />
          <span className="text-xs text-text-tertiary">Generating questions...</span>
        </div>
      )}
      {questionsMutation.data && "questions" in questionsMutation.data && (questionsMutation.data as { questions: Array<{ text: string; angle: string; priority: string }> }).questions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(questionsMutation.data as { questions: Array<{ text: string; angle: string; priority: string }> }).questions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setPrompt(q.text);
                inputRef.current?.focus();
              }}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-left text-xs transition-all duration-fast",
                "hover:-translate-y-px hover:shadow-sm",
                q.priority === "high"
                  ? "border-accent-primary/30 bg-accent-primary/5 text-text-primary hover:border-accent-primary/50"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-border",
              )}
            >
              <MessageCircleQuestion className="inline h-3 w-3 mr-1 text-text-tertiary" />
              {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Prompt input */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask a follow-up question about this unit..."
          rows={2}
          className={cn(
            "w-full resize-none rounded-lg border border-border bg-bg-secondary px-3 py-2 pr-10 text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "transition-colors duration-fast",
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || answerMutation.isPending}
          className={cn(
            "absolute right-2 bottom-2 rounded-lg p-1.5 transition-colors",
            prompt.trim()
              ? "bg-accent-primary text-white hover:bg-accent-primary/90"
              : "bg-bg-hover text-text-tertiary",
            "disabled:opacity-50",
          )}
          aria-label="Send question"
        >
          {answerMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Loading state */}
      {answerMutation.isPending && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-accent-primary/30 bg-accent-primary/5 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-accent-primary shrink-0" />
          <div>
            <p className="text-xs font-medium text-accent-primary">Analyzing & organizing...</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">AI is answering and splitting into branched units</p>
          </div>
        </div>
      )}

      {/* Conversation history */}
      {history.map((entry, i) => (
        <div key={i} className="mt-3 space-y-2">
          {/* Question */}
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="h-3.5 w-3.5 text-accent-primary mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-text-primary">{entry.question}</p>
          </div>

          {/* Answer */}
          <div className="rounded-lg bg-bg-secondary border border-border p-3">
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
          </div>

          {/* Branched units */}
          {entry.units.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {entry.units.length} units branched
              </p>
              {entry.units.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-bg-primary p-2 text-xs"
                >
                  <span className="shrink-0 rounded-md bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary capitalize">
                    {u.unitType}
                  </span>
                  <span className="text-text-secondary line-clamp-2">{u.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Context bundling suggestion */}
      {showContextSuggestion && latestSuggestContext?.contextName && (
        <button
          onClick={() =>
            bundleMutation.mutate({
              projectId,
              unitIds: allBranchedIds,
              contextName: latestSuggestContext.contextName!,
            })
          }
          disabled={bundleMutation.isPending}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-accent-primary/30 bg-accent-primary/5 p-2.5 text-left hover:bg-accent-primary/10 transition-colors disabled:opacity-50"
        >
          <Layers className="h-4 w-4 shrink-0 text-accent-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent-primary">Bundle into context</p>
            <p className="text-[10px] text-text-tertiary truncate">
              &ldquo;{latestSuggestContext.contextName}&rdquo; &mdash; {allBranchedIds.length} units
            </p>
          </div>
          {bundleMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary shrink-0" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 text-accent-primary shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Context Suggestion Sub-component ────────────────────────────────

function ContextSuggestionSection({
  unitId,
  projectId,
  deepDiveUnitIds,
}: {
  unitId: string;
  projectId: string;
  deepDiveUnitIds?: string[];
}) {
  const utils = api.useUtils();
  const hasDeepDiveUnits = deepDiveUnitIds && deepDiveUnitIds.length > 0;
  // All unit IDs to associate (original + deep dive branched)
  const allUnitIds = React.useMemo(
    () => [unitId, ...(deepDiveUnitIds ?? [])],
    [unitId, deepDiveUnitIds],
  );

  const { data, isLoading } = api.ai.suggestContextForUnit.useQuery(
    { unitId, projectId },
    { enabled: !!unitId && !!projectId, retry: false },
  );

  // Auto-relate units within a context after adding
  const autoRelate = api.ai.autoRelate.useMutation({
    onSuccess: (result) => {
      if (result && "count" in result && (result as { count: number }).count > 0) {
        void utils.relation.invalidate();
        toast.success(`${(result as { count: number }).count} auto-relations created`);
      }
    },
  });

  const addToContext = api.context.addUnit.useMutation({
    onSuccess: (_data, variables) => {
      void utils.ai.suggestContextForUnit.invalidate({ unitId, projectId });
      void utils.context.list.invalidate({ projectId });
      toast.success("Unit added to context");
      // Trigger auto-relate to connect with sibling units in this context
      autoRelate.mutate({ contextId: variables.contextId });
    },
    onError: (err) => toast.error("Failed to add to context", { description: err.message }),
  });

  const addMultipleToContext = api.context.addUnits.useMutation({
    onSuccess: (_data, variables) => {
      void utils.ai.suggestContextForUnit.invalidate({ unitId, projectId });
      void utils.context.list.invalidate({ projectId });
      toast.success(`${allUnitIds.length} units added to context`);
      // Trigger auto-relate to connect with sibling units in this context
      autoRelate.mutate({ contextId: variables.contextId });
    },
    onError: (err) => toast.error("Failed to add units to context", { description: err.message }),
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

      {/* Deep dive scope indicator */}
      {hasDeepDiveUnits && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-accent-primary/20 bg-accent-primary/5 px-2 py-1.5">
          <Sparkles className="h-3 w-3 text-accent-primary shrink-0" />
          <span className="text-[10px] text-text-secondary">
            Includes <span className="font-medium text-accent-primary">{deepDiveUnitIds.length}</span> deep dive units — add all or just this unit
          </span>
        </div>
      )}

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
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => addToContext.mutate({ unitId, contextId: s.contextId })}
                    disabled={addToContext.isPending}
                    className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
                  >
                    <ArrowRight className="h-3 w-3" /> Add
                  </button>
                  {hasDeepDiveUnits && (
                    <button
                      onClick={() => addMultipleToContext.mutate({ unitIds: allUnitIds, contextId: s.contextId })}
                      disabled={addMultipleToContext.isPending}
                      className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
                      title={`Add this unit + ${deepDiveUnitIds.length} deep dive units`}
                    >
                      <Layers className="h-3 w-3" /> All
                    </button>
                  )}
                </div>
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
          onClick={() => autoCreate.mutate({ projectId, unitIds: hasDeepDiveUnits ? allUnitIds : [unitId] })}
          disabled={autoCreate.isPending}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-accent-primary/30 bg-accent-primary/5 p-2 text-left hover:bg-accent-primary/10 disabled:opacity-50"
        >
          <FolderPlus className="h-4 w-4 shrink-0 text-accent-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent-primary">Create new context</p>
            <p className="text-xs text-text-tertiary truncate">
              &ldquo;{newContextName}&rdquo;{hasDeepDiveUnits ? ` — ${allUnitIds.length} units` : ""}
            </p>
          </div>
          {autoCreate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />}
        </button>
      )}
    </div>
  );
}
