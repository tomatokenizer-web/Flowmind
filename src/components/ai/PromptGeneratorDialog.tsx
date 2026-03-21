"use client";

import * as React from "react";
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────

type PromptFormat = "chat" | "system" | "structured";

interface PromptGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextId: string;
  /** Optionally pre-select specific unit IDs */
  unitIds?: string[];
}

const FORMAT_OPTIONS: { value: PromptFormat; label: string; description: string }[] = [
  {
    value: "chat",
    label: "Chat prompt",
    description: "Conversational — paste directly into ChatGPT, Claude, etc.",
  },
  {
    value: "system",
    label: "System prompt",
    description: "For AI system instructions that set context before the conversation.",
  },
  {
    value: "structured",
    label: "Structured (XML tags)",
    description: "Wrapped in <context> tags for models that prefer structured input.",
  },
];

// ─── Component ────────────────────────────────────────────────────

export function PromptGeneratorDialog({
  open,
  onOpenChange,
  contextId,
  unitIds,
}: PromptGeneratorDialogProps) {
  const [format, setFormat] = React.useState<PromptFormat>("chat");
  const [copiedAt, setCopiedAt] = React.useState<number | null>(null);

  const generateMutation = api.ai.generatePrompt.useMutation();

  // Auto-generate when dialog opens or format changes
  React.useEffect(() => {
    if (!open) return;
    generateMutation.mutate({ contextId, format, ...(unitIds ? { unitIds } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, format, contextId]);

  const prompt = generateMutation.data?.prompt ?? "";
  const unitCount = generateMutation.data?.unitCount ?? 0;
  const isLoading = generateMutation.isPending;

  const handleCopy = React.useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAt(Date.now());
      // Reset "Copied!" state after 2s
      setTimeout(() => setCopiedAt((prev) => (prev !== null ? null : null)), 2000);
    } catch {
      // Fallback: select all text in the textarea
      const textarea = document.getElementById("prompt-preview") as HTMLTextAreaElement | null;
      textarea?.select();
    }
  }, [prompt]);

  const isCopied = copiedAt !== null && Date.now() - copiedAt < 2000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            Generate AI Prompt
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6">
          {/* Format selector */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Format
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    format === opt.value
                      ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-accent-primary/50",
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt preview */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Preview
                {!isLoading && unitCount > 0 && (
                  <span className="ml-2 normal-case text-text-tertiary">
                    ({unitCount} unit{unitCount !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
              {isLoading && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating…
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                id="prompt-preview"
                readOnly
                value={isLoading ? "Generating prompt…" : prompt}
                rows={12}
                className={cn(
                  "w-full resize-none rounded-lg border border-border bg-bg-secondary px-4 py-3 font-mono text-xs text-text-secondary focus:outline-none",
                  isLoading && "opacity-50",
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={isLoading || !prompt}
              onClick={() => void handleCopy()}
              className="gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
