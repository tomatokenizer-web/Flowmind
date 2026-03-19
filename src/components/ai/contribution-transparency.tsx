"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

// ─── Types ────────────────────────────────────────────────────────────────

interface ContributionTransparencyProps {
  contextId: string;
  className?: string;
  variant?: "bar" | "compact";
}

// ─── Component ────────────────────────────────────────────────────────────

export function ContributionTransparency({
  contextId,
  className,
  variant = "bar",
}: ContributionTransparencyProps) {
  const { data, isLoading } = api.ai.getContributionRatio.useQuery(
    { contextId },
    { enabled: !!contextId }
  );

  if (isLoading || !data || data.total === 0) {
    return null;
  }

  const userPercent = Math.round((data.userWritten / data.total) * 100);
  const aiApprovedPercent = Math.round((data.aiGenerated / data.total) * 100);
  const aiRefinedPercent = Math.round((data.aiRefined / data.total) * 100);
  const aiTotalPercent = aiApprovedPercent + aiRefinedPercent;
  const isWarning = data.ratio > 0.4;

  if (variant === "compact") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
              isWarning
                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary",
              className
            )}
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-500"
              aria-hidden
            />
            <span>{userPercent}%</span>
            <span className="text-text-tertiary">/</span>
            <span
              className="inline-block h-2 w-2 rounded-full bg-blue-500"
              aria-hidden
            />
            <span>{aiTotalPercent}%</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3"
          align="end"
          sideOffset={8}
        >
          <ContributionBreakdown data={data} isWarning={isWarning} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full flex-col gap-1.5 rounded-lg p-2 transition-colors",
            "hover:bg-bg-secondary",
            className
          )}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Contribution</span>
            {isWarning && (
              <span className="text-amber-600">AI &gt; 40%</span>
            )}
          </div>
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-bg-tertiary"
            role="progressbar"
            aria-valuenow={userPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Contribution breakdown"
          >
            {/* User written - green */}
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${userPercent}%` }}
            />
            {/* AI generated - blue */}
            <div
              className={cn(
                "transition-all duration-300",
                isWarning ? "bg-amber-500" : "bg-blue-500"
              )}
              style={{ width: `${aiApprovedPercent}%` }}
            />
            {/* AI refined - lighter blue */}
            <div
              className={cn(
                "transition-all duration-300",
                isWarning ? "bg-amber-400" : "bg-blue-400"
              )}
              style={{ width: `${aiRefinedPercent}%` }}
            />
          </div>
          <div className="flex gap-3 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              You {userPercent}%
            </span>
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isWarning ? "bg-amber-500" : "bg-blue-500"
                )}
              />
              AI {aiTotalPercent}%
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start" sideOffset={8}>
        <ContributionBreakdown data={data} isWarning={isWarning} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Breakdown Popover Content ────────────────────────────────────────────

function ContributionBreakdown({
  data,
  isWarning,
}: {
  data: {
    total: number;
    userWritten: number;
    aiGenerated: number;
    aiRefined: number;
    ratio: number;
  };
  isWarning: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-text-primary text-sm">
        Contribution Breakdown
      </h4>

      {isWarning && (
        <p className="text-xs text-amber-600 bg-amber-500/10 rounded px-2 py-1">
          AI contributions exceed 40%. Consider adding more of your own
          thoughts.
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            User written
          </span>
          <span className="font-medium text-text-primary">
            {data.userWritten}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            AI generated
          </span>
          <span className="font-medium text-text-primary">
            {data.aiGenerated}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
            AI refined
          </span>
          <span className="font-medium text-text-primary">
            {data.aiRefined}
          </span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1.5">
          <span className="text-text-secondary">Total</span>
          <span className="font-medium text-text-primary">{data.total}</span>
        </div>
      </div>
    </div>
  );
}
