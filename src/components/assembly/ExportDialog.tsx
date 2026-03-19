"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download, Copy, FileText, Presentation, Mail, Hash } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

type ExportFormat = "essay" | "presentation" | "email" | "social";

const FORMATS: { id: ExportFormat; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "essay", label: "Essay", icon: FileText, description: "Flowing prose with paragraphs" },
  { id: "presentation", label: "Presentation", icon: Presentation, description: "Slide-ready bullet points" },
  { id: "email", label: "Email", icon: Mail, description: "Concise email format" },
  { id: "social", label: "Social", icon: Hash, description: "Short-form social content" },
];

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assemblyId: string;
  assemblyName: string;
}

export function ExportDialog({ open, onOpenChange, assemblyId, assemblyName }: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("essay");
  const [copied, setCopied] = React.useState(false);

  const { data: exportData, isLoading } = api.assembly.export.useQuery(
    { assemblyId, format },
    { enabled: open },
  );

  const handleCopy = async () => {
    if (!exportData?.content) return;
    await navigator.clipboard.writeText(exportData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!exportData?.content) return;
    const blob = new Blob([exportData.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assemblyName.replace(/\s+/g, "-").toLowerCase()}-${format}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-bg-surface p-6 shadow-xl",
            "max-h-[85vh] flex flex-col",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
              Export Assembly
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Format selector */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {FORMATS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
                  format === id
                    ? "border-accent-primary bg-accent-primary/5 text-accent-primary"
                    : "border-border text-text-secondary hover:border-border-hover hover:text-text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] text-text-tertiary">{description}</span>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-bg-primary p-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-bg-secondary" style={{ width: `${60 + i * 10}%` }} />
                ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary leading-relaxed">
                {exportData?.content ?? "No content to export"}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={handleCopy} disabled={!exportData?.content}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button onClick={handleDownload} disabled={!exportData?.content}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
