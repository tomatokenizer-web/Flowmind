"use client";

import * as React from "react";
import { useDefaultProject } from "~/hooks/use-default-project";
import { useProjectStore } from "~/stores/projectStore";

interface ProjectContextValue {
  projectId: string | undefined;
  isLoading: boolean;
}

const ProjectContext = React.createContext<ProjectContextValue>({
  projectId: undefined,
  isLoading: true,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const persistedId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  // Always fetch the server default so we can seed the store on first visit
  const { projectId: serverDefaultId, isLoading: serverLoading } = useDefaultProject();

  // If no persisted selection, adopt the server default and persist it
  React.useEffect(() => {
    if (!persistedId && serverDefaultId) {
      setActiveProject(serverDefaultId);
    }
  }, [persistedId, serverDefaultId, setActiveProject]);

  // Persisted ID is canonical. Fall back to server default while store is being seeded.
  const projectId = persistedId ?? serverDefaultId;
  const isLoading = !persistedId && serverLoading;

  return (
    <ProjectContext.Provider value={{ projectId, isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectId(): string | undefined {
  return React.useContext(ProjectContext).projectId;
}

export function useProjectLoading(): boolean {
  return React.useContext(ProjectContext).isLoading;
}
