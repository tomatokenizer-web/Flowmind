"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download, Copy, FileText, Presentation, Mail, Hash, FileDown, History, Clock, FileCode, FileType2 } from "lucide-react";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { CompoundingPanel } from "~/components/assembly/CompoundingPanel";

type ExportFormat = "essay" | "presentation" | "email" | "social";
type ActiveTab = "export" | "history";

const FORMATS: { id: ExportFormat; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "essay", label: "Essay", icon: FileText, description: "Flowing prose with paragraphs" },
  { id: "presentation", label: "Presentation", icon: Presentation, description: "Slide-ready bullet points" },
  { id: "email", label: "Email", icon: Mail, description: "Concise email format" },
  { id: "social", label: "Social", icon: Hash, description: "Short-form social content" },
];

// ─── Unit-type conversion rules ───────────────────────────────────────────────

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

function applyUnitTypeFormatting(content: string, unitType: UnitType, fmt: ExportFormat): string {
  if (fmt === "presentation" || fmt === "social") {
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

  switch (unitType as UnitType) {
    case "claim":
      return `**${content}**`;
    case "evidence":
      return `${content}\n  — [source]`;
    case "question":
      return `_${content}_`;
    case "counterargument":
      return content.toLowerCase().startsWith("however")
        ? content
        : `However, ${content.charAt(0).toLowerCase()}${content.slice(1)}`;
    case "observation":
      return content;
    case "definition": {
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

function applyTypeConversions(
  rawContent: string,
  units: Array<{ id: string; content: string; type: string }>,
  fmt: ExportFormat,
): string {
  if (units.length === 0) return rawContent;

  if (fmt === "essay") {
    return units
      .map((u) => applyUnitTypeFormatting(u.content, u.type, fmt))
      .join("\n\n");
  }

  if (fmt === "email") {
    const actions = units.filter((u) => u.type === "action");
    const others = units.filter((u) => u.type !== "action");
    let out = `Key Points:\n${others.map((u) => `• ${applyUnitTypeFormatting(u.content, u.type, fmt)}`).join("\n")}`;
    if (actions.length > 0) {
      out += `\n\nAction Items:\n${actions.map((u) => applyUnitTypeFormatting(u.content, u.type, fmt)).join("\n")}`;
    }
    return out;
  }

  if (fmt === "presentation") {
    return units
      .map((u, i) => `Slide ${i + 1}\n• ${applyUnitTypeFormatting(u.content, u.type, fmt)}`)
      .join("\n\n");
  }

  if (fmt === "social") {
    return units
      .map((u) => {
        const formatted = applyUnitTypeFormatting(u.content, u.type, fmt);
        return formatted.length > 240 ? formatted.slice(0, 237) + "..." : formatted;
      })
      .join("\n\n---\n\n");
  }

  return rawContent;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assemblyId: string;
  assemblyName: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExportDialog({ open, onOpenChange, assemblyId, assemblyName }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("essay");
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("export");

  // Fetch raw export content
  const { data: exportData, isLoading: exportLoading } = api.assembly.export.useQuery(
    { assemblyId, format: exportFormat },
    { enabled: open },
  );

  // Fetch assembly with items
  const { data: assembly, isLoading: assemblyLoading } = api.assembly.getById.useQuery(
    { id: assemblyId },
    { enabled: open },
  );

  // Export history
  const { data: historyData, isLoading: historyLoading } = api.exportHistory.list.useQuery(
    { assemblyId },
    { enabled: open && activeTab === "history" },
  );

  const isLoading = exportLoading || assemblyLoading;

  // Build ordered unit list from assembly items
  const allOrderedUnits = React.useMemo(() => {
    if (!assembly?.items) return [];
    return assembly.items
      .filter((item) => item.unit !== null)
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.unit!.id as string,
        content: item.unit!.content as string,
        type: item.unit!.unitType as string,
      }));
  }, [assembly?.items]);

  // Partial export: track which unit IDs are selected
  const [selectedUnitIds, setSelectedUnitIds] = React.useState<Set<string>>(new Set());

  // When assembly loads, select all units by default
  React.useEffect(() => {
    if (allOrderedUnits.length > 0) {
      setSelectedUnitIds(new Set(allOrderedUnits.map((u) => u.id)));
    }
  }, [allOrderedUnits.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedUnits = React.useMemo(
    () => allOrderedUnits.filter((u) => selectedUnitIds.has(u.id)),
    [allOrderedUnits, selectedUnitIds],
  );

  // Apply client-side formatting only to selected units
  const formattedContent = React.useMemo(() => {
    if (!exportData?.content) return "";
    return applyTypeConversions(exportData.content, selectedUnits, exportFormat);
  }, [exportData?.content, selectedUnits, exportFormat]);

  // Changed-units badge
  const { data: changedData } = api.exportHistory.getChangedUnits.useQuery(
    { assemblyId, format: exportFormat, currentContent: formattedContent },
    { enabled: open && formattedContent.length > 0 },
  );

  const utils = api.useUtils();
  const createExportHistory = api.exportHistory.create.useMutation({
    onSuccess: () => {
      void utils.exportHistory.list.invalidate({ assemblyId });
      void utils.exportHistory.getChangedUnits.invalidate({ assemblyId });
    },
  });

  const recordExport = React.useCallback(() => {
    if (!formattedContent) return;
    createExportHistory.mutate({
      assemblyId,
      format: exportFormat,
      unitIds: selectedUnits.map((u) => u.id),
      content: formattedContent,
    });
  }, [assemblyId, exportFormat, formattedContent, selectedUnits, createExportHistory]);

  const handleCopy = async () => {
    if (!formattedContent) return;
    await navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordExport();
  };

  const handleDownload = () => {
    if (!formattedContent) return;
    const blob = new Blob([formattedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assemblyName.replace(/\s+/g, "-").toLowerCase()}-${exportFormat}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    recordExport();
  };

  // Server-rendered format exports (DEC-2026-002 §15: markdown/plaintext/html/json).
  const [serverFormatDownloading, setServerFormatDownloading] = React.useState<
    "markdown" | "plaintext" | null
  >(null);

  const downloadServerFormat = async (kind: "markdown" | "plaintext") => {
    if (serverFormatDownloading) return;
    setServerFormatDownloading(kind);
    try {
      const result =
        kind === "markdown"
          ? await utils.assembly.exportMarkdown.fetch({ assemblyId })
          : await utils.assembly.exportPlaintext.fetch({ assemblyId });
      const content = "markdown" in result ? result.markdown : result.plaintext;
      const ext = kind === "markdown" ? "md" : "txt";
      const mime = kind === "markdown" ? "text/markdown" : "text/plain";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${assemblyName.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setServerFormatDownloading(null);
    }
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUnitIds.size === allOrderedUnits.length) {
      setSelectedUnitIds(new Set());
    } else {
      setSelectedUnitIds(new Set(allOrderedUnits.map((u) => u.id)));
    }
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
          {/* Header */}
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

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-lg border border-border bg-bg-primary p-1">
            <button
              onClick={() => setActiveTab("export")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "export"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <History className="h-4 w-4" />
              History
              {changedData?.hasChanges && changedData.changedCount > 0 && (
                <span className="ml-1 rounded-full bg-accent-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {changedData.changedCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Export Tab ── */}
          {activeTab === "export" && (
            <>
              {/* Format selector */}
              <div className="mb-4 grid grid-cols-4 gap-2">
                {FORMATS.map(({ id, label, icon: Icon, description }) => (
                  <button
                    key={id}
                    onClick={() => setExportFormat(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
                      exportFormat === id
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

              {/* Changed-units badge */}
              {changedData?.hasChanges && changedData.changedCount > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {changedData.changedCount} unit{changedData.changedCount !== 1 ? "s" : ""} changed since last export
                    {changedData.lastExportedAt
                      ? ` (${new Date(changedData.lastExportedAt).toLocaleDateString()})`
                      : ""}
                  </span>
                </div>
              )}

              {/* Partial export unit selection */}
              {!isLoading && allOrderedUnits.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">
                      Units ({selectedUnitIds.size}/{allOrderedUnits.length} selected)
                    </span>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-accent-primary hover:underline"
                    >
                      {selectedUnitIds.size === allOrderedUnits.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-border bg-bg-primary p-2 space-y-1">
                    {allOrderedUnits.map((unit, idx) => (
                      <label
                        key={unit.id}
                        className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-bg-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUnitIds.has(unit.id)}
                          onChange={() => toggleUnit(unit.id)}
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-accent-primary"
                        />
                        <span className="text-xs text-text-secondary">
                          <span className="mr-1.5 text-[10px] uppercase text-text-tertiary">{idx + 1}.</span>
                          <span className="line-clamp-1 text-text-primary">{unit.content}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-bg-primary p-4 min-h-[120px]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-4 animate-pulse rounded bg-bg-secondary" style={{ width: `${60 + i * 10}%` }} />
                    ))}
                  </div>
                ) : selectedUnits.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Select at least one unit to preview.</p>
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
                    {formattedContent || "No content to export"}
                  </div>
                )}
              </div>

              {/* Compounding candidate extractor (DEC-2026-002 §19) */}
              <div className="mt-3">
                <CompoundingPanel assemblyId={assemblyId} />
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  disabled={selectedUnits.length === 0}
                  onClick={() => {
                    const url = `/api/assembly/${assemblyId}/export-pdf`;
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${assemblyName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  disabled={serverFormatDownloading !== null}
                  onClick={() => void downloadServerFormat("markdown")}
                >
                  <FileCode className="h-4 w-4" />
                  {serverFormatDownloading === "markdown" ? "Downloading..." : "Markdown"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={serverFormatDownloading !== null}
                  onClick={() => void downloadServerFormat("plaintext")}
                >
                  <FileType2 className="h-4 w-4" />
                  {serverFormatDownloading === "plaintext" ? "Downloading..." : "Plaintext"}
                </Button>
                <Button variant="ghost" onClick={handleCopy} disabled={!formattedContent || selectedUnits.length === 0}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={handleDownload} disabled={!formattedContent || selectedUnits.length === 0}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </>
          )}

          {/* ── History Tab ── */}
          {activeTab === "history" && (
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
                  ))}
                </div>
              ) : !historyData || historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="mb-3 h-8 w-8 text-text-tertiary" />
                  <p className="text-sm font-medium text-text-secondary">No exports yet</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Export this assembly to start tracking history.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {changedData?.hasChanges && changedData.changedCount > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {changedData.changedCount} unit{changedData.changedCount !== 1 ? "s" : ""} have changed since the last export
                      </span>
                    </div>
                  )}
                  {historyData.map((entry: { id: string; format: string; unitIds: string[]; contentHash: string; createdAt: Date }) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-xs font-medium capitalize text-text-secondary">
                          {entry.format}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {entry.unitIds.length} unit{entry.unitIds.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.createdAt), "MMM d, yyyy, h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
