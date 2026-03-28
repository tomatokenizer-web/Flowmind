"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Edit3, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { AIBadge } from "../shared/ai-badge";

/* ─── Types ─── */

interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  text: string;
}

interface RefinementDiffProps {
  original: string;
  refined: string;
  /** Diff segments for inline highlighting */
  segments?: DiffSegment[];
  /** Called when user accepts the refinement */
  onAccept: () => void;
  /** Called when user rejects the refinement */
  onReject: () => void;
  /** Called when user wants to manually edit */
  onEdit: () => void;
  isLoading?: boolean;
  className?: string;
}

/* ─── Simple Diff Computation ─── */

function computeSimpleDiff(original: string, refined: string): DiffSegment[] {
  // Word-level diff for readability
  const originalWords = original.split(/(\s+)/);
  const refinedWords = refined.split(/(\s+)/);
  const segments: DiffSegment[] = [];

  const maxLen = Math.max(originalWords.length, refinedWords.length);

  let i = 0;
  let j = 0;
  while (i < originalWords.length || j < refinedWords.length) {
    if (i < originalWords.length && j < refinedWords.length) {
      if (originalWords[i] === refinedWords[j]) {
        segments.push({ type: "unchanged", text: originalWords[i]! });
        i++;
        j++;
      } else {
        // Look ahead to find match
        let foundInRefined = false;
        for (let k = j + 1; k < Math.min(j + 5, refinedWords.length); k++) {
          if (originalWords[i] === refinedWords[k]) {
            // Words between j and k are added
            for (let m = j; m < k; m++) {
              segments.push({ type: "added", text: refinedWords[m]! });
            }
            j = k;
            foundInRefined = true;
            break;
          }
        }
        if (!foundInRefined) {
          segments.push({ type: "removed", text: originalWords[i]! });
          i++;
          if (j < refinedWords.length) {
            segments.push({ type: "added", text: refinedWords[j]! });
            j++;
          }
        }
      }
    } else if (i < originalWords.length) {
      segments.push({ type: "removed", text: originalWords[i]! });
      i++;
    } else if (j < refinedWords.length) {
      segments.push({ type: "added", text: refinedWords[j]! });
      j++;
    }
  }

  return segments;
}

/* ─── Component ─── */

export function RefinementDiff({
  original,
  refined,
  segments: externalSegments,
  onAccept,
  onReject,
  onEdit,
  isLoading = false,
  className,
}: RefinementDiffProps) {
  const [view, setView] = React.useState<"side-by-side" | "inline">("side-by-side");
  const segments = externalSegments ?? computeSimpleDiff(original, refined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "rounded-lg border border-border bg-bg-surface overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Refinement Preview
          </h4>
          <AIBadge />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView("side-by-side")}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded-md",
              "transition-colors duration-fast",
              view === "side-by-side"
                ? "bg-bg-hover text-text-primary"
                : "text-text-tertiary hover:text-text-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
          >
            Side by side
          </button>
          <button
            type="button"
            onClick={() => setView("inline")}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded-md",
              "transition-colors duration-fast",
              view === "inline"
                ? "bg-bg-hover text-text-primary"
                : "text-text-tertiary hover:text-text-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
          >
            Inline
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="flex items-center gap-2 text-sm text-text-tertiary">
            <span className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-accent-primary"
                  style={{
                    animation: "flowmind-dot-bounce 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </span>
            Refining...
          </span>
        </div>
      ) : view === "side-by-side" ? (
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Original */}
          <div className="p-4">
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
              Original
            </span>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {original}
            </p>
          </div>
          {/* Refined */}
          <div className="p-4">
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
              Refined
            </span>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {refined}
            </p>
          </div>
        </div>
      ) : (
        /* Inline diff view */
        <div className="p-4">
          <p className="text-sm leading-relaxed">
            {segments.map((seg, i) => {
              if (seg.type === "unchanged") {
                return (
                  <span key={i} className="text-text-secondary">
                    {seg.text}
                  </span>
                );
              }
              if (seg.type === "added") {
                return (
                  <span
                    key={i}
                    className="bg-accent-success/15 text-accent-success rounded-sm px-0.5"
                  >
                    {seg.text}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="bg-accent-error/15 text-accent-error line-through rounded-sm px-0.5"
                >
                  {seg.text}
                </span>
              );
            })}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg-secondary">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-accent-success hover:bg-accent-success/10"
          onClick={onAccept}
          disabled={isLoading}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-text-tertiary hover:text-text-secondary"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-accent-error hover:bg-accent-error/10"
          onClick={onReject}
          disabled={isLoading}
        >
          <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Reject
        </Button>
      </div>
    </motion.div>
  );
}

RefinementDiff.displayName = "RefinementDiff";
