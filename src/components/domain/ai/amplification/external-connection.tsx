"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Plus, Globe, FileText } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { AIBadge } from "../shared/ai-badge";

/* ─── Types ─── */

interface ExternalResult {
  id: string;
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceDomain: string;
  relevanceScore: number;
}

interface ExternalConnectionProps {
  results: ExternalResult[];
  isSearching?: boolean;
  /** Save an external result as a Resource Unit */
  onSaveAsUnit: (result: ExternalResult) => void;
  /** Attach as reference to the current unit */
  onAttachReference: (result: ExternalResult) => void;
  className?: string;
}

/* ─── Component ─── */

export function ExternalConnection({
  results,
  isSearching = false,
  onSaveAsUnit,
  onAttachReference,
  className,
}: ExternalConnectionProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Search status */}
      {isSearching && (
        <div className="flex items-center gap-2 py-3">
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
          <span className="text-xs text-text-tertiary">
            Searching external knowledge...
          </span>
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {results.length === 0 && !isSearching ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 py-8 text-center"
          >
            <Globe
              className="h-8 w-8 text-text-tertiary/50"
              aria-hidden="true"
            />
            <p className="text-xs text-text-tertiary">
              Search for external knowledge connections by selecting a unit and
              clicking &quot;Find connections&quot;.
            </p>
          </motion.div>
        ) : (
          results.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: [0.4, 0, 0.2, 1],
              }}
              className={cn(
                "group/result rounded-lg border border-border bg-bg-surface p-3",
                "transition-shadow duration-fast hover:shadow-resting",
              )}
            >
              {/* Title + source */}
              <div className="flex items-start gap-2">
                <FileText
                  className="h-4 w-4 mt-0.5 text-text-tertiary shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-sm font-medium text-text-primary leading-snug",
                      "hover:text-accent-primary transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:underline",
                      "line-clamp-2",
                    )}
                  >
                    {result.title}
                    <ExternalLink
                      className="ml-1 inline h-3 w-3 text-text-tertiary"
                      aria-hidden="true"
                    />
                  </a>
                  <span className="text-[10px] text-text-tertiary block mt-0.5">
                    {result.sourceDomain}
                  </span>
                </div>
                <AIBadge compact />
              </div>

              {/* Snippet */}
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed line-clamp-3 pl-6">
                {result.snippet}
              </p>

              {/* Relevance + Actions */}
              <div
                className={cn(
                  "mt-2.5 flex items-center gap-2 pl-6",
                  "opacity-0 group-hover/result:opacity-100",
                  "transition-opacity duration-fast",
                )}
              >
                {/* Relevance indicator */}
                <span className="text-[10px] text-text-tertiary">
                  {Math.round(result.relevanceScore * 100)}% relevant
                </span>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-accent-primary hover:bg-accent-primary/10"
                  onClick={() => onSaveAsUnit(result)}
                >
                  <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                  Save as Resource Unit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-text-tertiary hover:text-text-secondary"
                  onClick={() => onAttachReference(result)}
                >
                  Attach as reference
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}

ExternalConnection.displayName = "ExternalConnection";
