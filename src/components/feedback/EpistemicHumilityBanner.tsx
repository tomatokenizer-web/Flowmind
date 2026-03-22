"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────

interface EpistemicHumilityBannerProps {
  /** The unit content to analyse */
  content: string;
  /** Unique key used to track dismissal per unit */
  unitId: string;
  className?: string;
}

// ─── Suggestions list ────────────────────────────────────────────────

const SUGGESTIONS = [
  "Add qualifying language (e.g., \"some argue\", \"evidence suggests\")",
  "Consider counterarguments and opposing perspectives",
  "Cite sources or flag assumptions explicitly",
  "Use hedged claims where certainty is not established",
];

// ─── Component ───────────────────────────────────────────────────────

export function EpistemicHumilityBanner({
  content,
  unitId,
  className,
}: EpistemicHumilityBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const detection = api.ai.detectControversialTopic.useMutation();

  // Run detection when content changes (debounced)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Reset dismissal when unitId changes
    setDismissed(false);
    setExpanded(false);
  }, [unitId]);

  React.useEffect(() => {
    if (!content?.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      detection.mutate({ content });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const result = detection.data;

  if (dismissed || !result?.isControversial) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-700/50",
        "px-3 py-2 text-xs",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            This topic may benefit from multiple perspectives
          </p>
          {result.reasons.length > 0 && (
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/70 truncate">
              {result.reasons[0]}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle suggestions */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "rounded p-0.5 text-amber-600 dark:text-amber-400",
              "hover:bg-amber-100 dark:hover:bg-amber-900/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            )}
            aria-label={expanded ? "Collapse suggestions" : "Show suggestions"}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={cn(
              "rounded p-0.5 text-amber-600 dark:text-amber-400",
              "hover:bg-amber-100 dark:hover:bg-amber-900/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            )}
            aria-label="Dismiss this notice"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collapsible suggestions */}
      {expanded && (
        <ul className="mt-2 space-y-1 border-t border-amber-300/40 pt-2">
          {SUGGESTIONS.map((s) => (
            <li
              key={s}
              className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400/90"
            >
              <span className="mt-0.5 shrink-0 text-[10px] leading-none">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
