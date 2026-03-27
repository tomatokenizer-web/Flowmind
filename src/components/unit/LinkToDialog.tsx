"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { Search, Loader2, Link2 } from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

const RELATION_TYPES = [
  { value: "supports",      label: "Supports" },
  { value: "contradicts",   label: "Contradicts" },
  { value: "derives_from",  label: "Derives From" },
  { value: "expands",       label: "Expands" },
  { value: "references",    label: "References" },
  { value: "exemplifies",   label: "Exemplifies" },
  { value: "defines",       label: "Defines" },
  { value: "questions",     label: "Questions" },
] as const;

type RelationType = typeof RELATION_TYPES[number]["value"];

interface LinkToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUnit: {
    id: string;
    content: string;
  };
  /** Project ID is required to scope the unit search */
  projectId?: string;
}

// ─── LinkToDialog ────────────────────────────────────────────────────

export function LinkToDialog({
  open,
  onOpenChange,
  sourceUnit,
  projectId,
}: LinkToDialogProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedTargetId, setSelectedTargetId] = React.useState<string | null>(null);
  const [relationType, setRelationType] = React.useState<RelationType>("supports");
  const [strength, setStrength] = React.useState(0.7);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
      setSelectedTargetId(null);
      setRelationType("supports");
      setStrength(0.7);
    }
  }, [open]);

  const utils = api.useUtils();

  const { data: unitsData, isLoading: isSearching } = api.unit.list.useQuery(
    {
      projectId,
      limit: 30,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    },
    { enabled: open && !!projectId },
  );

  // Exclude the source unit from candidates
  const candidates = (unitsData?.items ?? []).filter(
    (u) => u.id !== sourceUnit.id,
  );

  const selectedTarget = candidates.find((u) => u.id === selectedTargetId);

  const createRelation = api.relation.create.useMutation({
    onSuccess: () => {
      toast.success("Link created");
      void utils.relation.listByUnit.invalidate({ unitId: sourceUnit.id });
      void utils.relation.listByUnit.invalidate({ unitId: selectedTargetId ?? undefined });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create link");
    },
  });

  const handleSubmit = () => {
    if (!selectedTargetId) return;
    createRelation.mutate({
      sourceUnitId: sourceUnit.id,
      targetUnitId: selectedTargetId,
      type: relationType,
      strength,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to...
          </DialogTitle>
          <DialogDescription>
            Manually create a relation from this unit to another
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Source unit preview */}
          <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary line-clamp-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide mr-2">From</span>
            {sourceUnit.content}
          </div>

          {/* Target search */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Search target unit
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                autoFocus
                type="text"
                placeholder={projectId ? "Search units..." : "No project — cannot search"}
                disabled={!projectId}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm",
                  "text-text-primary placeholder:text-text-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-accent-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              />
            </div>

            {/* Results list */}
            <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-bg-primary">
              {!projectId ? (
                <p className="py-6 text-center text-sm text-text-tertiary">
                  Project ID not available
                </p>
              ) : isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-tertiary">
                  {debouncedSearch ? "No matching units" : "No units found"}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {candidates.map((unit) => (
                    <li key={unit.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTargetId(unit.id)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm transition-colors",
                          "hover:bg-bg-hover focus:outline-none focus:bg-bg-hover",
                          selectedTargetId === unit.id &&
                            "bg-accent-primary/10 text-accent-primary",
                        )}
                      >
                        <span className="line-clamp-2">{unit.content}</span>
                        <span className="mt-0.5 block text-xs text-text-tertiary capitalize">
                          {unit.unitType}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Relation type selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="link-relation-type"
              className="text-xs font-medium text-text-secondary uppercase tracking-wide"
            >
              Relation type
            </label>
            <select
              id="link-relation-type"
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm",
                "text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary",
              )}
            >
              {RELATION_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Strength slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="link-strength"
                className="text-xs font-medium text-text-secondary uppercase tracking-wide"
              >
                Strength
              </label>
              <span className="text-xs text-text-tertiary tabular-nums">
                {strength.toFixed(2)}
              </span>
            </div>
            <input
              id="link-strength"
              type="range"
              min={0.3}
              max={1.0}
              step={0.05}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Weak (0.3)</span>
              <span>Strong (1.0)</span>
            </div>
          </div>

          {/* Selected target confirmation */}
          {selectedTarget && (
            <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-2 text-sm">
              <span className="text-xs font-medium text-accent-primary mr-2">To</span>
              <span className="text-text-primary line-clamp-2">{selectedTarget.content}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createRelation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTargetId || createRelation.isPending}
          >
            {createRelation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Create Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
