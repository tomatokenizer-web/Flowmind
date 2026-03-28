"use client";

import * as React from "react";
import { Check, ChevronDown, Layers, Plus, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── Types ─── */

interface ContextSelectorProps {
  /** Currently selected context ID(s) */
  value?: string | string[];
  /** Callback when selection changes */
  onChange?: (ids: string[]) => void;
  /** Allow selecting multiple contexts */
  multiSelect?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Callback to create a new context */
  onCreateNew?: () => void;
  className?: string;
}

/* ─── Component ─── */

export function ContextSelector({
  value,
  onChange,
  multiSelect = false,
  placeholder = "Select context...",
  onCreateNew,
  className,
}: ContextSelectorProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const contextsQuery = api.context.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );

  const contexts = contextsQuery.data ?? [];
  const selectedIds = React.useMemo(() => {
    if (!value) return new Set<string>();
    return new Set(Array.isArray(value) ? value : [value]);
  }, [value]);

  /* ─── Filtering ─── */

  const filtered = React.useMemo(() => {
    if (!search.trim()) return contexts;
    const q = search.toLowerCase();
    return contexts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.inquiryId?.toLowerCase().includes(q),
    );
  }, [contexts, search]);

  /* ─── Group by inquiry ─── */

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const key = c.inquiryId ?? "No inquiry";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [filtered]);

  /* ─── Selection ─── */

  function toggleContext(id: string) {
    if (multiSelect) {
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange?.([...next]);
    } else {
      onChange?.([id]);
      setOpen(false);
    }
  }

  /* ─── Display label ─── */

  const displayLabel = React.useMemo(() => {
    if (selectedIds.size === 0) return placeholder;
    if (selectedIds.size === 1) {
      const ctx = contexts.find((c) => selectedIds.has(c.id));
      return ctx?.name ?? placeholder;
    }
    return `${selectedIds.size} contexts selected`;
  }, [selectedIds, contexts, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select context"
          className={cn(
            "justify-between font-normal",
            selectedIds.size === 0 && "text-text-tertiary",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Layers className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className="truncate">{displayLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-text-tertiary shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contexts..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            aria-label="Search contexts"
          />
        </div>

        {/* Context list */}
        <ScrollArea className="max-h-64">
          {contextsQuery.isLoading ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="32px" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-tertiary">
              No contexts found
            </div>
          ) : (
            <div className="p-1">
              {[...grouped.entries()].map(([inquiry, ctxs]) => (
                <div key={inquiry}>
                  <p className="px-3 py-1.5 text-xs font-medium text-text-tertiary">
                    {inquiry}
                  </p>
                  {ctxs.map((ctx) => (
                    <button
                      key={ctx.id}
                      onClick={() => toggleContext(ctx.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left",
                        "hover:bg-bg-hover transition-colors duration-fast",
                        selectedIds.has(ctx.id) && "bg-bg-hover",
                      )}
                      role="option"
                      aria-selected={selectedIds.has(ctx.id)}
                    >
                      <span className="flex-1 truncate text-text-primary">
                        {ctx.name}
                      </span>
                      <span className="text-xs text-text-tertiary shrink-0">
                        {ctx.counts?.units ?? 0}
                      </span>
                      {selectedIds.has(ctx.id) && (
                        <Check className="h-4 w-4 text-accent-primary shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Create new */}
        {onCreateNew && (
          <div className="border-t border-border p-1">
            <button
              onClick={() => {
                onCreateNew();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
                "text-accent-primary hover:bg-bg-hover transition-colors duration-fast",
              )}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create new context
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
