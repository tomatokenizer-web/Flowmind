import { AppShell } from "~/components/layout/app-shell";
import { ToastProvider } from "~/components/shared/toast";
import { GlobalKeyboardShortcuts } from "~/components/shared/global-keyboard-shortcuts";
import { OnboardingOverlay } from "~/components/onboarding/onboarding-overlay";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <OnboardingOverlay projectId="default" />
      <ToastProvider />
      <GlobalKeyboardShortcuts />
    </AppShell>
  );
}
