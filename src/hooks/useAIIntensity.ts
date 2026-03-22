"use client";

import { api } from "~/trpc/react";

// ─── AI Intensity Levels ─────────────────────────────────────────────────────
//
// Maps the numeric interventionIntensity (0-100) stored in user_preferences
// to one of three discrete levels consumed by UI components.
//
//   Minimal  (0-33)  — AI only responds when explicitly asked
//   Balanced (34-66) — AI suggests type + relations on new units (default)
//   Proactive(67-100)— AI auto-suggests refinements, flags contradictions,
//                       shows branch potential

export type AIIntensityLevel = "minimal" | "balanced" | "proactive";

/** Canonical numeric value stored for each level */
export const INTENSITY_VALUES: Record<AIIntensityLevel, number> = {
  minimal: 0,
  balanced: 50,
  proactive: 100,
};

/** Convert the stored numeric value back to a discrete level */
export function intensityFromNumber(value: number): AIIntensityLevel {
  if (value <= 33) return "minimal";
  if (value <= 66) return "balanced";
  return "proactive";
}

/**
 * Returns the current AI intensity level for the authenticated user.
 *
 * Defaults to "balanced" while loading or when no preference is saved.
 */
export function useAIIntensity(): {
  level: AIIntensityLevel;
  isLoading: boolean;
} {
  const { data, isLoading } = api.user.getAIPreferences.useQuery();

  const level: AIIntensityLevel =
    data?.interventionIntensity !== undefined
      ? intensityFromNumber(data.interventionIntensity)
      : "balanced";

  return { level, isLoading };
}

/** True if the level is at least "balanced" (i.e. not minimal) */
export function isAtLeastBalanced(level: AIIntensityLevel): boolean {
  return level === "balanced" || level === "proactive";
}

/** True if the level is "proactive" */
export function isProactive(level: AIIntensityLevel): boolean {
  return level === "proactive";
}
