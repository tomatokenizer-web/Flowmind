"use client";

import * as React from "react";
import { useDefaultProject } from "~/hooks/use-default-project";

interface ProjectContextValue {
  projectId: string | undefined;
  isLoading: boolean;
}

const ProjectContext = React.createContext<ProjectContextValue>({
  projectId: undefined,
  isLoading: true,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { projectId, isLoading } = useDefaultProject();
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
