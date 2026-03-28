"use client";

import * as React from "react";
import { Check, ChevronDown, Compass, Plus, Search } from "lucide-react";
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

interface InquirySelectorProps {
  /** Currently selected inquiry ID */
  value?: string | null;
  /** Callback when selection changes */
  onChange?: (id: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Callback to create a new inquiry */
  onCreateNew?: () => void;
  className?: string;
}

/* ─── Component ─── */

export function InquirySelector({
  value,
  onChange,
  placeholder = "Select inquiry...",
  onCreateNew,
  className,
}: InquirySelectorProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const inquiriesQuery = api.inquiry.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );

  const inquiries = inquiriesQuery.data ?? [];

  /* ─── Filtering ─── */

  const filtered = React.useMemo(() => {
    if (!search.trim()) return inquiries;
    const q = search.toLowerCase();
    return inquiries.filter((inq) => inq.title.toLowerCase().includes(q));
  }, [inquiries, search]);

  /* ─── Display label ─── */

  const displayLabel = React.useMemo(() => {
    if (!value) return placeholder;
    const inq = inquiries.find((i) => i.id === value);
    return inq?.title ?? placeholder;
  }, [value, inquiries, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select inquiry"
          className={cn(
            "justify-between font-normal",
            !value && "text-text-tertiary",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Compass className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
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
            placeholder="Search inquiries..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            aria-label="Search inquiries"
          />
        </div>

        {/* Inquiry list */}
        <ScrollArea className="max-h-64">
          {inquiriesQuery.isLoading ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="32px" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-tertiary">
              No inquiries found
            </div>
          ) : (
            <div className="p-1" role="listbox" aria-label="Available inquiries">
              {filtered.map((inq) => (
                <button
                  key={inq.id}
                  onClick={() => {
                    onChange?.(inq.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left",
                    "hover:bg-bg-hover transition-colors duration-fast",
                    inq.id === value && "bg-bg-hover",
                  )}
                  role="option"
                  aria-selected={inq.id === value}
                >
                  <span className="flex-1 truncate text-text-primary">
                    {inq.title}
                  </span>
                  <span className="text-xs text-text-tertiary shrink-0">
                    {inq.counts?.contexts ?? 0} ctx
                  </span>
                  {inq.id === value && (
                    <Check className="h-4 w-4 text-accent-primary shrink-0" aria-hidden="true" />
                  )}
                </button>
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
              Create new inquiry
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
