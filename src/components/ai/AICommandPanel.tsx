"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useAIPanelStore } from "~/stores/ai-panel-store";
import { toast } from "~/lib/toast";
import {
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Merge,
  HelpCircle,
  Target,
  Lightbulb,
  Zap,
  GitBranch,
  Search,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { PromptGeneratorDialog } from "./PromptGeneratorDialog";

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Action Button ─────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  description,
  isPending,
  hasResult,
  onRun,
  onToggleResult,
  showResult,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  isPending: boolean;
  hasResult: boolean;
  onRun: () => void;
  onToggleResult?: () => void;
  showResult?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
      <button
        type="button"
        onClick={hasResult && onToggleResult ? onToggleResult : onRun}
        disabled={isPending}
        className={cn(
          "flex w-full items-start gap-3 p-3 text-left transition-colors",
          "hover:bg-bg-hover",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        )}
      >
        <div className="mt-0.5 shrink-0 text-accent-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary shrink-0" />}
            {!isPending && hasResult && (
              showResult
                ? <ChevronUp className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{description}</p>
        </div>
      </button>
    </div>
  );
}

// ─── Result Box ───────────────────────────────────────────────────────────────

function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-3 pt-0 border-t border-border bg-bg-secondary">
      <div className="rounded-md border border-border bg-bg-primary p-3 text-xs text-text-secondary space-y-1.5 mt-2">
        {children}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── No Context State ─────────────────────────────────────────────────────────

function NoContextState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-bg-secondary flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-text-tertiary" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary mb-1">No context selected</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Select a context from the sidebar to use AI features.
        </p>
      </div>
    </div>
  );
}

// ─── AICommandPanel ───────────────────────────────────────────────────────────

