"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { GeneratedQuestion } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface QuestionsTabProps {
  contextId: string;
  sessionId?: string;
  onCreateUnit?: (content: string, type: string) => void;
}

export function QuestionsTab({ contextId, onCreateUnit }: QuestionsTabProps) {
  const mutation = api.ai.generateQuestions.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Generate Questions" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data || mutation.data.length === 0) return null;

  const data: GeneratedQuestion[] = mutation.data;

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
              className={`text-xs px-1.5 py-0.5 rounded ${typeColors[q.type] ?? "bg-gray-500/20"}`}
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
      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Generate More
      </Button>
    </div>
  );
}
