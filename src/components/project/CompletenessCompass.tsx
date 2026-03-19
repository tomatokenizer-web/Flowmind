"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useProjectId } from "~/contexts/project-context";

// ─── Radial SVG progress ring ─────────────────────────────────────

function ProgressRing({ percentage, size = 36, strokeWidth = 3, color = "#3B82F6" }: {
  percentage: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const cx = size / 2;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={cx} cy={cx} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function CompletenessCompass({ className }: { className?: string }) {
  const projectId = useProjectId();
  const [open, setOpen] = React.useState(false);

  const { data: stats } = api.project.getCompletenessStats.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const pct = Math.round((stats?.completeness ?? 0) * 100);
  const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#3B82F6";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            className,
          )}
          aria-label={`Completeness: ${pct}%`}
          title="Completeness Compass"
        >
          <ProgressRing percentage={pct} color={color} />
          <span className="absolute text-[9px] font-bold" style={{ color }}>
            {pct}%
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-xl border border-border bg-bg-surface p-4 shadow-lg"
          sideOffset={6}
          align="end"
        >
          <p className="mb-3 font-heading font-semibold text-text-primary">Completeness Compass</p>

          {stats ? (
            <div className="space-y-2">
              {Object.entries(stats.stats)
                .filter(([, count]) => count > 0)
                .map(([lifecycle, count]) => (
                  <div key={lifecycle} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-text-secondary">{lifecycle}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-primary"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs text-text-tertiary">{count}</span>
                    </div>
                  </div>
                ))}
              <div className="mt-3 border-t border-border pt-3 text-xs text-text-tertiary">
                {stats.total} total units · {pct}% confirmed or complete
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No units yet. Start capturing thoughts!</p>
          )}

          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
