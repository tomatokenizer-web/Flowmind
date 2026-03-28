"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

interface DocumentHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  shadowUnitId: string | null;
  sourceValid?: boolean;
  contextId?: string | null;
  onContextChange?: (contextId: string | null) => void;
  createdAt: Date | null;
  modifiedAt?: Date | null;
  updatedAt?: Date | null;
  onNavigateToUnit?: (unitId: string) => void;
  className?: string;
}

/* ─── Helpers ─── */

function formatTimestamp(date: Date | null): string {
  if (!date) return "--";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Component ─── */

export function DocumentHeader({
  title,
  onTitleChange,
  shadowUnitId,
  sourceValid,
  contextId,
  onContextChange,
  createdAt,
  modifiedAt,
  updatedAt,
  onNavigateToUnit,
  className,
}: DocumentHeaderProps) {
  const displayDate = modifiedAt ?? updatedAt ?? null;
  return (
    <div className={cn("border-b border-border px-6 py-4 space-y-3", className)}>
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled Document"
        className={cn(
          "w-full bg-transparent text-2xl font-bold text-text-primary",
          "placeholder:text-text-tertiary",
          "outline-none",
          "focus-visible:underline focus-visible:underline-offset-4 focus-visible:decoration-accent-primary/40",
        )}
        aria-label="Document title"
      />

      {/* Meta row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Shadow unit link */}
        {shadowUnitId && (
          <SimpleTooltip
            content={sourceValid ? "Shadow unit is up to date" : "Source has changed since last extraction"}
            side="bottom"
          >
            <button
              type="button"
              onClick={() => onNavigateToUnit?.(shadowUnitId)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
                "text-xs font-medium",
                "transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                sourceValid
                  ? "bg-accent-success/10 text-accent-success hover:bg-accent-success/20"
                  : "bg-accent-warning/10 text-accent-warning hover:bg-accent-warning/20",
              )}
              aria-label={`Shadow unit: ${sourceValid ? "valid" : "invalid source"}`}
            >
              {sourceValid ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Shadow Unit</span>
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
            </button>
          </SimpleTooltip>
        )}

        {!shadowUnitId && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
              "text-xs font-medium",
              "bg-bg-secondary text-text-tertiary",
            )}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            No shadow unit
          </span>
        )}

        {/* Source validity badge (standalone when no shadow link needed) */}
        {shadowUnitId && !sourceValid && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
              "text-[10px] font-medium",
              "bg-accent-warning/10 text-accent-warning",
            )}
            role="status"
          >
            Source needs re-extraction
          </span>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-3 text-[10px] text-text-tertiary ml-auto">
          {createdAt && (
            <SimpleTooltip content={`Created: ${formatTimestamp(createdAt)}`} side="bottom">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Created {formatTimestamp(createdAt)}
              </span>
            </SimpleTooltip>
          )}
          {displayDate && (
            <SimpleTooltip content={`Modified: ${formatTimestamp(displayDate)}`} side="bottom">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Modified {formatTimestamp(displayDate)}
              </span>
            </SimpleTooltip>
          )}
        </div>
      </div>
    </div>
  );
}

DocumentHeader.displayName = "DocumentHeader";
