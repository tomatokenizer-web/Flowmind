"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  Layout,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DestructiveDialog } from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { RhetoricalFrame } from "~/hooks/use-assembly-editor";

/* ─── Frame Badge ─── */

const FRAME_COLORS: Record<string, string> = {
  ARGUMENT: "bg-unit-claim-bg text-unit-claim-accent",
  NARRATIVE: "bg-unit-observation-bg text-unit-observation-accent",
  ANALYSIS: "bg-unit-evidence-bg text-unit-evidence-accent",
  COMPARISON: "bg-unit-question-bg text-unit-question-accent",
  SYNTHESIS: "bg-unit-idea-bg text-unit-idea-accent",
};

function FrameBadge({ frame }: { frame: string | null }) {
  if (!frame) return null;
  const colors = FRAME_COLORS[frame] ?? "bg-bg-secondary text-text-tertiary";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "text-[10px] font-medium leading-tight",
        colors,
      )}
    >
      <Layout className="h-3 w-3" aria-hidden="true" />
      {frame.charAt(0) + frame.slice(1).toLowerCase()}
    </span>
  );
}

/* ─── Types ─── */

interface AssemblyListItem {
  id: string;
  name: string;
  rhetoricalShape: string | null;
  _count?: { items: number };
  updatedAt: Date | string;
  createdAt: Date | string;
}

interface AssemblyListProps {
  onSelect: (id: string) => void;
  selectedId?: string | null;
  className?: string;
}

/* ─── Component ─── */

export function AssemblyList({
  onSelect,
  selectedId,
  className,
}: AssemblyListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const assembliesQuery = api.assembly.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const createMutation = api.assembly.create.useMutation({
    onSuccess: (data) => {
      assembliesQuery.refetch();
      if (data?.id) onSelect(data.id);
    },
  });
  const deleteMutation = api.assembly.delete.useMutation({
    onSuccess: () => {
      assembliesQuery.refetch();
    },
  });
  const exportMutation = api.assembly.export.useMutation();

  const assemblies = (assembliesQuery.data ?? []) as AssemblyListItem[];

  const handleCreate = () => {
    if (!activeProjectId) return;
    createMutation.mutate({ name: "Untitled Assembly", projectId: activeProjectId });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget });
    setDeleteTarget(null);
  };

  const handleDuplicate = (id: string) => {
    if (!activeProjectId) return;
    const source = assemblies.find((a) => a.id === id);
    if (!source) return;
    createMutation.mutate({
      name: `${source.name ?? "Untitled"} (Copy)`,
      projectId: activeProjectId,
    });
  };

  const handleExport = (id: string) => {
    exportMutation.mutate({
      assemblyId: id,
      format: "markdown",
      unitIds: [],
      contentHash: "",
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">
          Assemblies
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="text-xs gap-1.5"
          aria-label="Create new assembly"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {assembliesQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-text-tertiary">Loading...</span>
            </div>
          )}

          {!assembliesQuery.isLoading && assemblies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Layout className="h-8 w-8 text-text-tertiary/50" aria-hidden="true" />
              <p className="text-sm text-text-tertiary">No assemblies yet</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreate}
                className="text-xs"
              >
                Create your first assembly
              </Button>
            </div>
          )}

          {assemblies.map((assembly) => {
            const isSelected = selectedId === assembly.id;
            const itemCount = assembly._count?.items ?? 0;

            return (
              <motion.button
                key={assembly.id}
                type="button"
                onClick={() => onSelect(assembly.id)}
                className={cn(
                  "group/assembly flex w-full items-start gap-2 rounded-lg border p-2.5",
                  "text-left",
                  "transition-all duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  isSelected
                    ? "border-accent-primary bg-accent-primary/5"
                    : "border-border hover:border-border-focus/30 hover:bg-bg-hover",
                )}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.1 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-accent-primary" : "text-text-primary",
                      )}
                    >
                      {assembly.name || "Untitled Assembly"}
                    </span>
                    <FrameBadge frame={assembly.rhetoricalShape} />
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
                    <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                    <span>{formatDate(assembly.updatedAt)}</span>
                  </div>
                </div>

                {/* Context menu trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "shrink-0 rounded p-1",
                        "text-text-tertiary hover:text-text-secondary",
                        "opacity-0 group-hover/assembly:opacity-100",
                        "focus-visible:opacity-100",
                        "transition-all duration-fast",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      )}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Assembly actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleDuplicate(assembly.id)}>
                      <Copy className="mr-2 h-4 w-4 text-text-tertiary" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExport(assembly.id)}>
                      <Download className="mr-2 h-4 w-4 text-text-tertiary" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-accent-error focus:text-accent-error"
                      onSelect={() => setDeleteTarget(assembly.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete confirmation */}
      <DestructiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Assembly"
        description="This will permanently delete this assembly. The referenced units will not be affected."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

AssemblyList.displayName = "AssemblyList";
