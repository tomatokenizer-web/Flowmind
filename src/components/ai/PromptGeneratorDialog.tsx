"use client";

import * as React from "react";
import { Copy, Check, Sparkles, Loader2, RefreshCw } from "lucide-react";
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

type SectionKey =
  | "background"
  | "claims"
  | "evidence"
  | "observations"
  | "counterarguments"
  | "constraints"
  | "questions";

interface SectionDef {
  key: SectionKey;
  label: string;
}

const SECTIONS: SectionDef[] = [
  { key: "background", label: "Background" },
  { key: "claims", label: "Key Claims" },
  { key: "evidence", label: "Evidence" },
  { key: "observations", label: "Observations" },
  { key: "counterarguments", label: "Counter-arguments" },
  { key: "constraints", label: "Constraints" },
  { key: "questions", label: "Open Questions" },
];

const ALL_SECTION_KEYS = SECTIONS.map((s) => s.key);

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
    label: "Chat",
    description: "Conversational — paste into ChatGPT, Claude, etc.",
  },
  {
    value: "system",
    label: "System",
    description: "For AI system instructions that set context.",
  },
  {
    value: "structured",
    label: "Structured",
    description: "Wrapped in <context> XML tags.",
  },
];

// ─── Syntax-highlighted preview ───────────────────────────────────

/** Very lightweight markdown-to-JSX renderer for the preview.
 *  Handles: # headings, ## headings, numbered lists, plain text, blank lines.
 *  No external dependency needed — keeps bundle size zero.
 */
function PromptPreview({ text, isLoading }: { text: string; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-bg-secondary">
        <span className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating prompt…
        </span>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-bg-secondary">
        <span className="text-sm text-text-tertiary">No content — enable at least one section.</span>
      </div>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-secondary">
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-text-secondary">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <span key={idx} className="block font-semibold text-text-primary text-sm">
                {line}
                {"\n"}
              </span>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <span key={idx} className="block font-medium text-accent-primary">
                {line}
                {"\n"}
              </span>
            );
          }
          if (line.startsWith("<context>") || line.startsWith("</context>")) {
            return (
              <span key={idx} className="block text-text-tertiary italic">
                {line}
                {"\n"}
              </span>
            );
          }
          // Numbered list items get a subtle indent highlight
          if (/^\d+\. /.test(line)) {
            return (
              <span key={idx} className="block pl-2 text-text-primary">
                {line}
                {"\n"}
              </span>
            );
          }
          return (
            <span key={idx} className="block text-text-secondary">
              {line || "\u00a0"}
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────

export function PromptGeneratorDialog({
  open,
  onOpenChange,
  contextId,
  unitIds,
}: PromptGeneratorDialogProps) {
  const [format, setFormat] = React.useState<PromptFormat>("chat");
  const [enabledSections, setEnabledSections] = React.useState<Set<SectionKey>>(
    new Set(ALL_SECTION_KEYS),
  );
  const [copiedAt, setCopiedAt] = React.useState<number | null>(null);

  const generateMutation = api.ai.generatePrompt.useMutation();

  const triggerGenerate = React.useCallback(() => {
    const sections = ALL_SECTION_KEYS.filter((k) => enabledSections.has(k));
    generateMutation.mutate({
      contextId,
      format,
      ...(unitIds ? { unitIds } : {}),
      enabledSections: sections,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId, format, enabledSections, unitIds]);

  // Auto-generate when dialog opens or key inputs change.
  // triggerGenerate captures format + enabledSections via useCallback.
  React.useEffect(() => {
    if (!open) return;
    triggerGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, triggerGenerate]);

  const prompt = generateMutation.data?.prompt ?? "";
  const unitCount = generateMutation.data?.unitCount ?? 0;
  const isLoading = generateMutation.isPending;

  const handleCopy = React.useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAt(Date.now());
      setTimeout(() => setCopiedAt(null), 2000);
    } catch {
      // Fallback: create a temporary textarea
      const el = document.createElement("textarea");
      el.value = prompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedAt(Date.now());
      setTimeout(() => setCopiedAt(null), 2000);
    }
  }, [prompt]);

  const isCopied = copiedAt !== null && Date.now() - copiedAt < 2000;

  const toggleSection = (key: SectionKey) => {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allEnabled = enabledSections.size === ALL_SECTION_KEYS.length;
  const noneEnabled = enabledSections.size === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            Generate AI Prompt
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 p-6">
          {/* ── Format selector ─────────────────────────────────── */}
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

          {/* ── Section toggles ──────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Sections
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={allEnabled}
                  onClick={() => setEnabledSections(new Set(ALL_SECTION_KEYS))}
                  className="text-xs text-accent-primary disabled:opacity-40 hover:underline"
                >
                  All
                </button>
                <span className="text-xs text-text-tertiary">/</span>
                <button
                  type="button"
                  disabled={noneEnabled}
                  onClick={() => setEnabledSections(new Set())}
                  className="text-xs text-accent-primary disabled:opacity-40 hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((sec) => {
                const checked = enabledSections.has(sec.key);
                return (
                  <button
                    key={sec.key}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleSection(sec.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      checked
                        ? "border-accent-primary bg-accent-primary/10 text-text-primary"
                        : "border-border bg-bg-secondary text-text-tertiary hover:border-accent-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        checked ? "bg-accent-primary" : "bg-text-tertiary/30",
                      )}
                    />
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Preview ─────────────────────────────────────────── */}
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
              <button
                type="button"
                disabled={isLoading}
                onClick={triggerGenerate}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary disabled:opacity-40 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                Refresh
              </button>
            </div>
            <PromptPreview text={prompt} isLoading={isLoading} />
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
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
