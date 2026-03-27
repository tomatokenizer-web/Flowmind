"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import type { ContradictionPair } from "~/server/ai";
import { LoadingState, AIErrorState, RunButton } from "./shared";

interface ContradictionsTabProps {
  contextId: string;
  sessionId?: string;
  onNavigateToUnit?: (unitId: string) => void;
}

export function ContradictionsTab({ contextId, onNavigateToUnit }: ContradictionsTabProps) {
  const mutation = api.ai.detectContradictions.useMutation();

  if (!mutation.data && !mutation.isPending && !mutation.error) {
    return <RunButton label="Detect Contradictions" onRun={() => mutation.mutate({ contextId })} />;
  }
  if (mutation.isPending) return <LoadingState />;
  if (mutation.error) return <AIErrorState message={mutation.error.message} onRetry={() => mutation.mutate({ contextId })} />;
  if (!mutation.data || mutation.data.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <p className="text-sm text-text-secondary">No contradictions found</p>
        <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })} className="mt-4">
          Re-scan
        </Button>
      </div>
    );
  }

  const data: ContradictionPair[] = mutation.data;

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
            {onNavigateToUnit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToUnit(c.unitAId)}
                >
                  View Unit A
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToUnit(c.unitBId)}
                >
                  View Unit B
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => mutation.mutate({ contextId })}>
        Re-scan
      </Button>
    </div>
  );
}
