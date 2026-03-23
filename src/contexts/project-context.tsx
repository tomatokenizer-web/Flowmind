"use client";

import * as React from "react";
import { useDefaultProject } from "~/hooks/use-default-project";
import { useProjectStore } from "~/stores/projectStore";
import { api } from "~/trpc/react";

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

  // Fetch all user projects to validate persisted ID belongs to current user
  const { data: userProjects, isLoading: projectsLoading } = api.project.list.useQuery(
    undefined,
    { staleTime: Infinity, retry: false },
  );

  // Check if persisted project belongs to current user
  const persistedIsValid = React.useMemo(() => {
    if (!persistedId || !userProjects) return false;
    return userProjects.some((p) => p.id === persistedId);
  }, [persistedId, userProjects]);

  // If persisted ID is invalid (not owned by current user), reset to server default
  React.useEffect(() => {
    if (persistedId && userProjects && !persistedIsValid) {
      if (serverDefaultId) {
        setActiveProject(serverDefaultId);
      } else {
        useProjectStore.getState().clearActiveProject();
      }
    }
  }, [persistedId, userProjects, persistedIsValid, serverDefaultId, setActiveProject]);

  // If no persisted selection, adopt the server default and persist it
  React.useEffect(() => {
    if (!persistedId && serverDefaultId) {
      setActiveProject(serverDefaultId);
    }
  }, [persistedId, serverDefaultId, setActiveProject]);

  // Only expose projectId once validated
  const projectId = (persistedIsValid ? persistedId : serverDefaultId) ?? undefined;
  const isLoading = serverLoading || projectsLoading;

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
