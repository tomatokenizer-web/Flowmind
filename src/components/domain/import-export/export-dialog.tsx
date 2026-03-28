"use client";

import * as React from "react";
import {
  FileText,
  FileJson,
  FileDown,
  Sparkles,
  Link2,
  Database,
  Tags,
  BookOpen,
  List,
  Table,
  Copy,
  Download,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

/* ─── Types ─── */

type ExportFormat = "markdown" | "pdf" | "json" | "prompt_package";
type ExportScope = "context" | "inquiry" | "selection" | "assembly";

interface MarkdownOptions {
  includeRelations: boolean;
  includeMetadata: boolean;
  includeTypes: boolean;
}

interface PdfOptions {
  titlePage: boolean;
  tableOfContents: boolean;
  styling: boolean;
}

interface JsonOptions {
  includeRelations: boolean;
  includePerspectives: boolean;
}

interface PromptPackageOptions {
  includeUnits: boolean;
  includeRelations: boolean;
  includeOpenQuestions: boolean;
  includeSnapshot: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected scope */
  defaultScope?: ExportScope;
  /** Assembly ID when exporting an assembly */
  assemblyId?: string;
}

/* ─── Format configs ─── */

const FORMAT_CONFIG: {
  value: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "markdown",
    label: "Markdown",
    icon: FileText,
    description: "Structured text with optional links and metadata",
  },
  {
    value: "pdf",
    label: "PDF",
    icon: FileDown,
    description: "Formatted document with styling and layout",
  },
  {
    value: "json",
    label: "JSON",
    icon: FileJson,
    description: "Full data dump with relations and perspectives",
  },
  {
    value: "prompt_package",
    label: "Prompt Package",
    icon: Sparkles,
    description: "Optimized for AI context consumption",
  },
];

const SCOPE_CONFIG: { value: ExportScope; label: string; icon: React.ElementType }[] = [
  { value: "context", label: "Current Context", icon: BookOpen },
  { value: "inquiry", label: "Current Inquiry", icon: List },
  { value: "selection", label: "Selected Units", icon: Table },
  { value: "assembly", label: "Assembly", icon: Database },
];

/* ─── Component ─── */

