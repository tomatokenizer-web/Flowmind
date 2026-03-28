"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import { useWorkspaceStore } from "~/stores/workspace-store";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

interface AssemblySearchPanelProps {
  open: boolean;
  onClose: () => void;
  onAddUnit: (unit: UnitCardUnit) => void;
  /** IDs of units already in the assembly, shown as dimmed */
  existingUnitIds: Set<string>;
}

/* ─── Component ─── */

export function AssemblySearchPanel({
  open,
  onClose,
  onAddUnit,
  existingUnitIds,
}: AssemblySearchPanelProps) {
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  /* Fetch units */
  const unitsQuery = api.unit.list.useQuery(
    {
      projectId: activeProjectId!,
      limit: 50,
    },
    { enabled: !!activeProjectId && open },
  );

  const searchQuery = api.search.global.useQuery(
    { query, projectId: activeProjectId!, limit: 30 },
    { enabled: query.length >= 2 && open && !!activeProjectId },
  );

  /* Focus input on open */
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setTypeFilter(null);
    }
  }, [open]);

  /* Results: search results take priority, else show all units */
  const results = React.useMemo(() => {
    let items: UnitCardUnit[] = [];

    if (query.length >= 2 && searchQuery.data) {
      items = (searchQuery.data.units ?? []) as unknown as UnitCardUnit[];
    } else {
      items = (unitsQuery.data?.items ?? []) as unknown as UnitCardUnit[];
    }

    if (typeFilter) {
      items = items.filter((u) => u.primaryType === typeFilter);
    }

    return items;
  }, [query, searchQuery.data, unitsQuery.data, typeFilter]);

  const typeFilters = [
    "claim",
    "evidence",
    "question",
    "idea",
    "observation",
    "counterargument",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "fixed right-0 top-0 bottom-0 z-40 w-80",
            "bg-bg-primary border-l border-border",
            "shadow-elevated",
            "flex flex-col",
          )}
          role="dialog"
          aria-label="Search units to add"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Add Units
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Close search panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search input */}
          <div className="px-4 py-3 border-b border-border/50">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border",
                "bg-bg-surface px-3 py-2",
                "focus-within:border-border-focus focus-within:ring-1 focus-within:ring-accent-primary/20",
                "transition-colors duration-fast",
              )}
            >
              <Search
                className="h-4 w-4 text-text-tertiary shrink-0"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search units..."
                className={cn(
                  "flex-1 bg-transparent text-sm text-text-primary",
                  "placeholder:text-text-tertiary",
                  "outline-none",
                )}
                aria-label="Search units"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-text-tertiary hover:text-text-secondary transition-colors duration-fast"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              {typeFilters.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setTypeFilter((prev) => (prev === type ? null : type))
                  }
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium",
                    "transition-colors duration-fast",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    typeFilter === type
                      ? "bg-accent-primary text-white"
                      : "bg-bg-secondary text-text-tertiary hover:bg-bg-hover",
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {results.length === 0 && (
                <p className="text-center text-sm text-text-tertiary py-8">
                  {query.length >= 2
                    ? "No units found"
                    : "Search for units or browse below"}
                </p>
              )}

              {results.map((unit) => {
                const alreadyAdded = existingUnitIds.has(unit.id);
                return (
                  <div
                    key={unit.id}
                    className={cn(
                      "group/result flex items-start gap-2 rounded-lg border p-2.5",
                      "transition-all duration-fast",
                      alreadyAdded
                        ? "border-border/50 opacity-50"
                        : "border-border hover:border-border-focus/30 hover:shadow-resting cursor-pointer",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <UnitTypeBadge
                        type={unit.primaryType}
                        secondaryType={unit.secondaryType}
                        size="sm"
                      />
                      <p className="mt-1 text-xs text-text-primary leading-relaxed line-clamp-2">
                        {unit.content}
                      </p>
                    </div>

                    {!alreadyAdded && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 shrink-0",
                          "text-text-tertiary",
                          "opacity-0 group-hover/result:opacity-100",
                          "hover:text-accent-primary hover:bg-accent-primary/10",
                          "transition-all duration-fast",
                        )}
                        onClick={() => onAddUnit(unit)}
                        aria-label={`Add unit: ${unit.content.slice(0, 40)}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}

                    {alreadyAdded && (
                      <span className="shrink-0 text-[10px] text-text-tertiary px-1.5 py-0.5">
                        Added
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

AssemblySearchPanel.displayName = "AssemblySearchPanel";
