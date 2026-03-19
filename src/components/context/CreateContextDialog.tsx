"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Layers } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

interface CreateContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: (contextId: string) => void;
}

export function CreateContextDialog({ open, onOpenChange, projectId, onCreated }: CreateContextDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const utils = api.useUtils();

  const createMutation = api.context.create.useMutation({
    onSuccess: (ctx) => {
      void utils.context.list.invalidate();
      void utils.dashboard.getData.invalidate();
      onCreated?.(ctx.id);
      setName("");
      setDescription("");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined, projectId });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-bg-surface p-6 shadow-xl",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent-primary" />
              <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
                New Context
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Research Notes, Product Ideas..."
                className={cn(
                  "w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary",
                  "placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary",
                )}
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Description <span className="text-text-tertiary">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this context for?"
                rows={2}
                className={cn(
                  "w-full resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary",
                  "placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary",
                )}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button variant="ghost" type="button">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Context"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
