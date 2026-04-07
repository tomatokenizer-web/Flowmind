"use client";

import * as React from "react";
import { Plus, Trash2, Play, X } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { cn } from "~/lib/utils";

interface BatchCaptureProps {
  onProcessAll: (texts: string[]) => void;
  isProcessing?: boolean;
  className?: string;
}

export function BatchCapture({ onProcessAll, isProcessing, className }: BatchCaptureProps) {
  const batchTexts = useCaptureStore((s) => s.batchTexts);
  const addBatchText = useCaptureStore((s) => s.addBatchText);
  const removeBatchText = useCaptureStore((s) => s.removeBatchText);
  const clearBatch = useCaptureStore((s) => s.clearBatch);
  const [draft, setDraft] = React.useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addBatchText(trimmed);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Batch Capture ({batchTexts.length} items)
        </h3>
        {batchTexts.length > 0 && (
          <button
            onClick={clearBatch}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Draft input */}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a thought to add to batch..."
          className="flex-1 resize-none rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary/40"
          rows={2}
          disabled={isProcessing}
        />
        <button
          onClick={handleAdd}
          disabled={!draft.trim() || isProcessing}
          className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg bg-accent-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Add to batch"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Queued items */}
      {batchTexts.length > 0 && (
        <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {batchTexts.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-bg-surface px-3 py-2"
            >
              <span className="flex-1 text-sm text-text-secondary line-clamp-2">
                {text}
              </span>
              <button
                onClick={() => removeBatchText(i)}
                disabled={isProcessing}
                className="shrink-0 text-text-tertiary hover:text-red-500 disabled:opacity-40"
                aria-label={`Remove item ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Process button */}
      {batchTexts.length > 0 && (
        <button
          onClick={() => onProcessAll(batchTexts)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isProcessing ? "Processing..." : `Process All (${batchTexts.length})`}
        </button>
      )}
    </div>
  );
}
