"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import type { SearchFilter, SearchLayer } from "~/hooks/use-search";

/* ─── Layer Colors ─── */

const LAYER_CHIP_STYLES: Record<SearchLayer, { bg: string; text: string; border: string }> = {
  text: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  semantic: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  structure: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  temporal: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
};

/* ─── Autocomplete Suggestions ─── */

const FILTER_SUGGESTIONS = [
  { prefix: "type:", options: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action", "decision"] },
  { prefix: "has:", options: ["supports", "contradicts", "elaborates", "questions"] },
  { prefix: "status:", options: ["draft", "pending", "confirmed", "discarded"] },
  { prefix: "by:", options: ["me", "ai"] },
  { prefix: "is:", options: ["orphan"] },
];

/* ─── Types ─── */

interface SearchFiltersProps {
  filters: SearchFilter[];
  onRemoveFilter: (filterId: string) => void;
  onAddFilter: (filter: Omit<SearchFilter, "id">) => void;
  className?: string;
}

/* ─── Component ─── */

export function SearchFilters({
  filters,
  onRemoveFilter,
  onAddFilter,
  className,
}: SearchFiltersProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [filterInput, setFilterInput] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  /* ─── Autocomplete logic ─── */
  React.useEffect(() => {
    if (!filterInput) {
      setSuggestions([]);
      setSelectedSuggestion(-1);
      return;
    }

    const lower = filterInput.toLowerCase();
    const matchedSuggestions: string[] = [];

    // Check if input matches a known prefix
    for (const { prefix, options } of FILTER_SUGGESTIONS) {
      if (lower.startsWith(prefix)) {
        const afterPrefix = lower.slice(prefix.length);
        const filtered = options.filter((o) => o.startsWith(afterPrefix));
        matchedSuggestions.push(...filtered.map((o) => `${prefix}${o}`));
      } else if (prefix.startsWith(lower)) {
        matchedSuggestions.push(prefix);
      }
    }

    // Also suggest in:"..." and since: patterns
    if (lower.startsWith("in:") || lower.startsWith("since:") || lower.startsWith("until:") || lower.startsWith("assembly:")) {
      // Keep what user typed as first suggestion
      if (!matchedSuggestions.includes(filterInput)) {
        matchedSuggestions.unshift(filterInput);
      }
    }

    setSuggestions(matchedSuggestions.slice(0, 8));
    setSelectedSuggestion(-1);
  }, [filterInput]);

  const commitFilter = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      let layer: SearchLayer = "structure";
      let label = trimmed;

      if (trimmed.startsWith("since:") || trimmed.startsWith("until:")) {
        layer = "temporal";
        label = trimmed.replace(":", ": ");
      } else if (trimmed.includes(":")) {
        const [prefix, value] = trimmed.split(":");
        label = `${prefix!.charAt(0).toUpperCase()}${prefix!.slice(1)}: ${value}`;
      }

      onAddFilter({
        layer,
        label,
        value: trimmed.split(":")[1] ?? trimmed,
        raw: trimmed,
      });

      setFilterInput("");
      setIsAdding(false);
    },
    [onAddFilter],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
          commitFilter(suggestions[selectedSuggestion]);
        } else {
          commitFilter(filterInput);
        }
      } else if (e.key === "Escape") {
        setIsAdding(false);
        setFilterInput("");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
      }
    },
    [filterInput, suggestions, selectedSuggestion, commitFilter],
  );

  /* ─── Focus input when adding ─── */
  React.useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  if (filters.length === 0 && !isAdding) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {filters.map((filter) => {
        const style = LAYER_CHIP_STYLES[filter.layer];
        return (
          <button
            key={filter.id}
            onClick={() => onRemoveFilter(filter.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
              "text-xs font-medium leading-none",
              "border transition-all duration-fast",
              "hover:brightness-110 active:brightness-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              style.bg,
              style.text,
              style.border,
            )}
            aria-label={`Remove filter: ${filter.label}`}
          >
            <span className="truncate max-w-[160px]">{filter.label}</span>
            <X className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        );
      })}

      {/* Add filter button / input */}
      {isAdding ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => {
                setIsAdding(false);
                setFilterInput("");
              }, 150);
            }}
            placeholder="type:claim, in:&quot;Ethics&quot;, since:2026-01..."
            className={cn(
              "h-7 w-48 rounded-full border border-border bg-bg-surface px-2.5",
              "text-xs text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent-primary",
            )}
            aria-label="Add search filter"
            aria-expanded={suggestions.length > 0}
            role="combobox"
            aria-autocomplete="list"
          />

          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <div
              className={cn(
                "absolute top-full left-0 z-50 mt-1 w-56",
                "rounded-lg border border-border bg-bg-surface shadow-elevated",
                "py-1",
              )}
              role="listbox"
            >
              {suggestions.map((suggestion, i) => (
                <button
                  key={suggestion}
                  role="option"
                  aria-selected={i === selectedSuggestion}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitFilter(suggestion);
                  }}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-xs text-text-primary",
                    "transition-colors duration-fast",
                    i === selectedSuggestion
                      ? "bg-bg-hover text-accent-primary"
                      : "hover:bg-bg-hover",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1",
            "text-xs text-text-tertiary",
            "border border-dashed border-border",
            "hover:border-text-tertiary hover:text-text-secondary",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          )}
          aria-label="Add filter"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Filter
        </button>
      )}
    </div>
  );
}

SearchFilters.displayName = "SearchFilters";
