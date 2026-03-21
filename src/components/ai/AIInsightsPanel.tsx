"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Loader2,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Merge,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Target,
} from "lucide-react";
import type {
  ContradictionPair,
  MergeSuggestion,
  CompletenessAnalysis,
  ContextSummary,
  GeneratedQuestion,
  NextStepSuggestion,
  ExtractedTerm,
} from "~/server/ai";

type InsightTab =
  | "summary"
  | "completeness"
  | "contradictions"
  | "merge"
  | "questions"
  | "nextSteps"
  | "terms";

interface AIInsightsPanelProps {
  contextId: string;
  onCreateUnit?: (content: string, type: string) => void;
  onNavigateToUnit?: (unitId: string) => void;
}

export function AIInsightsPanel({
  contextId,
  onCreateUnit,
  onNavigateToUnit,
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = React.useState<InsightTab>("summary");

  // Summary query (auto-fetches)
  const summaryQuery = api.ai.summarizeContext.useQuery(
    { contextId },
    { enabled: activeTab === "summary" }
  );

  // Mutations for other insights (on-demand)
  const completenessMutation = api.ai.analyzeCompleteness.useMutation();
  const contradictionsMutation = api.ai.detectContradictions.useMutation();
  const mergeMutation = api.ai.suggestMerge.useMutation();
  const questionsMutation = api.ai.generateQuestions.useMutation();
  const nextStepsMutation = api.ai.suggestNextSteps.useMutation();
  const termsMutation = api.ai.extractKeyTerms.useMutation();

  const runAnalysis = (tab: InsightTab) => {
    switch (tab) {
      case "completeness":
        completenessMutation.mutate({ contextId });
        break;
      case "contradictions":
        contradictionsMutation.mutate({ contextId });
        break;
      case "merge":
        mergeMutation.mutate({ contextId });
        break;
      case "questions":
        questionsMutation.mutate({ contextId });
        break;
      case "nextSteps":
        nextStepsMutation.mutate({ contextId });
        break;
      case "terms":
        termsMutation.mutate({ contextId });
        break;
    }
  };

  const tabs: { id: InsightTab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Summary", icon: <BookOpen className="h-4 w-4" /> },
    { id: "completeness", label: "Completeness", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "contradictions", label: "Contradictions", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "merge", label: "Merge", icon: <Merge className="h-4 w-4" /> },
    { id: "questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> },
    { id: "nextSteps", label: "Next Steps", icon: <Target className="h-4 w-4" /> },
    { id: "terms", label: "Terms", icon: <Lightbulb className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-full border-l border-border bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-5 w-5 text-accent" />
        <span className="font-medium">AI Insights</span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-accent border-b-2 border-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "summary" && (
          <SummaryView
            data={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
            error={summaryQuery.error?.message}
          />
        )}

        {activeTab === "completeness" && (
          <CompletenessView
            data={completenessMutation.data}
            isLoading={completenessMutation.isPending}
            error={completenessMutation.error?.message}
            onRun={() => runAnalysis("completeness")}
          />
        )}

        {activeTab === "contradictions" && (
          <ContradictionsView
            data={contradictionsMutation.data}
            isLoading={contradictionsMutation.isPending}
            error={contradictionsMutation.error?.message}
            onRun={() => runAnalysis("contradictions")}
            onNavigate={onNavigateToUnit}
          />
        )}

        {activeTab === "merge" && (
          <MergeView
            data={mergeMutation.data}
            isLoading={mergeMutation.isPending}
            error={mergeMutation.error?.message}
            onRun={() => runAnalysis("merge")}
          />
        )}

        {activeTab === "questions" && (
          <QuestionsView
            data={questionsMutation.data}
            isLoading={questionsMutation.isPending}
            error={questionsMutation.error?.message}
            onRun={() => runAnalysis("questions")}
            onCreateUnit={onCreateUnit}
          />
        )}

        {activeTab === "nextSteps" && (
          <NextStepsView
            data={nextStepsMutation.data}
            isLoading={nextStepsMutation.isPending}
            error={nextStepsMutation.error?.message}
            onRun={() => runAnalysis("nextSteps")}
          />
        )}

        {activeTab === "terms" && (
          <TermsView
            data={termsMutation.data}
            isLoading={termsMutation.isPending}
            error={termsMutation.error?.message}
            onRun={() => runAnalysis("terms")}
            onCreateUnit={onCreateUnit}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SummaryView({
  data,
  isLoading,
  error,
}: {
  data?: ContextSummary;
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} />;
  if (!data) return <EmptyState message="Loading summary..." />;

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

function CompletenessView({
  data,
  isLoading,
  error,
  onRun,
}: {
  data?: CompletenessAnalysis;
  isLoading: boolean;
  error?: string;
  onRun: () => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Analyze Completeness" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data) return null;

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

      <Button variant="outline" size="sm" onClick={onRun}>
        Re-analyze
      </Button>
    </div>
  );
}

function ContradictionsView({
  data,
  isLoading,
  error,
  onRun,
  onNavigate,
}: {
  data?: ContradictionPair[];
  isLoading: boolean;
  error?: string;
  onRun: () => void;
  onNavigate?: (unitId: string) => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Detect Contradictions" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <p className="text-sm text-text-secondary">No contradictions found</p>
        <Button variant="outline" size="sm" onClick={onRun} className="mt-4">
          Re-scan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                c.severity === "direct"
                  ? "bg-red-500/20 text-red-400"
                  : c.severity === "tension"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {c.severity}
            </span>
          </div>
          <p className="text-sm mb-2">{c.description}</p>
          <p className="text-xs text-text-secondary mb-2">
            <strong>Resolution:</strong> {c.suggestedResolution}
          </p>
          <div className="flex gap-2">
            {onNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(c.unitAId)}
                >
                  View Unit A
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(c.unitBId)}
                >
                  View Unit B
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onRun}>
        Re-scan
      </Button>
    </div>
  );
}

function MergeView({
  data,
  isLoading,
  error,
  onRun,
}: {
  data?: MergeSuggestion[];
  isLoading: boolean;
  error?: string;
  onRun: () => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Find Merge Candidates" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <p className="text-sm text-text-secondary">No merge candidates found</p>
        <Button variant="outline" size="sm" onClick={onRun} className="mt-4">
          Re-scan
        </Button>
      </div>
    );
  }

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
      <Button variant="outline" size="sm" onClick={onRun}>
        Re-scan
      </Button>
    </div>
  );
}

function QuestionsView({
  data,
  isLoading,
  error,
  onRun,
  onCreateUnit,
}: {
  data?: GeneratedQuestion[];
  isLoading: boolean;
  error?: string;
  onRun: () => void;
  onCreateUnit?: (content: string, type: string) => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Generate Questions" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data || data.length === 0) return null;

  const typeColors: Record<string, string> = {
    clarifying: "bg-blue-500/20 text-blue-400",
    challenging: "bg-red-500/20 text-red-400",
    exploratory: "bg-purple-500/20 text-purple-400",
    connecting: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="space-y-3">
      {data.map((q, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-accent" />
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${typeColors[q.type] || "bg-gray-500/20"}`}
            >
              {q.type}
            </span>
          </div>
          <p className="text-sm mb-2">{q.content}</p>
          <p className="text-xs text-text-secondary mb-2">{q.rationale}</p>
          {onCreateUnit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateUnit(q.content, "question")}
            >
              Add as Unit
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onRun}>
        Generate More
      </Button>
    </div>
  );
}

function NextStepsView({
  data,
  isLoading,
  error,
  onRun,
}: {
  data?: NextStepSuggestion[];
  isLoading: boolean;
  error?: string;
  onRun: () => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Suggest Next Steps" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data || data.length === 0) return null;

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
      <Button variant="outline" size="sm" onClick={onRun}>
        Refresh
      </Button>
    </div>
  );
}

function TermsView({
  data,
  isLoading,
  error,
  onRun,
  onCreateUnit,
}: {
  data?: ExtractedTerm[];
  isLoading: boolean;
  error?: string;
  onRun: () => void;
  onCreateUnit?: (content: string, type: string) => void;
}) {
  if (!data && !isLoading && !error) {
    return <RunButton label="Extract Key Terms" onRun={onRun} />;
  }
  if (isLoading) return <LoadingState />;
  if (error) return <AIErrorState message={error} onRetry={onRun} />;
  if (!data || data.length === 0) return null;

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
                onCreateUnit(`${term.term}: ${term.definition || ""}`, "definition")
              }
            >
              Define
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onRun}>
        Re-extract
      </Button>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-text-secondary text-sm">{message}</div>
  );
}

function AIErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isApiKey = message.includes("API") || message.includes("api-key") || message.includes("authentication");
  return (
    <div className="py-6 px-4 text-center">
      <AlertTriangle className="h-6 w-6 mx-auto text-red-400 mb-2" />
      <div className="text-red-400 text-sm font-medium mb-2">AI request failed</div>
      <p className="text-xs text-text-secondary mb-3">
        {isApiKey
          ? "The Anthropic API key is missing or invalid. Update ANTHROPIC_API_KEY in your .env file."
          : message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

function RunButton({ label, onRun }: { label: string; onRun: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Button onClick={onRun}>
        <Sparkles className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