export function ExportDialog({
  open,
  onOpenChange,
  defaultScope = "context",
  assemblyId,
}: ExportDialogProps) {
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const activeInquiryId = useWorkspaceStore((s) => s.activeInquiryId);

  const [format, setFormat] = React.useState<ExportFormat>("markdown");
  const [scope, setScope] = React.useState<ExportScope>(defaultScope);
  const [copied, setCopied] = React.useState(false);

  // Format-specific options
  const [mdOptions, setMdOptions] = React.useState<MarkdownOptions>({
    includeRelations: true,
    includeMetadata: true,
    includeTypes: true,
  });
  const [pdfOptions, setPdfOptions] = React.useState<PdfOptions>({
    titlePage: true,
    tableOfContents: true,
    styling: true,
  });
  const [jsonOptions, setJsonOptions] = React.useState<JsonOptions>({
    includeRelations: true,
    includePerspectives: true,
  });
  const [promptOptions, setPromptOptions] = React.useState<PromptPackageOptions>({
    includeUnits: true,
    includeRelations: true,
    includeOpenQuestions: true,
    includeSnapshot: true,
  });

  const exportMutation = api.assembly.export.useMutation();

  const [previewContent, setPreviewContent] = React.useState<string>(
    "// Select format and scope to preview export output",
  );

  // Build preview when options change
  React.useEffect(() => {
    const lines: string[] = [];
    if (format === "markdown") {
      lines.push("# Export Preview (Markdown)");
      lines.push("");
      if (mdOptions.includeMetadata) lines.push("> Metadata: type, lifecycle, timestamps");
      if (mdOptions.includeRelations) lines.push("> Relations: [[linked as markdown links]]");
      if (mdOptions.includeTypes) lines.push("> Unit types included as headers");
      lines.push("");
      lines.push("## Units");
      lines.push("- Unit content would appear here...");
    } else if (format === "pdf") {
      lines.push("PDF Export Preview");
      lines.push("─".repeat(40));
      if (pdfOptions.titlePage) lines.push("[Title Page]");
      if (pdfOptions.tableOfContents) lines.push("[Table of Contents]");
      lines.push("[Content with styling]");
    } else if (format === "json") {
      const obj: Record<string, unknown> = { format: "json", scope };
      if (jsonOptions.includeRelations) obj.relations = "[ ... ]";
      if (jsonOptions.includePerspectives) obj.perspectives = "[ ... ]";
      obj.units = "[ ... ]";
      lines.push(JSON.stringify(obj, null, 2));
    } else {
      lines.push("# Prompt Package");
      lines.push("");
      lines.push("## Context Snapshot");
      if (promptOptions.includeSnapshot) lines.push("Project context and inquiry state...");
      if (promptOptions.includeUnits) {
        lines.push("");
        lines.push("## Units");
        lines.push("Optimized unit representations...");
      }
      if (promptOptions.includeRelations) {
        lines.push("");
        lines.push("## Relations");
        lines.push("Unit connection graph...");
      }
      if (promptOptions.includeOpenQuestions) {
        lines.push("");
        lines.push("## Open Questions");
        lines.push("Unresolved inquiry threads...");
      }
    }
    setPreviewContent(lines.join("\n"));
  }, [format, scope, mdOptions, pdfOptions, jsonOptions, promptOptions]);

  async function handleExport() {
    try {
      const result = previewContent;

      if (assemblyId) {
        await exportMutation.mutateAsync({
          assemblyId,
          format,
          unitIds: [],
          contentHash: "",
        });
      }

      // Trigger browser download
      const blob = new Blob([typeof result === "string" ? result : JSON.stringify(result, null, 2)], {
        type: format === "pdf" ? "application/pdf" : format === "json" ? "application/json" : "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowmind-export.${format === "prompt_package" ? "md" : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Error handled by mutation state
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Content</DialogTitle>
          <DialogDescription>
            Choose a format and scope for your export.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Left: Format + Options */}
          <div className="space-y-4">
            {/* Format selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_CONFIG.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-card border p-2.5 text-left transition-colors duration-fast",
                      format === f.value
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover",
                    )}
                  >
                    <f.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Scope
              </label>
              <div className="space-y-1">
                {SCOPE_CONFIG.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScope(s.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-fast",
                      scope === s.value
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-secondary hover:bg-bg-hover",
                    )}
                  >
                    <s.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format-specific options */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Options
              </label>
              <div className="space-y-1.5">
                <AnimatePresence mode="wait">
                  {format === "markdown" && (
                    <motion.div
                      key="md"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1.5"
                    >
                      <OptionToggle
                        label="Include relations"
                        icon={Link2}
                        checked={mdOptions.includeRelations}
                        onChange={(v) => setMdOptions((o) => ({ ...o, includeRelations: v }))}
                      />
                      <OptionToggle
                        label="Include metadata"
                        icon={Database}
                        checked={mdOptions.includeMetadata}
                        onChange={(v) => setMdOptions((o) => ({ ...o, includeMetadata: v }))}
                      />
                      <OptionToggle
                        label="Include types"
                        icon={Tags}
                        checked={mdOptions.includeTypes}
                        onChange={(v) => setMdOptions((o) => ({ ...o, includeTypes: v }))}
                      />
                    </motion.div>
                  )}
                  {format === "pdf" && (
                    <motion.div
                      key="pdf"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1.5"
                    >
                      <OptionToggle
                        label="Title page"
                        icon={FileText}
                        checked={pdfOptions.titlePage}
                        onChange={(v) => setPdfOptions((o) => ({ ...o, titlePage: v }))}
                      />
                      <OptionToggle
                        label="Table of contents"
                        icon={List}
                        checked={pdfOptions.tableOfContents}
                        onChange={(v) => setPdfOptions((o) => ({ ...o, tableOfContents: v }))}
                      />
                      <OptionToggle
                        label="Styled output"
                        icon={Sparkles}
                        checked={pdfOptions.styling}
                        onChange={(v) => setPdfOptions((o) => ({ ...o, styling: v }))}
                      />
                    </motion.div>
                  )}
                  {format === "json" && (
                    <motion.div
                      key="json"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1.5"
                    >
                      <OptionToggle
                        label="Include relations"
                        icon={Link2}
                        checked={jsonOptions.includeRelations}
                        onChange={(v) => setJsonOptions((o) => ({ ...o, includeRelations: v }))}
                      />
                      <OptionToggle
                        label="Include perspectives"
                        icon={BookOpen}
                        checked={jsonOptions.includePerspectives}
                        onChange={(v) => setJsonOptions((o) => ({ ...o, includePerspectives: v }))}
                      />
                    </motion.div>
                  )}
                  {format === "prompt_package" && (
                    <motion.div
                      key="prompt"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1.5"
                    >
                      <OptionToggle
                        label="Include units"
                        icon={Database}
                        checked={promptOptions.includeUnits}
                        onChange={(v) => setPromptOptions((o) => ({ ...o, includeUnits: v }))}
                      />
                      <OptionToggle
                        label="Include relations"
                        icon={Link2}
                        checked={promptOptions.includeRelations}
                        onChange={(v) => setPromptOptions((o) => ({ ...o, includeRelations: v }))}
                      />
                      <OptionToggle
                        label="Open questions"
                        icon={Sparkles}
                        checked={promptOptions.includeOpenQuestions}
                        onChange={(v) => setPromptOptions((o) => ({ ...o, includeOpenQuestions: v }))}
                      />
                      <OptionToggle
                        label="Context snapshot"
                        icon={BookOpen}
                        checked={promptOptions.includeSnapshot}
                        onChange={(v) => setPromptOptions((o) => ({ ...o, includeSnapshot: v }))}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: Preview pane */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Preview
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Copy preview to clipboard"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-accent-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="flex-1 overflow-auto rounded-card border border-border bg-bg-secondary p-3 text-xs text-text-secondary font-mono leading-relaxed min-h-[280px] max-h-[360px]">
              {previewContent}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Option Toggle ─── */

function OptionToggle({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div
        className={cn(
          "h-4 w-4 rounded border transition-colors duration-fast flex items-center justify-center",
          checked
            ? "border-accent-primary bg-accent-primary"
            : "border-border bg-bg-surface",
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
