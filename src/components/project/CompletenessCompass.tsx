"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, ChevronUp, Lightbulb, Radar } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useProjectId } from "~/contexts/project-context";

// ─── Radial SVG progress ring (trigger) ──────────────────────────

function ProgressRing({
  percentage,
  size = 36,
  strokeWidth = 3,
  color = "#3B82F6",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const cx = size / 2;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={cx}
        cy={cx}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={cx}
        cy={cx}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Radar chart math ─────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

const AXIS_COUNT = 6;
const AXIS_ANGLES = Array.from({ length: AXIS_COUNT }, (_, i) => i * 60);
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0];
const AXIS_LABELS = [
  "Evidence",
  "Counter",
  "Definitions",
  "Assumptions",
  "Questions",
  "Scope",
];

interface RadarChartProps {
  /** Scores in the same order as AXIS_LABELS, each 0-100 */
  scores: number[];
  size?: number;
}

function RadarChart({ scores, size = 200 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 28; // leave room for labels
  const labelR = maxR + 18;

  /** Build a polygon path string for a given set of fractional values (0-1) */
  function polygonPath(fractions: number[]): string {
    return fractions
      .map((f, i) => {
        const { x, y } = polarToCartesian(cx, cy, f * maxR, AXIS_ANGLES[i]!);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label="Radar chart showing dimension scores"
    >
      {/* Grid polygons */}
      {GRID_LEVELS.map((level) => (
        <path
          key={level}
          d={polygonPath(Array(AXIS_COUNT).fill(level) as number[])}
          fill="none"
          className="stroke-text-tertiary"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {AXIS_ANGLES.map((angle, i) => {
        const end = polarToCartesian(cx, cy, maxR, angle);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            className="stroke-text-tertiary"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={polygonPath(scores.map((s) => s / 100))}
        className="fill-accent-primary/20 stroke-accent-primary"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {scores.map((s, i) => {
        const { x, y } = polarToCartesian(cx, cy, (s / 100) * maxR, AXIS_ANGLES[i]!);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            className="fill-accent-primary"
          />
        );
      })}

      {/* Axis labels */}
      {AXIS_LABELS.map((label, i) => {
        const { x, y } = polarToCartesian(cx, cy, labelR, AXIS_ANGLES[i]!);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-secondary text-[9px]"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Score color helpers ──────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-green-500/10";
  if (score >= 50) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function overallColor(score: number) {
  if (score >= 75) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#3B82F6";
}

// ─── Dimension row ────────────────────────────────────────────────

interface DimensionRowProps {
  label: string;
  score: number;
  numerator: number;
  denominator: number;
  gaps: string[];
}

function DimensionRow({ label, score, numerator, denominator, gaps }: DimensionRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const hasGaps = gaps.length > 0;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between py-1.5 text-left text-sm",
          hasGaps && "cursor-pointer hover:bg-bg-secondary/50",
          !hasGaps && "cursor-default",
        )}
        onClick={() => hasGaps && setExpanded((v) => !v)}
        aria-expanded={hasGaps ? expanded : undefined}
      >
        <span className="text-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            {numerator}/{denominator}
          </span>
          <span
            className={cn(
              "inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-medium",
              scoreBg(score),
              scoreColor(score),
            )}
          >
            {score}%
          </span>
          {hasGaps && (
            expanded ? (
              <ChevronUp className="h-3 w-3 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-3 w-3 text-text-tertiary" />
            )
          )}
        </div>
      </button>

      {expanded && hasGaps && (
        <ul className="mb-1.5 ml-3 space-y-0.5 text-xs text-text-tertiary">
          {gaps.map((gap, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-0.5 shrink-0">-</span>
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function CompletenessCompass({ className }: { className?: string }) {
  const projectId = useProjectId();
  const [open, setOpen] = React.useState(false);

  const { data } = api.compass.calculate.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const overall = data?.overall ?? 0;
  const color = overallColor(overall);

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
          aria-label={`Completeness: ${overall}%`}
          title="Completeness Compass"
        >
          <ProgressRing percentage={overall} color={color} />
          <span
            className="absolute text-[9px] font-bold"
            style={{ color }}
          >
            {overall}%
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-xl border border-border bg-bg-surface p-4 shadow-lg"
          sideOffset={6}
          align="end"
        >
          {/* Header */}
          <div className="mb-3 flex items-center gap-2">
            <Radar className="h-4 w-4 text-accent-primary" />
            <p className="font-heading font-semibold text-text-primary">
              Completeness Compass
            </p>
          </div>

          {data ? (
            <div className="space-y-3">
              {/* Overall score */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold" style={{ color }}>
                  {overall}%
                </span>
                <span className="text-xs text-text-tertiary">overall</span>
              </div>

              {/* Radar chart */}
              <RadarChart
                scores={data.dimensions.map((d) => d.score)}
              />

              {/* Dimension list */}
              <div className="rounded-lg border border-border/50 px-2 py-1">
                {data.dimensions.map((dim) => (
                  <DimensionRow
                    key={dim.name}
                    label={dim.label}
                    score={dim.score}
                    numerator={dim.numerator}
                    denominator={dim.denominator}
                    gaps={dim.gaps}
                  />
                ))}
              </div>

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-text-secondary">
                      Top suggestions
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-text-tertiary">
                    {data.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0 text-accent-primary">
                          {i + 1}.
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">
              No data yet. Start capturing thoughts!
            </p>
          )}

          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
