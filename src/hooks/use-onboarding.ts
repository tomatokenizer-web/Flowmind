"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import {
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TIMESTAMP_KEY,
} from "~/lib/onboarding-config";

export type OnboardingPhase = "idle" | "first-capture" | "tour" | "completed";

interface UseOnboardingReturn {
  /** Current phase of the onboarding flow */
  phase: OnboardingPhase;
  /** Whether the user is a first-time user (zero items, onboarding not completed) */
  isFirstTime: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Advance from first-capture to tour phase */
  startTour: () => void;
  /** Mark the tour as completed */
  completeTour: () => void;
  /** Skip the tour entirely */
  skipTour: () => void;
  /** Current tour step index (0-based) */
  tourStep: number;
  /** Advance to the next tour step */
  nextStep: () => void;
  /** Total number of tour steps */
  totalSteps: number;
}

// ─── localStorage helpers ────────────────────────────────────────────

function localIsCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

function localMarkCompleted(): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  localStorage.setItem(ONBOARDING_TIMESTAMP_KEY, new Date().toISOString());
}

function localGetStep(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("flowmind_onboarding_step") ?? "0", 10);
}

function localSaveStep(step: number): void {
  localStorage.setItem("flowmind_onboarding_step", String(step));
}

const TOTAL_STEPS = 3;

// ─── Hook ────────────────────────────────────────────────────────────

export function useOnboarding(): UseOnboardingReturn {
  const [phase, setPhase] = useState<OnboardingPhase>("idle");
  const [tourStep, setTourStep] = useState(0);
  // Start assuming completed (avoids flash); will be corrected once data loads.
  const [alreadyCompleted, setAlreadyCompleted] = useState(true);

  // ── DB state (source of truth) ──────────────────────────────────────
  const { data: dbOnboarding, isLoading: isDbLoading } =
    api.user.getOnboardingState.useQuery(undefined, {
      retry: false,
      // Only relevant for authenticated sessions; silence 401 noise
      retryOnMount: false,
    });

  const saveStepMutation = api.user.saveOnboardingStep.useMutation();
  const completeOnboardingMutation = api.user.completeOnboarding.useMutation();

  // ── Resolve completed state: DB first, localStorage fallback ─────────
  useEffect(() => {
    if (isDbLoading) return;

    if (dbOnboarding !== undefined) {
      // DB responded — use it as the canonical source
      const completed = dbOnboarding.onboardingCompleted;
      setAlreadyCompleted(completed);
      if (!completed) {
        // Restore step from DB, fall back to localStorage
        const step = dbOnboarding.onboardingStep ?? localGetStep();
        setTourStep(step);
      }
    } else {
      // DB query unavailable (unauthenticated or network error) — fall back
      setAlreadyCompleted(localIsCompleted());
      setTourStep(localGetStep());
    }
  }, [isDbLoading, dbOnboarding]);

  // ── Check if user has zero captured units ────────────────────────────
  const { data: hasAnyData, isLoading: isUnitsLoading } =
    api.unit.hasAny.useQuery(undefined, {
      enabled: !alreadyCompleted && !isDbLoading,
      retry: false,
    });

  const hasZeroItems = !isUnitsLoading && hasAnyData?.hasAny === false;
  const isFirstTime = !alreadyCompleted && hasZeroItems;

  // Set initial phase based on first-time detection
  useEffect(() => {
    if (isFirstTime && phase === "idle") {
      setPhase("first-capture");
    }
  }, [isFirstTime, phase]);

  // ── Helpers that persist to DB + localStorage ─────────────────────────

  const persistCompleted = useCallback(() => {
    localMarkCompleted();
    completeOnboardingMutation.mutate(undefined);
  }, [completeOnboardingMutation]);

  const persistStep = useCallback(
    (step: number) => {
      localSaveStep(step);
      saveStepMutation.mutate({ step });
    },
    [saveStepMutation],
  );

  // ── Public API ────────────────────────────────────────────────────────

  const startTour = useCallback(() => {
    setPhase("tour");
    setTourStep(0);
    persistStep(0);
  }, [persistStep]);

  const completeTour = useCallback(() => {
    persistCompleted();
    setPhase("completed");
    setAlreadyCompleted(true);
  }, [persistCompleted]);

  const skipTour = useCallback(() => {
    persistCompleted();
    setPhase("completed");
    setAlreadyCompleted(true);
  }, [persistCompleted]);

  const nextStep = useCallback(() => {
    setTourStep((prev) => {
      const next = prev + 1;
      if (next >= TOTAL_STEPS) {
        persistCompleted();
        setPhase("completed");
        setAlreadyCompleted(true);
        return prev;
      }
      persistStep(next);
      return next;
    });
  }, [persistCompleted, persistStep]);

  return {
    phase,
    isFirstTime,
    isLoading: (!alreadyCompleted && isUnitsLoading) || isDbLoading,
    startTour,
    completeTour,
    skipTour,
    tourStep,
    nextStep,
    totalSteps: TOTAL_STEPS,
  };
}
