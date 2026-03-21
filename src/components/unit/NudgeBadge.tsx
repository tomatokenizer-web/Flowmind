"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Lightbulb } from "lucide-react";
import type { UnitType } from "@prisma/client";

interface NudgeBadgeProps {
  unitType: UnitType;
  content: string;
  lifecycle: string;
  relationCount: number;
}

/**
 * Client-side nudge checks — no AI call required, just pattern matching.
 *
 * Checks:
 * 1. Unit typed as "claim" but content looks like a question.
 * 2. Confirmed unit with 0 relations (isolated).
 * 3. Confirmed unit with very short content (< 20 chars).
 */
function getNudge(
  unitType: UnitType,
  content: string,
  lifecycle: string,
  relationCount: number
): string | null {
  const trimmed = content.trim();

  // Check 1: claim that looks like a question
  if (unitType === "claim") {
    const endsWithQuestion = trimmed.endsWith("?");
    const startsWithInterrogative = /^(what|why|how|when|where|who|which|is|are|does|do|did|can|could|would|should)\b/i.test(trimmed);
    if (endsWithQuestion || startsWithInterrogative) {
      return 'This reads like a question. Consider changing the type to "question".';
    }
  }

  // Check 2: confirmed unit with no relations
  if (lifecycle === "confirmed" && relationCount === 0) {
    return "This confirmed unit has no relations. Connect it to related thoughts to strengthen the context.";
  }

  // Check 3: confirmed unit with very short content
  if (lifecycle === "confirmed" && trimmed.length < 20) {
    return "This unit is very short. Consider expanding it for more clarity.";
  }

  return null;
}

export function NudgeBadge({ unitType, content, lifecycle, relationCount }: NudgeBadgeProps) {
  const nudge = getNudge(unitType, content, lifecycle, relationCount);
  if (!nudge) return null;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className="inline-flex items-center gap-1 text-xs text-amber-600 cursor-default"
            aria-label="Nudge suggestion available"
          >
            <Lightbulb className="h-3 w-3" aria-hidden="true" />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-lg bg-bg-elevated px-3 py-2 text-xs text-text-primary shadow-md"
            sideOffset={4}
          >
            {nudge}
            <Tooltip.Arrow className="fill-bg-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
