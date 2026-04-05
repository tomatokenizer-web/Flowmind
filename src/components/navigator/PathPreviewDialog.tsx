"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown, ChevronUp, Sparkles, Info } from "lucide-react";
import type { UnitType } from "@prisma/client";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";

// ─── Types ──────────────────────────────────────────────────────────

export interface PathProposal {
  name: string;
  purpose: string;
  description: string | null;
  reasoning: string | null;
  path: string[];
  contextId: string;
  unitPreviews: Array<{ id: string; content: string; unitType: string }>;
}

interface PathPreviewDialogProps {
  proposals: PathProposal[];
  onAccept: (accepted: PathProposal[]) => void;
  onClose: () => void;
  isAccepting?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function PathPreviewDialog({
  proposals,
  onAccept,
  onClose,
  isAccepting = false,
}: PathPreviewDialogProps) {
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(proposals.map((_, i) => i)),
  );
  const [expandedPath, setExpandedPath] = React.useState<number | null>(null);

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAccept = () => {
    const accepted = proposals.filter((_, i) => selected.has(i));
    if (accepted.length > 0) onAccept(accepted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-bg-surface shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-primary" />
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Proposed Navigation Paths
              </h2>
              <p className="text-xs text-text-tertiary">
                Review and select which paths to create
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Proposals list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {proposals.map((proposal, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border transition-all duration-fast",
                selected.has(i)
                  ? "border-accent-primary/50 bg-accent-primary/5"
                  : "border-border bg-bg-primary opacity-60",
              )}
            >
              {/* Proposal header */}
              <div className="flex items-start gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleSelection(i)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    selected.has(i)
                      ? "border-accent-primary bg-accent-primary text-white"
                      : "border-border bg-bg-primary text-transparent hover:border-text-tertiary",
                  )}
                  aria-label={selected.has(i) ? "Deselect path" : "Select path"}
                >
                  <Check className="h-3 w-3" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-text-primary truncate">
                      {proposal.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-tertiary capitalize">
                      {proposal.purpose}
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {proposal.path.length} steps
                    </span>
                  </div>

                  {/* AI description */}
                  {proposal.description ? (
                    <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                      {proposal.description}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-text-tertiary italic">
                      Algorithmically generated path (no AI description available)
                    </p>
                  )}

                  {/* AI reasoning */}
                  {proposal.reasoning && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-bg-secondary/50 px-3 py-2">
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-accent-primary" />
                      <p className="text-xs text-text-tertiary">
                        {proposal.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expand/collapse path steps */}
                <button
                  type="button"
                  onClick={() => setExpandedPath(expandedPath === i ? null : i)}
                  className="mt-0.5 shrink-0 rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
                  aria-label={expandedPath === i ? "Collapse steps" : "Expand steps"}
                >
                  {expandedPath === i ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Expanded step list */}
              <AnimatePresence>
                {expandedPath === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-3 space-y-1.5">
                      {proposal.unitPreviews.map((unit, stepIdx) => (
                        <div
                          key={unit.id}
                          className="flex items-start gap-2 text-xs"
                        >
                          <span className="mt-0.5 w-5 shrink-0 text-right text-text-tertiary font-mono">
                            {stepIdx + 1}.
                          </span>
                          <UnitTypeBadge unitType={unit.unitType as UnitType} />
                          <span className="text-text-secondary line-clamp-1">
                            {unit.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-xs text-text-tertiary">
            {selected.size} of {proposals.length} paths selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isAccepting}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || isAccepting}
              onClick={handleAccept}
            >
              {isAccepting ? "Creating..." : `Create ${selected.size} path${selected.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
