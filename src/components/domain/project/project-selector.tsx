"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  FolderOpen,
  Plus,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── Types ─── */

interface ProjectSelectorProps {
  /** Callback to create a new project */
  onCreateNew?: () => void;
  className?: string;
}

/* ─── Component ─── */

export function ProjectSelector({
  onCreateNew,
  className,
}: ProjectSelectorProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  const projectsQuery = api.project.list.useQuery();
  const projects = projectsQuery.data ?? [];

  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );

  if (projectsQuery.isLoading) {
    return (
      <div className={cn("px-3 py-2", className)}>
        <Skeleton height="36px" width="100%" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between gap-2 h-10 px-3",
            "text-text-primary font-medium",
            className,
          )}
          aria-label="Switch project"
        >
          <span className="flex items-center gap-2 truncate">
            <FolderOpen className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className="truncate">
              {activeProject?.name ?? "Select project"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>

        {projects.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-text-tertiary">
            No projects yet
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setActiveProject(project.id)}
                className={cn(isActive && "bg-bg-hover")}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FolderOpen className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-sm">{project.name}</span>
                    <span className="text-xs text-text-tertiary">
                      {project.counts?.inquiries ?? 0} inquiries
                    </span>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-accent-primary shrink-0" aria-hidden="true" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
        )}

        {onCreateNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateNew}>
              <Plus className="h-4 w-4 text-accent-primary" aria-hidden="true" />
              <span className="text-accent-primary">New project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
