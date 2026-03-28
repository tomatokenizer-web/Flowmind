"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Search,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { FormField } from "~/components/ui/form-field";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/shared/skeleton";
import { RelationTypeSelector } from "./relation-type-selector";

/* ─── Purpose options ─── */

const PURPOSE_OPTIONS = [
  { value: "argument", label: "Argument" },
  { value: "navigation", label: "Navigation" },
  { value: "context", label: "Context" },
  { value: "reference", label: "Reference" },
] as const;

/* ─── Types ─── */

interface RelationEditorProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Pre-filled source unit */
  sourceUnit?: {
    id: string;
    content: string;
    type: string;
  };
  /** Pre-filled target unit (for editing existing) */
  targetUnit?: {
    id: string;
    content: string;
    primaryType: string;
  };
  /** Pre-filled relation data (for editing existing) */
  existingRelation?: {
    id: string;
    type: string;
    strength: number;
    direction: "forward" | "backward";
    fromType?: string;
    purposes?: string[];
  };
  /** Project ID for unit search */
  projectId: string;
}

/* ─── Component ─── */

export function RelationEditor({
  open,
  onOpenChange,
  sourceUnit,
  targetUnit: initialTarget,
  existingRelation,
  projectId,
}: RelationEditorProps) {
  const utils = api.useUtils();

  const createMutation = api.relation.create.useMutation({
    onSuccess: () => {
      if (sourceUnit) void utils.relation.list.invalidate({ unitId: sourceUnit.id });
      onOpenChange(false);
      resetForm();
    },
  });

  const updateMutation = api.relation.update.useMutation({
    onSuccess: () => {
      if (sourceUnit) void utils.relation.list.invalidate({ unitId: sourceUnit.id });
      onOpenChange(false);
      resetForm();
    },
  });

  /* ─── Form state ─── */

  const [relationType, setRelationType] = React.useState(
    existingRelation?.type ?? "",
  );
  const [direction, setDirection] = React.useState<"forward" | "backward">(
    existingRelation?.direction ?? "forward",
  );
  const [strength, setStrength] = React.useState(
    existingRelation?.strength ?? 0.5,
  );
  const [fromType, setFromType] = React.useState(
    existingRelation?.fromType ?? sourceUnit?.type ?? "",
  );
  const [purposes, setPurposes] = React.useState<Set<string>>(
    new Set(existingRelation?.purposes ?? []),
  );
  const [targetSearch, setTargetSearch] = React.useState("");
  const [selectedTarget, setSelectedTarget] = React.useState(
    initialTarget ?? null,
  );

  /* ─── Target unit search ─── */

  const unitsQuery = api.unit.list.useQuery(
    { projectId, search: targetSearch },
    { enabled: !!targetSearch.trim() && !selectedTarget },
  );

  const searchResults = unitsQuery.data?.items ?? [];

  /* ─── Reset form ─── */

  function resetForm() {
    setRelationType("");
    setDirection("forward");
    setStrength(0.5);
    setFromType(sourceUnit?.type ?? "");
    setPurposes(new Set());
    setTargetSearch("");
    setSelectedTarget(initialTarget ?? null);
  }

  /* ─── Sync with props on open ─── */

  React.useEffect(() => {
    if (open) {
      setRelationType(existingRelation?.type ?? "");
      setDirection(existingRelation?.direction ?? "forward");
      setStrength(existingRelation?.strength ?? 0.5);
      setFromType(existingRelation?.fromType ?? sourceUnit?.type ?? "");
      setPurposes(new Set(existingRelation?.purposes ?? []));
      setSelectedTarget(initialTarget ?? null);
      setTargetSearch("");
    }
  }, [open, existingRelation, sourceUnit, initialTarget]);

  /* ─── Purpose toggle ─── */

  function togglePurpose(p: string) {
    setPurposes((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  /* ─── Submit ─── */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUnit || !selectedTarget || !relationType) return;

    if (existingRelation) {
      updateMutation.mutate({
        id: existingRelation.id,
        type: relationType,
        strength,
        purpose: purposes.size > 0 ? [...purposes] : undefined,
      });
    } else {
      createMutation.mutate({
        sourceUnitId: direction === "forward" ? sourceUnit.id : selectedTarget.id,
        targetUnitId: direction === "forward" ? selectedTarget.id : sourceUnit.id,
        type: relationType,
        strength,
        fromType: fromType || undefined,
        purpose: purposes.size > 0 ? [...purposes] : undefined,
      });
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !!sourceUnit && !!selectedTarget && !!relationType && !isSubmitting;
  const isEditing = !!existingRelation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Relation" : "Create Relation"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the connection between these units."
              : "Connect two thought units with a typed relation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col gap-4">
          <ScrollArea className="flex-1 pr-2">
            <div className="flex flex-col gap-4 pb-2">
              {/* Source unit preview */}
              {sourceUnit && (
                <div>
                  <p className="text-xs font-medium text-text-tertiary mb-1">
                    {direction === "forward" ? "From" : "To"}
                  </p>
                  <div className="rounded-lg border border-border bg-bg-surface px-3 py-2">
                    <p className="text-sm text-text-primary line-clamp-2">
                      {sourceUnit.content}
                    </p>
                    <span
                      className="inline-block mt-1 text-xs rounded px-1 py-0.5 font-medium capitalize"
                      style={{
                        backgroundColor: `var(--unit-${sourceUnit.type}-bg, var(--bg-secondary))`,
                        color: `var(--unit-${sourceUnit.type}-accent, var(--text-secondary))`,
                      }}
                    >
                      {sourceUnit.type}
                    </span>
                  </div>
                </div>
              )}

              {/* Direction toggle */}
              <div className="flex items-center justify-center">
                <SimpleTooltip content={direction === "forward" ? "A to B" : "B to A"}>
                  <button
                    type="button"
                    onClick={() =>
                      setDirection((d) => (d === "forward" ? "backward" : "forward"))
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                      "border border-border bg-bg-surface text-sm text-text-secondary",
                      "hover:bg-bg-hover transition-colors duration-fast",
                    )}
                    aria-label="Toggle relation direction"
                  >
                    {direction === "forward" ? (
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{direction === "forward" ? "Forward" : "Reversed"}</span>
                  </button>
                </SimpleTooltip>
              </div>

              {/* Target unit selector */}
              <div>
                <p className="text-xs font-medium text-text-tertiary mb-1">
                  {direction === "forward" ? "To" : "From"}
                </p>
                {selectedTarget ? (
                  <div className="rounded-lg border border-border bg-bg-surface px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-text-primary line-clamp-2">
                          {selectedTarget.content}
                        </p>
                        <span
                          className="inline-block mt-1 text-xs rounded px-1 py-0.5 font-medium capitalize"
                          style={{
                            backgroundColor: `var(--unit-${selectedTarget.primaryType}-bg, var(--bg-secondary))`,
                            color: `var(--unit-${selectedTarget.primaryType}-accent, var(--text-secondary))`,
                          }}
                        >
                          {selectedTarget.primaryType}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs h-7"
                        onClick={() => {
                          setSelectedTarget(null);
                          setTargetSearch("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2",
                        "focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary",
                        "transition-all duration-fast",
                      )}
                    >
                      <Search className="h-4 w-4 text-text-tertiary shrink-0" aria-hidden="true" />
                      <input
                        value={targetSearch}
                        onChange={(e) => setTargetSearch(e.target.value)}
                        placeholder="Search units by content..."
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                        aria-label="Search for target unit"
                      />
                    </div>
                    {/* Search results */}
                    {targetSearch.trim() && (
                      <div className="rounded-lg border border-border bg-bg-primary max-h-40 overflow-y-auto">
                        {unitsQuery.isLoading ? (
                          <div className="p-2 flex flex-col gap-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} height="32px" />
                            ))}
                          </div>
                        ) : searchResults.length === 0 ? (
                          <p className="p-3 text-xs text-text-tertiary text-center">
                            No units found
                          </p>
                        ) : (
                          <div className="p-1">
                            {searchResults
                              .filter((u) => u.id !== sourceUnit?.id)
                              .map((unit) => (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => setSelectedTarget(unit)}
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left",
                                    "hover:bg-bg-hover transition-colors duration-fast",
                                  )}
                                >
                                  <span
                                    className="mt-1 h-2 w-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: `var(--unit-${unit.primaryType}-accent, var(--text-tertiary))`,
                                    }}
                                    aria-hidden="true"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary line-clamp-1">
                                      {unit.content}
                                    </p>
                                    <span className="text-xs text-text-tertiary capitalize">
                                      {unit.primaryType}
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Relation type selector */}
              <FormField htmlFor="relation-type" label="Relation type" required>
                <RelationTypeSelector
                  value={relationType}
                  onChange={setRelationType}
                />
              </FormField>

              {/* Strength slider */}
              <FormField
                htmlFor="relation-strength"
                label="Strength"
                description={`${(strength * 100).toFixed(0)}% — how strong is this connection?`}
              >
                <input
                  id="relation-strength"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  className={cn(
                    "w-full h-1.5 rounded-full appearance-none bg-bg-secondary",
                    "accent-accent-primary cursor-pointer",
                  )}
                  aria-label="Relation strength"
                />
              </FormField>

              {/* From type selector */}
              <FormField
                htmlFor="from-type"
                label="Source aspect"
                description="Which type aspect of the source unit does this relation reference?"
              >
                <input
                  id="from-type"
                  value={fromType}
                  onChange={(e) => setFromType(e.target.value)}
                  placeholder="e.g. claim, evidence, observation..."
                  className={cn(
                    "w-full rounded-lg border border-border bg-bg-surface px-3 py-2",
                    "text-sm text-text-primary placeholder:text-text-tertiary outline-none",
                    "focus:border-accent-primary focus:ring-1 focus:ring-accent-primary",
                    "transition-all duration-fast",
                  )}
                />
              </FormField>

              {/* Purpose checkboxes */}
              <div>
                <p className="text-xs font-medium text-text-tertiary mb-2">
                  Purpose (optional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {PURPOSE_OPTIONS.map(({ value: pVal, label }) => (
                    <label
                      key={pVal}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 cursor-pointer",
                        "border text-xs font-medium",
                        "transition-all duration-fast",
                        purposes.has(pVal)
                          ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                          : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={purposes.has(pVal)}
                        onChange={() => togglePurpose(pVal)}
                        className="sr-only"
                        aria-label={label}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Relation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
