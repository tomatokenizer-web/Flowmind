"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Bookmark,
  X,
  Trash2,
  Bell,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import type { SearchFilter, SavedSearch } from "~/hooks/use-search";

/* ─── Types ─── */

interface SearchHistoryEntry {
  query: string;
  filters: SearchFilter[];
  timestamp: number;
}

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  savedSearches: SavedSearch[];
  onExecuteSearch: (query: string, filters: SearchFilter[]) => void;
  onRemoveFromHistory: (timestamp: number) => void;
  onClearHistory: () => void;
  onSaveSearch: (query: string, filters: SearchFilter[]) => void;
  onRemoveSavedSearch: (id: string) => void;
  className?: string;
}

/* ─── Relative time ─── */

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ─── Component ─── */

export function SearchHistory({
  history,
  savedSearches,
  onExecuteSearch,
  onRemoveFromHistory,
  onClearHistory,
  onSaveSearch,
  onRemoveSavedSearch,
  className,
}: SearchHistoryProps) {
  const hasHistory = history.length > 0;
  const hasSaved = savedSearches.length > 0;

  if (!hasHistory && !hasSaved) {
    return (
      <div className={cn("flex flex-col items-center py-12 text-center", className)}>
        <Clock className="h-10 w-10 text-text-tertiary mb-3" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">No search history yet</p>
        <p className="text-xs text-text-tertiary mt-1">
          Your recent searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Saved searches */}
      {hasSaved && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2 px-1">
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            Saved Searches
          </h3>
          <div className="flex flex-col gap-1">
            <AnimatePresence mode="popLayout">
              {savedSearches.map((saved) => (
                <motion.div
                  key={saved.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => onExecuteSearch(saved.query, saved.filters)}
                    className={cn(
                      "group/saved flex items-center gap-2 w-full rounded-lg px-3 py-2",
                      "text-left text-sm text-text-primary",
                      "hover:bg-bg-hover transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    )}
                  >
                    <Bookmark
                      className="h-3.5 w-3.5 text-accent-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{saved.query}</span>

                    {/* New results badge */}
                    {saved.newResultsSince > 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                          "text-[10px] font-medium leading-none",
                          "bg-accent-primary/10 text-accent-primary",
                        )}
                      >
                        <Bell className="h-2.5 w-2.5" aria-hidden="true" />
                        {saved.newResultsSince} new
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSavedSearch(saved.id);
                      }}
                      className={cn(
                        "p-0.5 rounded",
                        "opacity-0 group-hover/saved:opacity-100",
                        "text-text-tertiary hover:text-accent-error",
                        "transition-all duration-fast",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      )}
                      aria-label={`Remove saved search: ${saved.query}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Recent history */}
      {hasHistory && (
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Recent
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="h-6 px-2 text-[10px] text-text-tertiary"
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Clear
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            <AnimatePresence mode="popLayout">
              {history.map((entry) => (
                <motion.div
                  key={entry.timestamp}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={cn(
                      "group/history flex items-center gap-2 rounded-lg px-3 py-1.5",
                      "hover:bg-bg-hover transition-colors duration-fast",
                    )}
                  >
                    <button
                      onClick={() => onExecuteSearch(entry.query, entry.filters)}
                      className={cn(
                        "flex flex-1 items-center gap-2 text-left min-w-0",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded",
                      )}
                    >
                      <Clock
                        className="h-3 w-3 text-text-tertiary shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-text-secondary truncate flex-1">
                        {entry.query}
                      </span>
                      <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                        {relativeTime(entry.timestamp)}
                      </span>
                    </button>

                    {/* Save + remove buttons on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/history:opacity-100 transition-opacity duration-fast shrink-0">
                      <button
                        onClick={() => onSaveSearch(entry.query, entry.filters)}
                        className={cn(
                          "p-0.5 rounded text-text-tertiary hover:text-accent-primary",
                          "transition-colors duration-fast",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        )}
                        aria-label={`Save search: ${entry.query}`}
                      >
                        <Bookmark className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => onRemoveFromHistory(entry.timestamp)}
                        className={cn(
                          "p-0.5 rounded text-text-tertiary hover:text-accent-error",
                          "transition-colors duration-fast",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        )}
                        aria-label={`Remove from history: ${entry.query}`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}

SearchHistory.displayName = "SearchHistory";
