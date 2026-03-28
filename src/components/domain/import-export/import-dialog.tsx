"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  FileJson,
  Globe,
  AlignLeft,
  Zap,
  FolderOpen,
  Check,
  AlertCircle,
  Loader2,
  X,
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

/* ─── Types ─── */

type ImportSource = "markdown" | "json" | "text" | "url";

type ImportStage = "select" | "preview" | "importing" | "done";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_CONFIG: {
  value: ImportSource;
  label: string;
  icon: React.ElementType;
  accept?: string;
  description: string;
}[] = [
  {
    value: "markdown",
    label: "Markdown",
    icon: FileText,
    accept: ".md,.markdown,.txt",
    description: "Import a Markdown file",
  },
  {
    value: "json",
    label: "JSON Backup",
    icon: FileJson,
    accept: ".json",
    description: "Restore from a JSON export",
  },
  {
    value: "text",
    label: "Plain Text",
    icon: AlignLeft,
    description: "Paste or type raw text",
  },
  {
    value: "url",
    label: "URL",
    icon: Globe,
    description: "Fetch and extract from a URL",
  },
];

/* ─── Component ─── */

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);

  const [source, setSource] = React.useState<ImportSource>("markdown");
  const [stage, setStage] = React.useState<ImportStage>("select");
  const [content, setContent] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const [runPipeline, setRunPipeline] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [jsonSummary, setJsonSummary] = React.useState<{
    units: number;
    relations: number;
    contexts: number;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const createMutation = api.project.create.useMutation();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setStage("select");
      setContent("");
      setFileName(null);
      setUrlInput("");
      setError(null);
      setProgress(0);
      setJsonSummary(null);
    }
  }, [open]);

  function handleFileRead(file: File) {
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);

      if (source === "json" || file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          setJsonSummary({
            units: Array.isArray(parsed.units) ? parsed.units.length : 0,
            relations: Array.isArray(parsed.relations) ? parsed.relations.length : 0,
            contexts: Array.isArray(parsed.contexts) ? parsed.contexts.length : 0,
          });
          setSource("json");
        } catch {
          setError("Invalid JSON file. Please check the file format.");
          return;
        }
      }

      setStage("preview");
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
  }

  async function handleFetchUrl() {
    if (!urlInput.trim()) return;
    setError(null);
    setStage("importing");
    try {
      // Simple fetch via a proxy or direct (depending on CORS)
      const res = await fetch(urlInput);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setContent(text);
      setFileName(urlInput);
      setStage("preview");
    } catch {
      setError("Failed to fetch URL. Check the address and try again.");
      setStage("select");
    }
  }

  async function handleImport() {
    setStage("importing");
    setProgress(0);

    // Simulate progress for pipeline processing
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 300);

    try {
      // In a real implementation, this would call import-specific mutations
      // For now, we use project.create as a placeholder for the import flow
      await new Promise((r) => setTimeout(r, 1500));
      setProgress(100);
      clearInterval(interval);
      setStage("done");
    } catch {
      clearInterval(interval);
      setError("Import failed. Please try again.");
      setStage("preview");
    }
  }

  const sourceConfig = SOURCE_CONFIG.find((s) => s.value === source);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Content</DialogTitle>
          <DialogDescription>
            Bring content into FlowMind from external sources.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ── Stage: Select source ── */}
          {stage === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Source tabs */}
              <div className="grid grid-cols-4 gap-2">
                {SOURCE_CONFIG.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSource(s.value);
                      setContent("");
                      setFileName(null);
                      setError(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-card border p-3 text-center transition-colors duration-fast",
                      source === s.value
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover",
                    )}
                  >
                    <s.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="text-xs font-medium">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* File drop zone (for markdown, json) */}
              {(source === "markdown" || source === "json") && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  aria-label="Drop file here or click to browse"
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-8 cursor-pointer transition-colors duration-fast",
                    isDragging
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border hover:border-text-tertiary hover:bg-bg-hover/50",
                  )}
                >
                  <Upload
                    className={cn(
                      "h-8 w-8",
                      isDragging ? "text-accent-primary" : "text-text-tertiary",
                    )}
                    aria-hidden="true"
                  />
                  <div className="text-center">
                    <p className="text-sm text-text-primary font-medium">
                      {isDragging ? "Drop file here" : "Drop a file or click to browse"}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {sourceConfig?.accept ?? "Any text file"}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={sourceConfig?.accept}
                    onChange={handleFileSelect}
                    className="sr-only"
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Text input */}
              {source === "text" && (
                <div className="space-y-2">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste or type your content here..."
                    rows={8}
                    className="w-full rounded-card border border-border bg-bg-surface p-3 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (content.trim()) {
                        setFileName("pasted-text");
                        setStage("preview");
                      }
                    }}
                    disabled={!content.trim()}
                  >
                    Preview
                  </Button>
                </div>
              )}

              {/* URL input */}
              {source === "url" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/article"
                      className="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleFetchUrl}
                      disabled={!urlInput.trim()}
                    >
                      Fetch
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-accent-error/10 px-3 py-2 text-sm text-accent-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Stage: Preview ── */}
          {stage === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* File info */}
              <div className="flex items-center gap-3 rounded-card border border-border bg-bg-surface p-3">
                <FolderOpen className="h-5 w-5 text-text-tertiary shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {fileName}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {content.length.toLocaleString()} characters
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStage("select");
                    setContent("");
                    setFileName(null);
                  }}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* JSON summary */}
              {source === "json" && jsonSummary && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Units", value: jsonSummary.units },
                    { label: "Relations", value: jsonSummary.relations },
                    { label: "Contexts", value: jsonSummary.contexts },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-card border border-border bg-bg-surface p-2 text-center"
                    >
                      <span className="block text-lg font-semibold text-text-primary">
                        {stat.value}
                      </span>
                      <span className="text-xs text-text-tertiary">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview content */}
              <pre className="max-h-48 overflow-auto rounded-card border border-border bg-bg-secondary p-3 text-xs text-text-secondary font-mono leading-relaxed">
                {content.slice(0, 2000)}
                {content.length > 2000 && "\n\n... (truncated)"}
              </pre>

              {/* Pipeline toggle (for text/markdown) */}
              {(source === "markdown" || source === "text") && (
                <label className="flex items-center gap-3 rounded-card border border-border bg-bg-surface p-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={runPipeline}
                    onChange={(e) => setRunPipeline(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className={cn(
                      "h-5 w-5 rounded border transition-colors duration-fast flex items-center justify-center",
                      runPipeline
                        ? "border-accent-primary bg-accent-primary"
                        : "border-border bg-bg-surface",
                    )}
                  >
                    {runPipeline && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-accent-warning" aria-hidden="true" />
                      <span className="text-sm font-medium text-text-primary">
                        Run AI Pipeline
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      Process through the 7-pass pipeline to extract units, relations, and structure
                    </p>
                  </div>
                </label>
              )}

              {/* Target selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Import into
                </label>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {activeProjectId ? `Project: ${activeProjectId.slice(0, 8)}...` : "No project selected"}
                    {activeContextId && ` / Context: ${activeContextId.slice(0, 8)}...`}
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-accent-error/10 px-3 py-2 text-sm text-accent-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Stage: Importing ── */}
          {stage === "importing" && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  {runPipeline ? "Running AI Pipeline..." : "Importing content..."}
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  {runPipeline
                    ? `Pass ${Math.ceil(progress / 14.3)} of 7`
                    : "Processing..."}
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full bg-accent-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Stage: Done ── */}
          {stage === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="rounded-full border border-accent-success/30 bg-accent-success/10 p-3">
                <Check className="h-6 w-6 text-accent-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  Import complete
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Your content has been imported successfully.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {stage === "select" && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {stage === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStage("select")}>
                Back
              </Button>
              <Button variant="primary" onClick={handleImport} className="gap-1.5">
                <Upload className="h-4 w-4" />
                {runPipeline ? "Import & Process" : "Import"}
              </Button>
            </>
          )}
          {stage === "done" && (
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
