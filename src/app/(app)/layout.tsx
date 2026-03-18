import { AppShell } from "~/components/layout/app-shell";
import { ToastProvider } from "~/components/shared/toast";
import { GlobalKeyboardShortcuts } from "~/components/shared/global-keyboard-shortcuts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ToastProvider />
      <GlobalKeyboardShortcuts />
    </AppShell>
  );
}
