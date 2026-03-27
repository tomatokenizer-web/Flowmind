"use client";

import * as React from "react";
import {
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
import { SummaryTab } from "./insights/SummaryTab";
import { CompletenessTab } from "./insights/CompletenessTab";
import { ContradictionsTab } from "./insights/ContradictionsTab";
import { MergeSuggestionsTab } from "./insights/MergeSuggestionsTab";
import { QuestionsTab } from "./insights/QuestionsTab";
import { NextStepsTab } from "./insights/NextStepsTab";
import { KeyTermsTab } from "./insights/KeyTermsTab";

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
          <SummaryTab contextId={contextId} />
        )}

        {activeTab === "completeness" && (
          <CompletenessTab contextId={contextId} />
        )}

        {activeTab === "contradictions" && (
          <ContradictionsTab
            contextId={contextId}
            onNavigateToUnit={onNavigateToUnit}
          />
        )}

        {activeTab === "merge" && (
          <MergeSuggestionsTab contextId={contextId} />
        )}

        {activeTab === "questions" && (
          <QuestionsTab contextId={contextId} onCreateUnit={onCreateUnit} />
        )}

        {activeTab === "nextSteps" && (
          <NextStepsTab contextId={contextId} />
        )}

        {activeTab === "terms" && (
          <KeyTermsTab contextId={contextId} onCreateUnit={onCreateUnit} />
        )}
      </div>
    </div>
  );
}