export function AICommandPanel() {
  const aiPanelOpen = useAIPanelStore((s) => s.aiPanelOpen);
  const setAIPanelOpen = useAIPanelStore((s) => s.setAIPanelOpen);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  // Prompt generator dialog state
  const [promptDialogOpen, setPromptDialogOpen] = React.useState(false);

  // Per-action result visibility
  const [visibleResults, setVisibleResults] = React.useState<Set<string>>(new Set());
  const toggleResult = (key: string) => {
    setVisibleResults((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const utils = api.useUtils();

  const summarizeMutation = api.ai.summarizeContext.useQuery(
    { contextId: activeContextId! },
    { enabled: false, retry: false },
  );
  // summarizeContext is a query — we use refetch to trigger it
  const [summaryVisible, setSummaryVisible] = React.useState(false);
  const [summaryFetched, setSummaryFetched] = React.useState(false);

  const completenessMutation = api.ai.analyzeCompleteness.useMutation({
    onError: (err) => toast.error("Completeness analysis failed", { description: err.message }),
  });

  const contradictionsMutation = api.ai.detectContradictions.useMutation({
    onError: (err) => toast.error("Contradiction detection failed", { description: err.message }),
  });

  const mergeMutation = api.ai.suggestMerge.useMutation({
    onError: (err) => toast.error("Merge suggestions failed", { description: err.message }),
  });

  const questionsMutation = api.ai.generateQuestions.useMutation({
    onError: (err) => toast.error("Question generation failed", { description: err.message }),
  });

  const nextStepsMutation = api.ai.suggestNextSteps.useMutation({
    onError: (err) => toast.error("Next steps suggestion failed", { description: err.message }),
  });

  const termsMutation = api.ai.extractKeyTerms.useMutation({
    onError: (err) => toast.error("Term extraction failed", { description: err.message }),
  });

  const autoRelateMutation = api.ai.autoRelate.useMutation({
    onSuccess: (result) => {
      void utils.relation.listByUnits.invalidate();
      void utils.relation.listByUnit.invalidate();
      toast.success(`${result.created} relations created`, {
        description: `Analyzed ${result.analyzed} units`,
      });
    },
    onError: (err) => toast.error(err.message ?? "Auto-relate failed"),
  });

  const analyzeAndGenerateMutation = api.navigator.analyzeAndGenerate.useMutation({
    onSuccess: (result) => {
      void utils.navigator.list.invalidate();
      toast.success(`${result.generated.length} paths generated`, {
        description: `Analyzed ${result.totalRelationsAnalyzed} relations across ${result.totalUnits} units`,
      });
    },
    onError: (err) => toast.error(err.message ?? "Path generation failed"),
  });

  // Reset state when panel closes
  React.useEffect(() => {
    if (!aiPanelOpen) {
      setVisibleResults(new Set());
      setSummaryVisible(false);
      setSummaryFetched(false);
    }
  }, [aiPanelOpen]);

  if (!aiPanelOpen) return null;

  const ctx = activeContextId;

  // ── Summary handler ────────────────────────────────────────────────────────
  const handleSummarize = async () => {
    if (!ctx) return;
    if (summaryFetched) {
      setSummaryVisible((v) => !v);
      return;
    }
    setSummaryFetched(true);
    setSummaryVisible(true);
    await summarizeMutation.refetch();
  };

  return (
    <>
      {/* Slide-in panel from right */}
      <div
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-border bg-bg-primary shadow-xl",
          "transition-transform duration-200 ease-out",
          aiPanelOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="complementary"
        aria-label="AI Command Panel"
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            <span className="text-sm font-semibold text-text-primary">AI Commands</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAIPanelOpen(false)}
            aria-label="Close AI panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        {!ctx ? (
          <NoContextState />
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">

            {/* ── ANALYZE ─────────────────────────────────────────────────── */}
            <SectionHeader title="Analyze" />

            {/* Summarize */}
            <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
              <button
                type="button"
                onClick={() => void handleSummarize()}
                disabled={summarizeMutation.isLoading}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition-colors",
                  "hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
              >
                <div className="mt-0.5 shrink-0 text-accent-primary"><BookOpen className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">Summarize context</span>
                    {summarizeMutation.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary shrink-0" />}
                    {!summarizeMutation.isLoading && summaryFetched && (
                      summaryVisible
                        ? <ChevronUp className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                        : <ChevronDown className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Generate a structured summary of all units in this context
                  </p>
                </div>
              </button>
              {summaryVisible && summarizeMutation.data && (
                <ResultBox>
                  <p className="font-medium text-text-primary">{summarizeMutation.data.mainThesis}</p>
                  {summarizeMutation.data.keyPoints.slice(0, 3).map((pt, i) => (
                    <p key={i} className="text-text-secondary">• {pt}</p>
                  ))}
                  {summarizeMutation.data.keyPoints.length > 3 && (
                    <p className="text-text-tertiary">+{summarizeMutation.data.keyPoints.length - 3} more points</p>
                  )}
                </ResultBox>
              )}
            </div>

            {/* Detect contradictions */}
            <ActionButton
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Detect contradictions"
              description="Find conflicting claims or tensions between units"
              isPending={contradictionsMutation.isPending}
              hasResult={!!contradictionsMutation.data}
              showResult={visibleResults.has("contradictions")}
              onRun={() => { if (ctx) contradictionsMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("contradictions")}
            />
            {visibleResults.has("contradictions") && contradictionsMutation.data && (
              <ResultBox>
                {contradictionsMutation.data.length === 0 ? (
                  <p className="text-green-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No contradictions found
                  </p>
                ) : (
                  contradictionsMutation.data.slice(0, 3).map((c, i) => (
                    <p key={i} className="text-text-secondary">
                      <span className={cn("font-medium mr-1", c.severity === "direct" ? "text-red-400" : "text-amber-400")}>
                        [{c.severity}]
                      </span>
                      {c.description}
                    </p>
                  ))
                )}
              </ResultBox>
            )}

            {/* Check completeness */}
            <ActionButton
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Check completeness"
              description="Identify gaps and missing elements in your context"
              isPending={completenessMutation.isPending}
              hasResult={!!completenessMutation.data}
              showResult={visibleResults.has("completeness")}
              onRun={() => { if (ctx) completenessMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("completeness")}
            />
            {visibleResults.has("completeness") && completenessMutation.data && (
              <ResultBox>
                <p className="font-medium text-text-primary">
                  Score:{" "}
                  <span className={cn(
                    completenessMutation.data.score >= 0.7 ? "text-green-500"
                      : completenessMutation.data.score >= 0.4 ? "text-amber-500"
                      : "text-red-400"
                  )}>
                    {Math.round(completenessMutation.data.score * 100)}%
                  </span>
                </p>
                {completenessMutation.data.missingElements.slice(0, 3).map((el, i) => (
                  <p key={i} className="text-text-secondary">• {el.description}</p>
                ))}
              </ResultBox>
            )}

            {/* Extract key terms */}
            <ActionButton
              icon={<Lightbulb className="h-4 w-4" />}
              label="Extract key terms"
              description="Identify important concepts and terms that may need definitions"
              isPending={termsMutation.isPending}
              hasResult={!!termsMutation.data}
              showResult={visibleResults.has("terms")}
              onRun={() => { if (ctx) termsMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("terms")}
            />
            {visibleResults.has("terms") && termsMutation.data && (
              <ResultBox>
                <div className="flex flex-wrap gap-1.5">
                  {termsMutation.data.slice(0, 8).map((term, i) => (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        term.importance === "key" ? "bg-accent-primary/15 text-accent-primary"
                          : term.importance === "supporting" ? "bg-blue-500/15 text-blue-400"
                          : "bg-bg-hover text-text-tertiary",
                      )}
                    >
                      {term.term}
                    </span>
                  ))}
                </div>
              </ResultBox>
            )}

            {/* ── GENERATE ─────────────────────────────────────────────────── */}
            <SectionHeader title="Generate" />

            {/* Auto-create relations */}
            <ActionButton
              icon={<Zap className="h-4 w-4" />}
              label="Auto-create relations"
              description="Analyze units with AI and automatically create meaningful relations"
              isPending={autoRelateMutation.isPending}
              hasResult={!!autoRelateMutation.data}
              showResult={visibleResults.has("autoRelate")}
              onRun={() => { if (ctx) autoRelateMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("autoRelate")}
            />
            {visibleResults.has("autoRelate") && autoRelateMutation.data && (
              <ResultBox>
                <p className="text-text-primary font-medium">
                  {autoRelateMutation.data.created} relations created
                </p>
                <p className="text-text-secondary">
                  Analyzed {autoRelateMutation.data.analyzed} units
                  {autoRelateMutation.data.skippedDuplicates > 0 && `, ${autoRelateMutation.data.skippedDuplicates} duplicates skipped`}
                </p>
              </ResultBox>
            )}

            {/* Auto-generate paths */}
            <ActionButton
              icon={<GitBranch className="h-4 w-4" />}
              label="Auto-generate paths"
              description="Generate navigator paths from existing unit relations"
              isPending={analyzeAndGenerateMutation.isPending}
              hasResult={!!analyzeAndGenerateMutation.data}
              showResult={visibleResults.has("paths")}
              onRun={() => { if (ctx) analyzeAndGenerateMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("paths")}
            />
            {visibleResults.has("paths") && analyzeAndGenerateMutation.data && (
              <ResultBox>
                <p className="text-text-primary font-medium">
                  {analyzeAndGenerateMutation.data.generated.length} paths generated
                </p>
                {analyzeAndGenerateMutation.data.generated.slice(0, 4).map((g) => (
                  <p key={g.id} className="text-text-secondary flex justify-between">
                    <span className="truncate">{g.name}</span>
                    <span className="shrink-0 text-text-tertiary ml-2">{g.steps} steps</span>
                  </p>
                ))}
              </ResultBox>
            )}

            {/* Suggest next steps */}
            <ActionButton
              icon={<Target className="h-4 w-4" />}
              label="Suggest next steps"
              description="Get actionable recommendations for advancing your thinking"
              isPending={nextStepsMutation.isPending}
              hasResult={!!nextStepsMutation.data}
              showResult={visibleResults.has("nextSteps")}
              onRun={() => { if (ctx) nextStepsMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("nextSteps")}
            />
            {visibleResults.has("nextSteps") && nextStepsMutation.data && (
              <ResultBox>
                {nextStepsMutation.data.slice(0, 4).map((step, i) => (
                  <p key={i} className="text-text-secondary">
                    <span className={cn(
                      "font-medium mr-1",
                      step.priority === "high" ? "text-red-400"
                        : step.priority === "medium" ? "text-amber-400"
                        : "text-text-tertiary",
                    )}>
                      [{step.priority}]
                    </span>
                    {step.action}
                  </p>
                ))}
              </ResultBox>
            )}

            {/* Generate questions */}
            <ActionButton
              icon={<HelpCircle className="h-4 w-4" />}
              label="Generate questions"
              description="Surface clarifying, challenging, and exploratory questions"
              isPending={questionsMutation.isPending}
              hasResult={!!questionsMutation.data}
              showResult={visibleResults.has("questions")}
              onRun={() => { if (ctx) questionsMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("questions")}
            />
            {visibleResults.has("questions") && questionsMutation.data && (
              <ResultBox>
                {questionsMutation.data.slice(0, 4).map((q, i) => (
                  <p key={i} className="text-text-secondary">• {q.content}</p>
                ))}
              </ResultBox>
            )}

            {/* ── REFINE ────────────────────────────────────────────────────── */}
            <SectionHeader title="Refine" />

            {/* Suggest merges */}
            <ActionButton
              icon={<Merge className="h-4 w-4" />}
              label="Suggest merges"
              description="Find similar or redundant units that could be combined"
              isPending={mergeMutation.isPending}
              hasResult={!!mergeMutation.data}
              showResult={visibleResults.has("merge")}
              onRun={() => { if (ctx) mergeMutation.mutate({ contextId: ctx }); }}
              onToggleResult={() => toggleResult("merge")}
            />
            {visibleResults.has("merge") && mergeMutation.data && (
              <ResultBox>
                {mergeMutation.data.length === 0 ? (
                  <p className="text-green-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No merge candidates found
                  </p>
                ) : (
                  mergeMutation.data.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-text-secondary">
                      <span className="font-medium text-text-primary">
                        {m.unitIds.length} units
                      </span>{" "}
                      — {m.rationale}
                    </p>
                  ))
                )}
              </ResultBox>
            )}

            {/* External knowledge search */}
            <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  // External knowledge is per-unit; direct user to open a unit detail panel
                  toast.info("Open a unit detail panel to search external knowledge for that unit.");
                }}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition-colors",
                  "hover:bg-bg-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
              >
                <div className="mt-0.5 shrink-0 text-accent-primary"><Search className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary">External knowledge</span>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Search related concepts from AI knowledge — available in unit detail panel
                  </p>
                </div>
              </button>
            </div>

            {/* Generate prompt */}
            <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
              <button
                type="button"
                onClick={() => setPromptDialogOpen(true)}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition-colors",
                  "hover:bg-bg-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
              >
                <div className="mt-0.5 shrink-0 text-accent-primary"><FileText className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary">Generate prompt</span>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Export context as a structured prompt for use with any AI assistant
                  </p>
                </div>
              </button>
            </div>

            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Prompt generator dialog */}
      {ctx && (
        <PromptGeneratorDialog
          open={promptDialogOpen}
          onOpenChange={setPromptDialogOpen}
          contextId={ctx}
        />
      )}
    </>
  );
}
