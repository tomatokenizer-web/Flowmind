import { AppShell } from "~/components/layout/app-shell";
import { ToastProvider } from "~/components/shared/toast";
import { GlobalKeyboardShortcuts } from "~/components/shared/global-keyboard-shortcuts";
import { ProjectProvider } from "~/contexts/project-context";
import { OnboardingProjectBridge } from "~/components/onboarding/onboarding-project-bridge";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <AppShell>
        {children}
        <ToastProvider />
        <GlobalKeyboardShortcuts />
        <OnboardingProjectBridge />
      </AppShell>
    </ProjectProvider>
  );
}
