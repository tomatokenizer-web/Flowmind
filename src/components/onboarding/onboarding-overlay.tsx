"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useOnboarding } from "~/hooks/use-onboarding";
import { api } from "~/trpc/react";
import {
  FirstCaptureExperience,
  AIDecompositionHint,
  TourTooltip,
} from "./onboarding-steps";

interface OnboardingOverlayProps {
  projectId: string;
}

/**
 * Orchestrates the full onboarding flow:
 * 1. First-capture: full-screen single-input experience
 * 2. Tour: 3-step tooltip spotlight tour
 * 3. AI hint: informational callout after first unit
 *
 * Renders nothing for returning users.
 */
export function OnboardingOverlay({ projectId }: OnboardingOverlayProps) {
  const {
    phase,
    isFirstTime,
    isLoading,
    startTour,
    completeTour,
    skipTour,
    tourStep,
    nextStep,
    totalSteps,
  } = useOnboarding();

  const [showAIHint, setShowAIHint] = React.useState(false);
  const utils = api.useUtils();

  const submitMutation = api.capture.submit.useMutation({
    onSuccess: async () => {
      await utils.unit.list.invalidate();
      setShowAIHint(true);
      // Brief delay so the unit card renders before tour starts
      setTimeout(() => startTour(), 600);
    },
  });

  const handleFirstCapture = React.useCallback(
    (text: string) => {
      submitMutation.mutate({
        content: text,
        projectId,
        mode: "capture",
      });
    },
    [projectId, submitMutation],
  );

  // Don't render anything for returning users or while loading
  if (isLoading || !isFirstTime) {
    // Still show AI hint if it was triggered during this session
    if (showAIHint && phase !== "first-capture") {
      return (
        <AnimatePresence>
          <AIDecompositionHint onDismiss={() => setShowAIHint(false)} />
        </AnimatePresence>
      );
    }
    return null;
  }

  return (
    <>
      {/* Phase 1: Full-screen first capture */}
      <AnimatePresence>
        {phase === "first-capture" && (
          <>
            <FirstCaptureExperience
              onSubmit={handleFirstCapture}
              isSubmitting={submitMutation.isPending}
            />
            {/* Skip button — lets devs/testers bypass onboarding */}
            <button
              type="button"
              onClick={skipTour}
              className="fixed bottom-6 right-6 z-[200] rounded-lg bg-black/30 px-4 py-2 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              Skip intro →
            </button>
          </>
        )}
      </AnimatePresence>

      {/* Phase 2: Tooltip tour */}
      <AnimatePresence>
        {phase === "tour" && (
          <TourTooltip
            step={tourStep}
            totalSteps={totalSteps}
            onNext={nextStep}
            onSkip={skipTour}
          />
        )}
      </AnimatePresence>

      {/* AI Hint (shown after first unit creation, persists through tour) */}
      <AnimatePresence>
        {showAIHint && phase !== "first-capture" && (
          <AIDecompositionHint onDismiss={() => setShowAIHint(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
