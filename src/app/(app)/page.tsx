"use client";

import * as React from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Skeleton } from "~/components/shared/skeleton";
import { OnboardingWizard } from "~/components/domain/onboarding";
import { ProjectDashboard } from "~/components/domain/dashboard";

export default function AppHomePage() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  // Check if onboarding was previously completed
  React.useEffect(() => {
    try {
      const complete = localStorage.getItem("flowmind-onboarding-complete");
      if (!complete) {
        setShowOnboarding(true);
      }
    } catch {
      // localStorage unavailable
    }
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton height="32px" width="200px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  if (activeProjectId) {
    return <ProjectDashboard />;
  }

  // No active project — prompt to select or create one
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-primary">
          Select a project to get started
        </h2>
        <p className="text-sm text-text-secondary max-w-md">
          Choose a project from the sidebar, or create a new one to begin
          capturing your thinking.
        </p>
      </div>
    </div>
  );
}
