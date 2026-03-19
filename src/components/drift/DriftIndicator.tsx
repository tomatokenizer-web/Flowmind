"use client";

import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";

interface DriftIndicatorProps {
  driftScore: number;
  threshold?: number;
  className?: string;
}

export function DriftIndicator({ driftScore, threshold = 0.7, className }: DriftIndicatorProps) {
  if (driftScore < threshold) return null;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-accent-warning/10 px-2 py-0.5 text-xs font-medium text-accent-warning",
              className,
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            Drifting
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-lg bg-bg-elevated px-3 py-2 text-xs text-text-primary shadow-md"
            sideOffset={4}
          >
            This unit may be drifting from your project&apos;s purpose (score: {Math.round(driftScore * 100)}%).
            Consider moving it to a different context or branching a new project.
            <Tooltip.Arrow className="fill-bg-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
