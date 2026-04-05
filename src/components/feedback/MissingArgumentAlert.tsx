"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface Gap {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
}

interface MissingArgumentAlertProps {
  contextId: string;
  /** Called when user clicks a quick-create action for a gap */
  onCreateUnit?: (content: string, unitType: string) => void;
  className?: string;
}

// ─── Severity config ─────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Gap["severity"],
  { label: string; badgeClass: string; iconClass: string }
> = {
  high: {
    label: "High",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    iconClass: "text-red-500",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    iconClass: "text-amber-500",
  },
  low: {
    label: "Low",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    iconClass: "text-blue-400",
  },
};

// Map gap types to suggested unit types for quick-create
const GAP_UNIT_TYPE: Record<string, string> = {
  missing_evidence: "evidence",
  missing_counterargument: "counterargument",
  unconnected_evidence: "claim",
  no_questions: "question",
};

// Map gap types to quick-create prompt text
const GAP_CREATE_LABEL: Record<string, string> = {
  missing_evidence: "Add evidence",
  missing_counterargument: "Add counterargument",
  unconnected_evidence: "Add claim",
  no_questions: "Add question",
};

// ─── Component ───────────────────────────────────────────────────────

export function MissingArgumentAlert({
  contextId,
  onCreateUnit,
  className,
}: MissingArgumentAlertProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const { data, isLoading } = api.ai.detectMissingArguments.useQuery(
    { contextId },
    { enabled: !!contextId, retry: false },
  );

  const gaps: Gap[] = data?.gaps ?? [];

  // Don't render anything while loading or when there are no gaps
  if (isLoading || gaps.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10",
        className,
      )}
      role="region"
      aria-label="Missing argument alerts"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium",
          "text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-800/20",
          "transition-colors rounded-lg",
          !collapsed && "rounded-b-none",
        )}
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Argument gaps detected ({gaps.length})
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Gap list */}
      {!collapsed && (
        <ul className="divide-y divide-amber-100 dark:divide-amber-800/30">
          {gaps.map((gap, i) => {
            const config = SEVERITY_CONFIG[gap.severity];
            const unitType = GAP_UNIT_TYPE[gap.type];
            const createLabel = GAP_CREATE_LABEL[gap.type];

            return (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle
                    className={cn("h-3.5 w-3.5 shrink-0", config.iconClass)}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-text-primary truncate">{gap.message}</span>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                      config.badgeClass,
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                {onCreateUnit && unitType && createLabel && (
                  <button
                    type="button"
                    onClick={() =>
                      onCreateUnit(
                        `${createLabel.replace("Add ", "")} for this context`,
                        unitType,
                      )
                    }
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1",
                      "text-xs font-medium text-accent-primary border border-accent-primary/30",
                      "hover:bg-accent-primary/10 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    )}
                    aria-label={`${createLabel} to address this gap`}
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    {createLabel}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
