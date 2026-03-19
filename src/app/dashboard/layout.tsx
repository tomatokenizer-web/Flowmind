import { AppShell } from "~/components/layout/app-shell";
import { ToastProvider } from "~/components/shared/toast";
import { GlobalKeyboardShortcuts } from "~/components/shared/global-keyboard-shortcuts";
import { ProjectProvider } from "~/contexts/project-context";
import { CommandPalette } from "~/components/search";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <AppShell>
        {children}
        <ToastProvider />
        <GlobalKeyboardShortcuts />
        <CommandPalette />
      </AppShell>
    </ProjectProvider>
  );
}
