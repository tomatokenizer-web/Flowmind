"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

/* ─── Types ─── */

interface SparkLineProps extends React.SVGAttributes<SVGSVGElement> {
  /** Data points (7-14 values) */
  data: number[];
  /** Stroke color — defaults to accent-primary CSS var */
  color?: string;
  /** Width of the SVG */
  width?: number;
  /** Height of the SVG */
  height?: number;
  /** Whether to show gradient fill below the line */
  showFill?: boolean;
  /** Line stroke width */
  strokeWidth?: number;
}

/* ─── Component ─── */

export function SparkLine({
  data,
  color,
  width = 80,
  height = 24,
  showFill = true,
  strokeWidth = 1.5,
  className,
  ...props
}: SparkLineProps) {
  const gradientId = React.useId();

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * innerWidth,
    y: padding + innerHeight - ((value - min) / range) * innerHeight,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const fillPath = [
    linePath,
    `L ${points[points.length - 1]!.x.toFixed(1)} ${height}`,
    `L ${points[0]!.x.toFixed(1)} ${height}`,
    "Z",
  ].join(" ");

  const strokeColor = color ?? "var(--accent-primary)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {showFill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={linePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1]!.x}
        cy={points[points.length - 1]!.y}
        r={2}
        fill={strokeColor}
      />
    </svg>
  );
}

SparkLine.displayName = "SparkLine";
