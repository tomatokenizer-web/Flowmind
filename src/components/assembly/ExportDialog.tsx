"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download, Copy, FileText, Presentation, Mail, Hash, FileDown } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type ExportFormat = "essay" | "presentation" | "email" | "social";

const FORMATS: { id: ExportFormat; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "essay", label: "Essay", icon: FileText, description: "Flowing prose with paragraphs" },
  { id: "presentation", label: "Presentation", icon: Presentation, description: "Slide-ready bullet points" },
  { id: "email", label: "Email", icon: Mail, description: "Concise email format" },
  { id: "social", label: "Social", icon: Hash, description: "Short-form social content" },
];

// ─── Unit-type conversion rules ───────────────────────────────────────────────
// Applied client-side to add semantic formatting based on unit type.
type UnitType =
  | "claim"
  | "evidence"
  | "question"
  | "counterargument"
  | "observation"
  | "definition"
  | "assumption"
  | "action"
  | "idea"
  | string;

function applyUnitTypeFormatting(content: string, unitType: UnitType, format: ExportFormat): string {
  if (format === "presentation" || format === "social") {
    // Presentation / social: prepend a type label and leave content as-is
    const label: Record<string, string> = {
      claim: "CLAIM",
      evidence: "EVIDENCE",
      question: "Q",
      counterargument: "COUNTER",
      observation: "OBS",
      definition: "DEF",
      assumption: "ASSUMPTION",
      action: "ACTION",
      idea: "IDEA",
    };
    const tag = label[unitType];
    return tag ? `[${tag}] ${content}` : content;
  }

  // essay / email: rich formatting
  switch (unitType as UnitType) {
    case "claim":
      // Thesis statement style — bold heading
      return `**${content}**`;

    case "evidence":
      // Supporting paragraph with citation cue
      return `${content}\n  — [source]`;

    case "question":
      // Italicised open question
      return `_${content}_`;

    case "counterargument":
      // "However,…" contrasting paragraph
      return content.toLowerCase().startsWith("however")
        ? content
        : `However, ${content.charAt(0).toLowerCase()}${content.slice(1)}`;

    case "observation":
      // Plain paragraph — no prefix
      return content;

    case "definition": {
      // Bold term extracted from leading word(s) + colon, or wrap entire content
      const colonIdx = content.indexOf(":");
      if (colonIdx > 0) {
        const term = content.slice(0, colonIdx).trim();
        const def = content.slice(colonIdx + 1).trim();
        return `**${term}**: ${def}`;
      }
      return `**${content}**`;
    }

    case "assumption":
      return content.toLowerCase().startsWith("assuming")
        ? content
        : `Assuming that ${content.charAt(0).toLowerCase()}${content.slice(1)}`;

    case "action":
      return `- [ ] ${content}`;

    case "idea":
      return `> **Idea:** ${content}`;

    default:
      return content;
  }
}

/**
 * Post-process exported content: replace raw unit content with type-aware
 * formatting. The server returns plain content; we re-format by pairing with
 * the ordered unit list from the assembly query.
 */
function applyTypeConversions(
  rawContent: string,
  units: Array<{ content: string; type: string }>,
  format: ExportFormat,
): string {
  if (units.length === 0) return rawContent;

  if (format === "essay") {
    return units
      .map((u) => applyUnitTypeFormatting(u.content, u.type, format))
      .join("\n\n");
  }

  if (format === "email") {
    const actions = units.filter((u) => u.type === "action");
    const others = units.filter((u) => u.type !== "action");
    let out = `Key Points:\n${others.map((u) => `• ${applyUnitTypeFormatting(u.content, u.type, format)}`).join("\n")}`;
    if (actions.length > 0) {
      out += `\n\nAction Items:\n${actions.map((u) => applyUnitTypeFormatting(u.content, u.type, format)).join("\n")}`;
    }
    return out;
  }

  if (format === "presentation") {
    return units
      .map((u, i) => `Slide ${i + 1}\n• ${applyUnitTypeFormatting(u.content, u.type, format)}`)
      .join("\n\n");
  }

  if (format === "social") {
    return units
      .map((u) => {
        const formatted = applyUnitTypeFormatting(u.content, u.type, format);
        return formatted.length > 240 ? formatted.slice(0, 237) + "..." : formatted;
      })
      .join("\n\n---\n\n");
  }

  return rawContent;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assemblyId: string;
  assemblyName: string;
}

export function ExportDialog({ open, onOpenChange, assemblyId, assemblyName }: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("essay");
  const [copied, setCopied] = React.useState(false);

  // Fetch raw export content (server-side formatting)
  const { data: exportData, isLoading: exportLoading } = api.assembly.export.useQuery(
    { assemblyId, format },
    { enabled: open },
  );

  // Fetch ordered unit list with types for client-side type conversions
  const { data: assembly, isLoading: assemblyLoading } = api.assembly.getById.useQuery(
    { id: assemblyId },
    { enabled: open },
  );

  const isLoading = exportLoading || assemblyLoading;

  // Build ordered unit list from assembly items
  const orderedUnits = React.useMemo(() => {
    if (!assembly?.items) return [];
    return assembly.items
      .filter((item) => item.unit !== null)
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        content: item.unit!.content as string,
        type: item.unit!.unitType as string,
      }));
  }, [assembly?.items]);

  // Apply client-side unit-type formatting
  const formattedContent = React.useMemo(() => {
    if (!exportData?.content) return "";
    return applyTypeConversions(exportData.content, orderedUnits, format);
  }, [exportData?.content, orderedUnits, format]);

  const handleCopy = async () => {
    if (!formattedContent) return;
    await navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!formattedContent) return;
    const blob = new Blob([formattedContent], { type: "text/plain" });
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
                {formattedContent || "No content to export"}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="ghost" disabled>
                      <FileDown className="h-4 w-4" />
                      PDF
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" onClick={handleCopy} disabled={!formattedContent}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button onClick={handleDownload} disabled={!formattedContent}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
