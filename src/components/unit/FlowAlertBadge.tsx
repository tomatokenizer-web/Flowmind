"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertCircle } from "lucide-react";

interface FlowAlertBadgeProps {
  unitType: string;
  relationCount: number;
}

export function FlowAlertBadge({ unitType, relationCount }: FlowAlertBadgeProps) {
  if (relationCount > 0) return null;

  const messages: Record<string, string> = {
    claim: "This claim has no supporting evidence",
    question: "This question has no answer yet",
    evidence: "This evidence is not connected to any claim",
  };

  const message = messages[unitType];
  if (!message) return null;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-accent-warning">
            <AlertCircle className="h-3 w-3" />
            <span className="hidden sm:inline">Gap detected</span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-lg bg-bg-elevated px-3 py-2 text-xs text-text-primary shadow-md"
            sideOffset={4}
          >
            {message}
            <Tooltip.Arrow className="fill-bg-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
