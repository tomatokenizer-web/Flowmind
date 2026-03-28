"use client";

import * as React from "react";
import {
  Copy,
  Check,
  Download,
  Link2,
  Database,
  HelpCircle,
  Camera,
  Filter,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

/* ─── Types ─── */

type ApiFormat = "prompt_package" | "json" | "markdown";

interface ContextExportApiProps {
  className?: string;
}

/* ─── Component ─── */

export function ContextExportApi({ className }: ContextExportApiProps) {
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const [format, setFormat] = React.useState<ApiFormat>("prompt_package");
  const [includeUnits, setIncludeUnits] = React.useState(true);
  const [includeRelations, setIncludeRelations] = React.useState(true);
  const [includeOpenQuestions, setIncludeOpenQuestions] = React.useState(true);
  const [includeSnapshot, setIncludeSnapshot] = React.useState(true);
  const [depth, setDepth] = React.useState(2);
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [copied, setCopied] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const apiUrl = `${baseUrl}/api/export/context/${activeContextId ?? "CONTEXT_ID"}?format=${format}&depth=${depth}&include=${[
    includeUnits && "units",
    includeRelations && "relations",
    includeOpenQuestions && "open_questions",
    includeSnapshot && "snapshot",
  ]
    .filter(Boolean)
    .join(",")}&type=${filterType}&status=${filterStatus}`;

  // Generate preview based on current settings
  const preview = React.useMemo(() => {
    if (format === "json") {
      const obj: Record<string, unknown> = {
        format: "json",
        contextId: activeContextId ?? "ctx_...",
        depth,
      };
      if (includeUnits) obj.units = [{ id: "u_1", content: "...", type: "claim" }];
      if (includeRelations) obj.relations = [{ source: "u_1", target: "u_2", type: "supports" }];
      if (includeOpenQuestions) obj.openQuestions = ["What is the relationship between..."];
      if (includeSnapshot) obj.snapshot = { inquiry: "...", contextName: "..." };
      return JSON.stringify(obj, null, 2);
    }
    if (format === "markdown") {
      const lines = ["# Context Export", ""];
      if (includeSnapshot) {
        lines.push("## Snapshot", "Project: ...", "Inquiry: ...", "");
      }
      if (includeUnits) {
        lines.push("## Units", "- **Claim**: Content here...", "- **Evidence**: Supporting data...", "");
      }
      if (includeRelations) {
        lines.push("## Relations", "- Claim --supports--> Evidence", "");
      }
      if (includeOpenQuestions) {
        lines.push("## Open Questions", "- What is the relationship between X and Y?", "");
      }
      return lines.join("\n");
    }
    // prompt_package
    const lines = [
      "<context>",
      `  <depth>${depth}</depth>`,
    ];
    if (includeSnapshot) {
      lines.push("  <snapshot>", "    Project context and inquiry state", "  </snapshot>");
    }
    if (includeUnits) {
      lines.push("  <units>", "    <unit type=\"claim\">Content...</unit>", "  </units>");
    }
    if (includeRelations) {
      lines.push("  <relations>", "    <rel type=\"supports\" from=\"u1\" to=\"u2\" />", "  </relations>");
    }
    if (includeOpenQuestions) {
      lines.push("  <open_questions>", "    <q>What is the relationship between...?</q>", "  </open_questions>");
    }
    lines.push("</context>");
    return lines.join("\n");
  }, [format, depth, includeUnits, includeRelations, includeOpenQuestions, includeSnapshot, activeContextId]);

  async function copyToClipboard(text: string, type: "preview" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "preview") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch {
      // Clipboard write failed
    }
  }

  function handleDownload() {
    const ext = format === "json" ? "json" : "md";
    const mime = format === "json" ? "application/json" : "text/plain";
    const blob = new Blob([preview], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `context-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const INCLUDE_TOGGLES = [
    { key: "units", label: "Units", icon: Database, value: includeUnits, set: setIncludeUnits },
    { key: "relations", label: "Relations", icon: Link2, value: includeRelations, set: setIncludeRelations },
    { key: "open_questions", label: "Open Questions", icon: HelpCircle, value: includeOpenQuestions, set: setIncludeOpenQuestions },
    { key: "snapshot", label: "Snapshot", icon: Camera, value: includeSnapshot, set: setIncludeSnapshot },
  ] as const;

  const TYPE_OPTIONS = ["all", "claim", "evidence", "question", "concept", "note"];
  const STATUS_OPTIONS = ["all", "seed", "developing", "mature", "crystallized"];

  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          Context Export API
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Configure and preview the Amplification-Context export output.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Format
            </label>
            <Tabs value={format} onValueChange={(v) => setFormat(v as ApiFormat)}>
              <TabsList className="w-full">
                <TabsTrigger value="prompt_package" className="flex-1">Prompt</TabsTrigger>
                <TabsTrigger value="json" className="flex-1">JSON</TabsTrigger>
                <TabsTrigger value="markdown" className="flex-1">Markdown</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Include toggles */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Include
            </label>
            <div className="space-y-1.5">
              {INCLUDE_TOGGLES.map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={toggle.value}
                    onChange={(e) => toggle.set(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "h-4 w-4 rounded border transition-colors duration-fast flex items-center justify-center",
                      toggle.value
                        ? "border-accent-primary bg-accent-primary"
                        : "border-border bg-bg-surface",
                    )}
                  >
                    {toggle.value && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <toggle.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{toggle.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Depth slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Depth
              </label>
              <span className="text-xs font-mono text-text-tertiary">{depth} hops</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-[var(--accent-primary)]"
              aria-label="Traversal depth in hops"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>1</span>
              <span>5</span>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <Filter className="h-3 w-3" /> Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3" /> Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Preview + API URL */}
        <div className="flex flex-col gap-3">
          {/* API Endpoint */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              API Endpoint
            </label>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 truncate rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-xs font-mono text-text-secondary">
                {apiUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(apiUrl, "url")}
                aria-label="Copy API URL"
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-accent-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Preview
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(preview, "preview")}
                className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Copy preview"
              >
                {copied ? <Check className="h-3 w-3 text-accent-success" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto rounded-card border border-border bg-bg-secondary p-3 text-xs text-text-secondary font-mono leading-relaxed min-h-[240px] max-h-[360px]">
            {preview}
          </pre>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(preview, "preview")}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
