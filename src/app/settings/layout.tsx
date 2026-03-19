import { ProjectProvider } from "~/contexts/project-context";
import { ToastProvider } from "~/components/shared/toast";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="min-h-screen bg-bg-primary">
        {children}
        <ToastProvider />
      </div>
    </ProjectProvider>
  );
}
