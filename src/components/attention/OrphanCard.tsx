"use client";

import * as React from "react";
import {
  Sparkles,
  Layers,
  Trash2,
  Archive,
  Compass,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UnitType } from "@prisma/client";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { ContextPicker, ActionButton } from "./shared";

// ─── Props ───────────────────────────────────────────────────────────

interface OrphanCardProps {
  unit: {
    id: string;
    content: string;
    unitType: string;
    createdAt: Date | string;
    isolationScore: number;
  };
  projectId: string;
  contexts: Array<{ id: string; name: string }>;
  onUnitClick: (id: string) => void;
  onRecover: (action: "context" | "incubate" | "archive" | "delete", contextId?: string) => void;
  onCreateContext: () => void;
  isActioning: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export function OrphanCard({
  unit,
  projectId,
  contexts,
  onUnitClick,
  onRecover,
  onCreateContext,
  isActioning,
}: OrphanCardProps) {
  const createdAt = typeof unit.createdAt === "string" ? new Date(unit.createdAt) : unit.createdAt;

  const { data: suggestions, isLoading: sugLoading } =
    api.ai.suggestContextForUnit.useQuery(
      { unitId: unit.id, projectId },
      { enabled: !!projectId, retry: false, staleTime: 5 * 60 * 1000 },
    );

  return (
    <div className="rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UnitTypeBadge unitType={unit.unitType as UnitType} />
          {unit.isolationScore >= 1 && (
            <span className="rounded-full bg-accent-warning/10 px-2 py-0.5 text-[10px] font-medium text-accent-warning">
              fully isolated
            </span>
          )}
        </div>
        <span className="text-xs text-text-tertiary">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onUnitClick(unit.id)}
        className="text-left w-full mb-3"
      >
        <p className="text-sm text-text-primary leading-relaxed line-clamp-3 hover:text-accent-primary transition-colors">
          {unit.content}
        </p>
      </button>

      {/* AI Context Suggestions */}
      {sugLoading && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Finding matching contexts...
        </div>
      )}
      {suggestions && (suggestions.suggestions.length > 0 || suggestions.newContextName) && (
        <div className="mb-3 rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-accent-primary">
            <Compass className="h-3 w-3" />
            AI Suggested Contexts
          </div>
          {suggestions.suggestions.map((s) => (
            <button
              key={s.contextId}
              type="button"
              disabled={isActioning || s.alreadyLinked}
              onClick={() => onRecover("context", s.contextId)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                s.alreadyLinked
                  ? "opacity-40 cursor-not-allowed text-text-tertiary"
                  : "text-text-secondary hover:bg-accent-primary/10 hover:text-accent-primary",
              )}
            >
              <Layers className="h-3 w-3 shrink-0 text-accent-primary" />
              <span className="flex-1 truncate">{s.contextName}</span>
              <span className="shrink-0 rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
                {Math.round(s.confidence * 100)}%
              </span>
              {s.alreadyLinked && (
                <span className="text-[10px] text-text-tertiary">(linked)</span>
              )}
            </button>
          ))}
          {suggestions.newContextName && (
            <button
              type="button"
              disabled={isActioning}
              onClick={onCreateContext}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-accent-primary/10 hover:text-accent-primary transition-colors"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-accent-primary" />
              <span className="flex-1 truncate">New: {suggestions.newContextName}</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <ContextPicker
          contexts={contexts}
          onSelect={(ctxId) => onRecover("context", ctxId)}
          disabled={isActioning}
        />
        <ActionButton
          icon={<Layers className="h-3.5 w-3.5" />}
          label="New Context"
          onClick={onCreateContext}
          disabled={isActioning}
        />
        <ActionButton
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Incubate"
          onClick={() => onRecover("incubate")}
          disabled={isActioning}
        />
        <ActionButton
          icon={<Archive className="h-3.5 w-3.5" />}
          label="Archive"
          onClick={() => onRecover("archive")}
          disabled={isActioning}
        />
        <ActionButton
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          onClick={() => onRecover("delete")}
          disabled={isActioning}
          danger
        />
      </div>
    </div>
  );
}

