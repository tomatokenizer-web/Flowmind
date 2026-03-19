"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { FolderTree, ChevronDown, Plus, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useProjectId } from "~/contexts/project-context";
import { useProjectStore } from "~/stores/projectStore";
import { ProjectCreationDialog } from "./ProjectCreationDialog";

interface ProjectSelectorProps {
  collapsed?: boolean;
}

export function ProjectSelector({ collapsed = false }: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const currentProjectId = useProjectId();
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const { data: projects = [] } = api.project.list.useQuery();
  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (collapsed) {
    return (
      <div className="flex w-full items-center justify-center py-2" title={currentProject?.name ?? "Projects"}>
        <FolderTree className="h-5 w-5 shrink-0 text-text-tertiary" />
      </div>
    );
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5",
              "text-sm text-text-secondary",
              "hover:bg-bg-hover hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              "transition-colors duration-fast",
            )}
          >
            <FolderTree className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="flex-1 truncate text-left">
              {currentProject?.name ?? "My Thoughts"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={cn(
              "z-50 w-64 rounded-xl border border-border bg-bg-surface p-2 shadow-lg",
            )}
            sideOffset={4}
            align="start"
          >
            <div className="mb-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Your Projects
            </div>

            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setActiveProject(project.id);
                  setOpen(false);
                  // Reload page to refresh project context
                  window.location.reload();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                  "hover:bg-bg-hover transition-colors",
                  project.id === currentProjectId
                    ? "text-accent-primary"
                    : "text-text-primary",
                )}
              >
                {project.id === currentProjectId && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className={cn("flex-1 truncate", project.id !== currentProjectId && "pl-5")}>
                  {project.name}
                </span>
                <span className="text-xs text-text-tertiary">{project.unitCount} units</span>
              </button>
            ))}

            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={() => { setOpen(false); setCreateOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>

            <Popover.Arrow className="fill-bg-surface" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <ProjectCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(projectId) => {
          setActiveProject(projectId);
          window.location.reload();
        }}
      />
    </>
  );
}
