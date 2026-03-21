"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, GitCompare } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { AssemblyDiffView } from "./AssemblyDiffView";

interface AssemblyCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAssemblyAId: string;
  initialAssemblyBId: string;
  assemblies: Array<{ id: string; name: string }>;
}

export function AssemblyCompareDialog({
  open,
  onOpenChange,
  initialAssemblyAId,
  initialAssemblyBId,
  assemblies,
}: AssemblyCompareDialogProps) {
  const [assemblyAId, setAssemblyAId] = React.useState(initialAssemblyAId);
  const [assemblyBId, setAssemblyBId] = React.useState(initialAssemblyBId);

  // Sync when props change (dialog re-opened from a different card)
  React.useEffect(() => {
    setAssemblyAId(initialAssemblyAId);
    setAssemblyBId(initialAssemblyBId);
  }, [initialAssemblyAId, initialAssemblyBId, open]);

  const nameFor = (id: string) => assemblies.find((a) => a.id === id)?.name ?? id;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-bg-surface p-6 shadow-xl",
            "max-h-[90vh] flex flex-col",
          )}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-accent-primary" />
              <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
                Compare Assemblies
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Assembly selectors */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Base</label>
              <select
                value={assemblyAId}
                onChange={(e) => setAssemblyAId(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {assemblies.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === assemblyBId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Compare to</label>
              <select
                value={assemblyBId}
                onChange={(e) => setAssemblyBId(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {assemblies.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === assemblyAId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff view */}
          <div className="flex-1 overflow-y-auto">
            {assemblyAId !== assemblyBId ? (
              <AssemblyDiffView
                assemblyAId={assemblyAId}
                assemblyBId={assemblyBId}
                assemblyAName={nameFor(assemblyAId)}
                assemblyBName={nameFor(assemblyBId)}
              />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-text-tertiary">
                Select two different assemblies to compare.
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
