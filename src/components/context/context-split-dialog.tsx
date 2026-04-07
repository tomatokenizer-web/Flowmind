"use client";

import { useState, useMemo, useEffect } from "react";
import { Scissors, Sparkles, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useContextActions, type SplitInput } from "~/hooks/use-context-actions";

// ─── Types ───────────────────────────────────────────────────────────

type Assignment = "parent" | "A" | "B";

interface UnitItem {
  unitId: string;
  content: string;
  unitType: string;
}

interface ContextSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextId: string;
  contextName: string;
  projectId: string;
  suggestedNameA?: string;
  suggestedNameB?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextSplitDialog({
  open,
  onOpenChange,
  contextId,
  contextName,
  projectId,
  suggestedNameA,
  suggestedNameB,
}: ContextSplitDialogProps) {
  const { splitContext, isSplitting, useUnitsForContext } = useContextActions(projectId);
  const { data: unitContexts, isLoading } = useUnitsForContext(open ? contextId : null);

  const [nameA, setNameA] = useState(suggestedNameA ?? "");
  const [nameB, setNameB] = useState(suggestedNameB ?? "");
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());

  const units: UnitItem[] = useMemo(
    () =>
      (unitContexts ?? []).map((uc: { unitId: string; unit: { content: string; unitType: string } }) => ({
        unitId: uc.unitId,
        content: uc.unit.content,
        unitType: uc.unit.unitType,
      })),
    [unitContexts],
  );

  const getAssignment = (unitId: string): Assignment =>
    assignments.get(unitId) ?? "parent";

  const setUnitAssignment = (unitId: string, value: Assignment) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      if (value === "parent") {
        next.delete(unitId);
      } else {
        next.set(unitId, value);
      }
      return next;
    });
  };

  const hasAssignment = useMemo(() => {
    for (const v of assignments.values()) {
      if (v === "A" || v === "B") return true;
    }
    return false;
  }, [assignments]);

  const canSubmit =
    nameA.trim().length > 0 &&
    nameB.trim().length > 0 &&
    nameA.trim() !== nameB.trim() &&
    hasAssignment &&
    !isSplitting;

  const handleSubmit = async () => {
    const input: SplitInput = {
      contextId,
      projectId,
      subContextA: {
        name: nameA.trim(),
        unitIds: [...assignments.entries()]
          .filter(([, v]) => v === "A")
          .map(([k]) => k),
      },
      subContextB: {
        name: nameB.trim(),
        unitIds: [...assignments.entries()]
          .filter(([, v]) => v === "B")
          .map(([k]) => k),
      },
    };

    await splitContext(input);
    onOpenChange(false);
    resetForm();
  };

  // Sync suggested names when dialog opens
  useEffect(() => {
    if (open) {
      setNameA(suggestedNameA ?? "");
      setNameB(suggestedNameB ?? "");
      setAssignments(new Map());
    }
  }, [open, suggestedNameA, suggestedNameB]);

  // AI-suggested unit allocation
  const suggestSplitMutation = api.ai.suggestSplitAllocation.useMutation();
  const [isAllocating, setIsAllocating] = useState(false);

  const handleAISuggestAllocation = async () => {
    if (units.length === 0) return;
    setIsAllocating(true);
    try {
      const result = await suggestSplitMutation.mutateAsync({
        contextId,
        nameA: nameA.trim() || "A",
        nameB: nameB.trim() || "B",
      });
      if (result?.allocations) {
        const newAssignments = new Map<string, Assignment>();
        for (const alloc of result.allocations) {
          if (alloc.group === "A" || alloc.group === "B") {
            newAssignments.set(alloc.unitId, alloc.group);
          }
        }
        setAssignments(newAssignments);
      }
    } catch {
      // Silent fail — user can still assign manually
    } finally {
      setIsAllocating(false);
    }
  };

  const resetForm = () => {
    setNameA(suggestedNameA ?? "");
    setNameB(suggestedNameB ?? "");
    setAssignments(new Map());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-text-secondary" />
            Split Context
          </DialogTitle>
          <DialogDescription>
            Split &ldquo;{contextName}&rdquo; into two sub-contexts. Unassigned units remain in the parent.
          </DialogDescription>
        </DialogHeader>

        {/* Sub-context names */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label
              htmlFor="split-name-a"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Sub-Context A
            </label>
            <input
              id="split-name-a"
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="e.g. Research"
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
                "text-sm text-text-primary placeholder:text-text-tertiary",
                "outline-none transition-colors duration-fast",
                "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
              )}
            />
          </div>
          <div>
            <label
              htmlFor="split-name-b"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Sub-Context B
            </label>
            <input
              id="split-name-b"
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="e.g. Analysis"
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
                "text-sm text-text-primary placeholder:text-text-tertiary",
                "outline-none transition-colors duration-fast",
                "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
              )}
            />
          </div>
        </div>

        {/* Unit assignment */}
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">
              Assign units ({units.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAISuggestAllocation}
              disabled={isAllocating || units.length === 0}
              className="h-6 gap-1 text-xs text-accent-primary"
            >
              {isAllocating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isAllocating ? "Allocating..." : "AI Suggest"}
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-bg-secondary"
                />
              ))}
            </div>
          ) : units.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-tertiary">
              No units in this context
            </p>
          ) : (
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-1">
                {units.map((unit) => (
                  <UnitAssignmentRow
                    key={unit.unitId}
                    unit={unit}
                    assignment={getAssignment(unit.unitId)}
                    onAssign={(v) => setUnitAssignment(unit.unitId, v)}
                    nameA={nameA || "A"}
                    nameB={nameB || "B"}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSplitting ? "Splitting..." : "Split Context"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unit Row ────────────────────────────────────────────────────────

function UnitAssignmentRow({
  unit,
  assignment,
  onAssign,
  nameA,
  nameB,
}: {
  unit: UnitItem;
  assignment: Assignment;
  onAssign: (value: Assignment) => void;
  nameA: string;
  nameB: string;
}) {
  const radioName = `assign-${unit.unitId}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2",
        "text-sm transition-colors duration-fast",
        assignment === "A" && "border-accent-primary/30 bg-blue-50/50",
        assignment === "B" && "border-accent-primary/30 bg-purple-50/50",
        assignment === "parent" && "bg-bg-surface",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-text-primary">
        {unit.content.slice(0, 80)}
        {unit.content.length > 80 ? "..." : ""}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <RadioOption
          name={radioName}
          value="parent"
          checked={assignment === "parent"}
          onChange={() => onAssign("parent")}
          label="Keep"
        />
        <RadioOption
          name={radioName}
          value="A"
          checked={assignment === "A"}
          onChange={() => onAssign("A")}
          label={nameA}
        />
        <RadioOption
          name={radioName}
          value="B"
          checked={assignment === "B"}
          onChange={() => onAssign("B")}
          label={nameB}
        />
      </div>
    </div>
  );
}

// ─── Radio ──────────────────────────────────────────────────────────

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const id = `${name}-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1",
        "text-xs transition-colors duration-fast",
        checked
          ? "bg-accent-primary/10 font-medium text-accent-primary"
          : "text-text-tertiary hover:text-text-secondary",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
