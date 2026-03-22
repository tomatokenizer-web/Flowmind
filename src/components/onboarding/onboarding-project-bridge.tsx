"use client";

import { useProjectId, useProjectLoading } from "~/contexts/project-context";
import { OnboardingOverlay } from "./onboarding-overlay";

/**
 * Bridge component that connects OnboardingOverlay to the ProjectContext.
 * Mounted in the app layout — renders the overlay only when a project is loaded.
 */
export function OnboardingProjectBridge() {
  const projectId = useProjectId();
  const isLoading = useProjectLoading();

  if (isLoading || !projectId) return null;

  return <OnboardingOverlay projectId={projectId} />;
}
