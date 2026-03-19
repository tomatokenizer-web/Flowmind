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

function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

function markOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  localStorage.setItem(ONBOARDING_TIMESTAMP_KEY, new Date().toISOString());
}

const TOTAL_STEPS = 3;

export function useOnboarding(): UseOnboardingReturn {
  const [phase, setPhase] = useState<OnboardingPhase>("idle");
  const [tourStep, setTourStep] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    setAlreadyCompleted(isOnboardingCompleted());
  }, []);

  // Check if user has zero items — retry:false prevents console spam on 401 while session loads
  const { data: hasAnyData, isLoading } = api.unit.hasAny.useQuery(undefined, {
    enabled: !alreadyCompleted,
    retry: false,
  });

  const hasZeroitems = !isLoading && hasAnyData?.hasAny === false;
  const isFirstTime = !alreadyCompleted && hasZeroitems;

  // Set initial phase based on first-time detection
  useEffect(() => {
    if (isFirstTime && phase === "idle") {
      setPhase("first-capture");
    }
  }, [isFirstTime, phase]);

  const startTour = useCallback(() => {
    setPhase("tour");
    setTourStep(0);
  }, []);

  const completeTour = useCallback(() => {
    markOnboardingCompleted();
    setPhase("completed");
    setAlreadyCompleted(true);
  }, []);

  const skipTour = useCallback(() => {
    markOnboardingCompleted();
    setPhase("completed");
    setAlreadyCompleted(true);
  }, []);

  const nextStep = useCallback(() => {
    setTourStep((prev) => {
      if (prev >= TOTAL_STEPS - 1) {
        markOnboardingCompleted();
        setPhase("completed");
        setAlreadyCompleted(true);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  return {
    phase,
    isFirstTime,
    isLoading: !alreadyCompleted && isLoading,
    startTour,
    completeTour,
    skipTour,
    tourStep,
    nextStep,
    totalSteps: TOTAL_STEPS,
  };
}


