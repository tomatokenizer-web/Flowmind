"use client";

import * as React from "react";
import { Gauge } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

// ─── Proactive Budget HUD ──────────────────────────────────────────
//
// Compact toolbar indicator per DEC-2026-002 §8.
// Shows today's proactive-surfacing budget consumption so the user can
// see at a glance how much AI intervention they have "left" for the day.

interface ProactiveBudgetHUDProps {
  className?: string;
}

export function ProactiveBudgetHUD({ className }: ProactiveBudgetHUDProps) {
  const { data, isLoading } = api.proactive.getBudgetStatus.useQuery(
    undefined,
    {
      // Refresh every 30s so the HUD reflects new scheduler writes from
      // other tabs / async jobs without spamming the API.
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  );

  if (isLoading || !data) {
    return null;
  }

  const { budgetUsed, budgetTotal, budgetRemaining, surfacedToday } = data;
  const ratio = budgetTotal > 0 ? budgetUsed / budgetTotal : 0;

  // Color progression: green → amber → red as budget is consumed.
  const toneClass =
    ratio >= 1
      ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
      : ratio >= 0.6
        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

  const title = `Proactive budget: ${budgetUsed}/${budgetTotal} used today (${budgetRemaining} remaining, ${surfacedToday} proposals surfaced)`;

  return (
    <div
      role="status"
      aria-label={title}
      title={title}
      className={cn(
        "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums",
        toneClass,
        className,
      )}
    >
      <Gauge className="h-3 w-3" aria-hidden="true" />
      <span>
        {budgetUsed}/{budgetTotal}
      </span>
    </div>
  );
}
