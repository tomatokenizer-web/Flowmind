"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Loader2, Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "~/components/ui/button";

interface SalienceDashboardProps {
  projectId: string;
}

const TIER_CONFIG = {
  foreground: { label: "Foreground", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  background: { label: "Background", icon: Eye, color: "text-blue-400", bg: "bg-blue-400/10" },
  deep: { label: "Deep", icon: EyeOff, color: "text-zinc-500", bg: "bg-zinc-500/10" },
} as const;

type SalienceTier = keyof typeof TIER_CONFIG;

export function SalienceDashboard({ projectId }: SalienceDashboardProps) {
  // Use the high_salience attention view to get top units
  const highSalienceQuery = api.view.attention.useQuery(
    { name: "high_salience", projectId, limit: 50 },
    { enabled: !!projectId },
  );

  // Also fetch stale units for the "deep" tier
  const staleQuery = api.view.attention.useQuery(
    { name: "stale", projectId, limit: 50 },
    { enabled: !!projectId },
  );

  const isLoading = highSalienceQuery.isLoading || staleQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (highSalienceQuery.error) {
    return (
      <div className="text-center py-8 text-red-400 text-sm">
        Failed to load salience data
        <Button variant="outline" size="sm" className="mt-2" onClick={() => highSalienceQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const highUnits = highSalienceQuery.data ?? [];
  const staleUnits = staleQuery.data ?? [];

  if (highUnits.length === 0 && staleUnits.length === 0) {
    return <div className="text-center py-8 text-text-secondary text-sm">No units to display</div>;
  }

  const sections: { tier: SalienceTier; units: typeof highUnits}[] = [
    { tier: "foreground", units: highUnits.slice(0, 15) },
    { tier: "deep", units: staleUnits.slice(0, 15) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Salience Overview</h2>
        <div className="flex gap-3 text-xs text-text-secondary">
          <span className={cn("flex items-center gap-1", TIER_CONFIG.foreground.color)}>
            <Flame className="h-3 w-3" />
            {highUnits.length} High Salience
          </span>
          <span className={cn("flex items-center gap-1", TIER_CONFIG.deep.color)}>
            <EyeOff className="h-3 w-3" />
            {staleUnits.length} Stale
          </span>
        </div>
      </div>

      {sections.map(({ tier, units }) => {
        if (units.length === 0) return null;
        const config = TIER_CONFIG[tier];
        return (
          <div key={tier}>
            <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-2", config.color)}>
              {config.label} ({units.length})
            </h3>
            <div className="space-y-1">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded border border-border",
                    config.bg,
                  )}
                >
                  <div className="flex-1 text-sm text-text-primary truncate">
                    {unit.content}
                  </div>
                  <div className="text-xs text-text-secondary whitespace-nowrap">
                    {unit.unitType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
