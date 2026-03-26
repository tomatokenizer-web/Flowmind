"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Link2,
  ArrowRight,
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { toast } from "~/lib/toast";
import type { UnitType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

interface FlowReaderProps {
  /** Ordered unit IDs to navigate through */
  path: string[];
  /** Initial step index */
  initialStep?: number;
  /** Navigator ID (for creating derived units into same navigator) */
  navigatorId?: string;
  /** Context ID for relation-aware actions */
  contextId: string;
  /** Project ID for creating new units */
  projectId: string;
  /** Called when the reader is closed */
  onClose: () => void;
  /** Called when a unit is selected (e.g. to sync sidebar panel) */
  onUnitSelect?: (unitId: string) => void;
}

// ─── Slide direction helper ──────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// ─── Component ───────────────────────────────────────────────────────

export function FlowReader({
  path,
  initialStep = 0,
  navigatorId,
  contextId,
  projectId,
  onClose,
  onUnitSelect,
}: FlowReaderProps) {
  const [step, setStep] = React.useState(initialStep);
  const [[direction], setDirection] = React.useState([0]);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newContent, setNewContent] = React.useState("");
  const [newType, setNewType] = React.useState<string>("idea");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentUnitId = path[step];
  const utils = api.useUtils();

  // ── Fetch current unit data ──────────────────────────────────────
  const { data: unit, isLoading } = api.unit.getById.useQuery(
    { id: currentUnitId! },
    { enabled: !!currentUnitId },
  );

  // ── Fetch relations for current unit ─────────────────────────────
  const { data: relations = [] } = api.relation.listByUnit.useQuery(
    { unitId: currentUnitId!, contextId },
    { enabled: !!currentUnitId },
  );

  // ── Mutations ────────────────────────────────────────────────────
  const createUnit = api.unit.create.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
      toast.success("Derived unit created");
      setShowCreate(false);
      setNewContent("");
    },
  });

  const createRelation = api.relation.create.useMutation({
    onSuccess: () => {
      void utils.relation.listByUnit.invalidate();
    },
  });

  const addToNavigator = api.navigator.addUnit.useMutation({
    onSuccess: () => {
      void utils.navigator.list.invalidate();
    },
  });

  // ── Navigation handlers ──────────────────────────────────────────
  const canPrev = step > 0;
  const canNext = step < path.length - 1;

  const goTo = React.useCallback(
    (newStep: number) => {
      const dir = newStep > step ? 1 : -1;
      setDirection([dir]);
      setStep(newStep);
      setShowCreate(false);
      const unitId = path[newStep];
      if (unitId) onUnitSelect?.(unitId);
    },
    [step, path, onUnitSelect],
  );

  const goPrev = React.useCallback(() => {
    if (canPrev) goTo(step - 1);
  }, [canPrev, goTo, step]);

  const goNext = React.useCallback(() => {
    if (canNext) goTo(step + 1);
  }, [canNext, goTo, step]);

  // ── Keyboard handler ─────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  // Auto-focus container
  React.useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // ── Create derived unit ──────────────────────────────────────────
  const handleCreateDerived = async () => {
    if (!newContent.trim() || !currentUnitId) return;

    const created = await createUnit.mutateAsync({
      content: newContent.trim(),
      unitType: newType as UnitType,
      lifecycle: "draft",
      originType: "direct_write",
      sourceSpan: { derivedFrom: currentUnitId },
      projectId,
    });

    // Auto-create a "derives_from" relation
    await createRelation.mutateAsync({
      sourceUnitId: created.id,
      targetUnitId: currentUnitId,
      type: "derives_from",
      strength: 0.8,
    });

    // Optionally add to same navigator
    if (navigatorId) {
      await addToNavigator.mutateAsync({
        navigatorId,
        unitId: created.id,
      });
    }
  };

  // ── Relation summary for current unit ────────────────────────────
  const outgoing = relations.filter(
    (r) => r.sourceUnitId === currentUnitId,
  );
  const incoming = relations.filter(
    (r) => r.targetUnitId === currentUnitId,
  );

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary/95 backdrop-blur-sm outline-none"
      role="dialog"
      aria-label="Flow Reader"
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Flow Reader</span>
          <span>
            {step + 1} / {path.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────── */}
      <div className="h-1 bg-bg-secondary">
        <motion.div
          className="h-full bg-accent-primary"
          animate={{ width: `${((step + 1) / path.length) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* ── Main content area ───────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        {/* Prev button */}
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          className={cn(
            "shrink-0 mr-4 flex h-12 w-12 items-center justify-center rounded-full border border-border transition-all",
            canPrev
              ? "hover:bg-bg-hover hover:border-accent-primary text-text-secondary hover:text-accent-primary cursor-pointer"
              : "opacity-20 cursor-default",
          )}
          aria-label="Previous unit"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Card carousel */}
        <div className="relative flex-1 max-w-2xl min-h-0">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentUnitId}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full"
            >
              {isLoading || !unit ? (
                <div className="rounded-2xl border border-border bg-bg-surface p-8 shadow-lg">
                  <div className="h-6 w-24 animate-pulse rounded bg-bg-secondary mb-4" />
                  <div className="h-4 w-full animate-pulse rounded bg-bg-secondary mb-2" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-bg-secondary" />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-surface p-8 shadow-lg space-y-4">
                  {/* Type badge + metadata */}
                  <div className="flex items-center gap-3">
                    <UnitTypeBadge unitType={unit.unitType} />
                    <span className="text-xs text-text-tertiary capitalize">
                      {unit.lifecycle}
                    </span>
                  </div>

                  {/* Main content */}
                  <p className="text-lg leading-relaxed text-text-primary whitespace-pre-wrap">
                    {unit.content}
                  </p>

                  {/* Relations summary */}
                  {relations.length > 0 && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        Relations ({relations.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {outgoing.slice(0, 5).map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-xs text-accent-primary"
                          >
                            <ArrowRight className="h-3 w-3" />
                            {r.type.replace(/_/g, " ")}
                          </span>
                        ))}
                        {incoming.slice(0, 5).map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-0.5 text-xs text-text-secondary"
                          >
                            <Link2 className="h-3 w-3" />
                            {r.type.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create derived unit section */}
                  {!showCreate ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-2 text-sm text-text-tertiary hover:text-accent-primary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create derived unit
                    </button>
                  ) : (
                    <div className="border-t border-border pt-4 space-y-3">
                      <textarea
                        autoFocus
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Write a new unit derived from this one..."
                        className="w-full rounded-lg border border-border bg-bg-primary p-3 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setShowCreate(false);
                            setNewContent("");
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          className="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        >
                          <option value="claim">Claim</option>
                          <option value="question">Question</option>
                          <option value="evidence">Evidence</option>
                          <option value="counterargument">Counter</option>
                          <option value="observation">Observation</option>
                          <option value="idea">Idea</option>
                          <option value="definition">Definition</option>
                          <option value="assumption">Assumption</option>
                          <option value="action">Action</option>
                        </select>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreate(false);
                            setNewContent("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!newContent.trim() || createUnit.isPending}
                          onClick={() => void handleCreateDerived()}
                        >
                          {createUnit.isPending ? "Creating…" : "Create & Link"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className={cn(
            "shrink-0 ml-4 flex h-12 w-12 items-center justify-center rounded-full border border-border transition-all",
            canNext
              ? "hover:bg-bg-hover hover:border-accent-primary text-text-secondary hover:text-accent-primary cursor-pointer"
              : "opacity-20 cursor-default",
          )}
          aria-label="Next unit"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* ── Bottom step indicators ──────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 border-t border-border py-3">
        {path.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === step
                ? "w-6 bg-accent-primary"
                : "w-2 bg-border hover:bg-text-tertiary",
            )}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Keyboard hint ───────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 pb-3 text-xs text-text-tertiary">
        <span>← → Navigate</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}
