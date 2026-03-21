"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, GitBranch, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { toast } from "~/lib/toast";

interface BranchProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProjectId: string;
  /** Units pre-selected (e.g. drifting units). At least one required. */
  preselectedUnitIds: string[];
  /** All available units in the current project to optionally include */
  availableUnits?: Array<{ id: string; content: string; unitType: string }>;
  onSuccess?: (newProjectId: string) => void;
}

export function BranchProjectDialog({
  open,
  onOpenChange,
  sourceProjectId,
  preselectedUnitIds,
  availableUnits = [],
  onSuccess,
}: BranchProjectDialogProps) {
  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [includeShared, setIncludeShared] = React.useState(true);

  // selectedUnitIds starts from preselectedUnitIds; user can toggle shared units
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(preselectedUnitIds),
  );

  // Sync when preselectedUnitIds changes (dialog re-opened with different units)
  React.useEffect(() => {
    setSelectedIds(new Set(preselectedUnitIds));
  }, [preselectedUnitIds, open]);

  const branchProject = api.feedback.branchProject.useMutation({
    onSuccess: (result) => {
      toast.success("Project branched", {
        description: `"${name}" created successfully.`,
      });
      onOpenChange(false);
      onSuccess?.(result.newProject.id);
      // Reset form
      setName("");
      setPurpose("");
    },
    onError: (err) => {
      toast.error("Branch failed", { description: err.message });
    },
  });

  const sharedUnits = availableUnits.filter((u) => !preselectedUnitIds.includes(u.id));

  const handleToggleSharedUnit = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleIncludeSharedToggle = (checked: boolean) => {
    setIncludeShared(checked);
    if (checked) {
      setSelectedIds((prev) => new Set([...prev, ...sharedUnits.map((u) => u.id)]));
    } else {
      setSelectedIds(new Set(preselectedUnitIds));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unitIds = Array.from(selectedIds);
    if (unitIds.length === 0) {
      toast.error("Select at least one unit to branch");
      return;
    }
    branchProject.mutate({
      sourceProjectId,
      unitIds,
      name: name.trim(),
      purpose: purpose.trim() || undefined,
    });
  };

  const canSubmit = name.trim().length > 0 && selectedIds.size > 0 && !branchProject.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-bg-surface p-6 shadow-xl",
            "max-h-[85vh] flex flex-col",
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-accent-primary" />
              <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
                Branch to New Project
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            {/* Project name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="branch-name">
                Project name <span className="text-accent-danger">*</span>
              </label>
              <input
                id="branch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Focused research on AI ethics"
                maxLength={200}
                required
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            {/* Purpose / description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="branch-purpose">
                Purpose <span className="text-text-tertiary">(optional)</span>
              </label>
              <textarea
                id="branch-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why are you branching this project?"
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            {/* Pre-selected units (read-only summary) */}
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">
                Units from current context{" "}
                <span className="text-xs font-normal text-text-tertiary">
                  ({preselectedUnitIds.length} pre-selected)
                </span>
              </p>
              <p className="text-xs text-text-secondary">
                These drifting units will be moved to the new project with drift score reset to 0.
              </p>
            </div>

            {/* Include shared units checkbox */}
            {sharedUnits.length > 0 && (
              <div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={includeShared}
                    onChange={(e) => handleIncludeSharedToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-accent-primary"
                  />
                  <span className="text-sm text-text-primary">
                    Include shared units from current context{" "}
                    <span className="text-text-tertiary">({sharedUnits.length} units)</span>
                  </span>
                </label>

                {includeShared && (
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-bg-primary p-2">
                    {sharedUnits.map((u) => (
                      <label key={u.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-bg-hover">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => handleToggleSharedUnit(u.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-accent-primary"
                        />
                        <span className="min-w-0 text-xs text-text-secondary">
                          <span className="mr-1 capitalize text-accent-primary">{u.unitType}</span>
                          <span className="line-clamp-1">{u.content}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!canSubmit}>
                {branchProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <GitBranch className="h-4 w-4" />
                Branch Project
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
