"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { X, Link2, FileText, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { useProjectId } from "~/contexts/project-context";
import { useSidebarStore } from "~/stores/sidebar-store";

interface ExternalImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ConnectionMode = "context" | "new-context" | "incubate";

export function ExternalImportDialog({ open, onOpenChange }: ExternalImportDialogProps) {
  const [url, setUrl] = React.useState("");
  const [pasteText, setPasteText] = React.useState("");
  const [connectionMode, setConnectionMode] = React.useState<ConnectionMode>("context");
  const [newContextName, setNewContextName] = React.useState("");
  const projectId = useProjectId();
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const utils = api.useUtils();

  const createContext = api.context.create.useMutation({
    onSuccess: (ctx) => setActiveContext(ctx.id),
  });

  const submitMutation = api.capture.submit.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
      setUrl("");
      setPasteText("");
      onOpenChange(false);
    },
  });

  const handleSubmit = async () => {
    if (!projectId) return;
    const content = pasteText || url;
    if (!content.trim()) return;

    let targetContextId = activeContextId;

    if (connectionMode === "new-context" && newContextName.trim()) {
      const newCtx = await createContext.mutateAsync({ name: newContextName.trim(), projectId });
      targetContextId = newCtx.id;
    }

    await submitMutation.mutateAsync({
      content: content.trim(),
      projectId,
      mode: "capture",
    });

    if (connectionMode === "incubate") {
      // The unit will be auto-incubated by the service layer if short
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-surface p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">Import External Knowledge</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4" /></Button></Dialog.Close>
          </div>

          <Tabs.Root defaultValue="paste">
            <Tabs.List className="mb-4 flex gap-2 rounded-lg bg-bg-secondary p-1">
              <Tabs.Trigger value="url" className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-bg-primary data-[state=active]:shadow-sm">
                <Link2 className="h-3.5 w-3.5" /> URL
              </Tabs.Trigger>
              <Tabs.Trigger value="paste" className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-bg-primary data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" /> Paste Text
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="url">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary" />
            </Tabs.Content>

            <Tabs.Content value="paste">
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste article text, notes, or any external content..."
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary" />
            </Tabs.Content>
          </Tabs.Root>

          {/* Connection mode */}
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-text-primary">Connect to:</p>
            {[
              { id: "context" as ConnectionMode, label: "Current context", desc: activeContextId ? "Add to active context" : "No context active" },
              { id: "new-context" as ConnectionMode, label: "New context", desc: "Create a fresh context for this import" },
              { id: "incubate" as ConnectionMode, label: "Incubation queue", desc: "Save for later, no connection yet" },
            ].map((mode) => (
              <label key={mode.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors", connectionMode === mode.id ? "border-accent-primary bg-accent-primary/5" : "border-border hover:bg-bg-hover")}>
                <input type="radio" name="mode" value={mode.id} checked={connectionMode === mode.id} onChange={() => setConnectionMode(mode.id)} className="accent-accent-primary" />
                <div><p className="text-sm font-medium text-text-primary">{mode.label}</p><p className="text-xs text-text-secondary">{mode.desc}</p></div>
              </label>
            ))}
            {connectionMode === "new-context" && (
              <input type="text" value={newContextName} onChange={(e) => setNewContextName(e.target.value)}
                placeholder="New context name..."
                className="mt-2 w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary" />
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close>
            <Button onClick={() => void handleSubmit()} disabled={(!url && !pasteText) || submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
