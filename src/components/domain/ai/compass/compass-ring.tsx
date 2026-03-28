"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";

/* ─── Props ─── */

interface CompassRingProps {
  /** Completeness percentage (0-100) */
  value: number;
  /** Ring diameter in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Label below the percentage */
  label?: string;
  className?: string;
}

/* ─── Helpers ─── */

function getColor(pct: number): string {
  if (pct < 30) return "var(--accent-error, #ef4444)";
  if (pct < 70) return "var(--accent-warning, #f59e0b)";
  return "var(--accent-success, #22c55e)";
}

/* ─── Component ─── */

export function CompassRing({
  value,
  size = 120,
  strokeWidth = 6,
  label = "Complete",
  className,
}: CompassRingProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  const color = getColor(clampedValue);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedValue}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border, #333)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-semibold text-text-primary tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {clampedValue}%
        </motion.span>
        <span className="text-[10px] text-text-tertiary">{label}</span>
      </div>
    </div>
  );
}

CompassRing.displayName = "CompassRing";
