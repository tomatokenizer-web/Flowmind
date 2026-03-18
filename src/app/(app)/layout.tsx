import { AppShell } from "~/components/layout/app-shell";
import { ToastProvider } from "~/components/shared/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ToastProvider />
    </AppShell>
  );
}
