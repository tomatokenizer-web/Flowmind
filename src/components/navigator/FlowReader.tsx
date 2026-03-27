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
  PanelRightOpen,
  PanelRightClose,
  Layers,
  Compass,
  BookOpen,
  GitFork,
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

// ─── Helpers ─────────────────────────────────────────────────────────

function sanitizeContent(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

const RELATION_COLORS: Record<string, string> = {
  supports: "#10B981",
  contradicts: "#EF4444",
  derives_from: "#3B82F6",
  expands: "#8B5CF6",
  references: "#6B7280",
  exemplifies: "#F59E0B",
  defines: "#06B6D4",
  questions: "#F97316",
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
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentUnitId = path[step];
  const pathSet = React.useMemo(() => new Set(path), [path]);
  const utils = api.useUtils();

  // ── Fetch current unit data ──────────────────────────────────────
  const { data: unit, isLoading } = api.unit.getById.useQuery(
    { id: currentUnitId! },
    { enabled: !!currentUnitId },
  );

  // ── Fetch relations for current unit ─────────────────────────────
  const { data: relations = [] } = api.relation.listByUnit.useQuery(
    { unitId: currentUnitId! },
    { enabled: !!currentUnitId },
  );

  // ── Branching data: contexts, navigators, assemblies ─────────────
  const { data: contexts = [] } = api.unit.getContextsForUnit.useQuery(
    { unitId: currentUnitId! },
    { enabled: !!currentUnitId && sidebarOpen },
  );

  const { data: navigators = [] } = api.navigator.listByUnit.useQuery(
    { unitId: currentUnitId! },
    { enabled: !!currentUnitId && sidebarOpen },
  );

  const { data: assemblies = [] } = api.assembly.listByUnit.useQuery(
    { unitId: currentUnitId! },
    { enabled: !!currentUnitId && sidebarOpen },
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

  // ── Branch to a related unit (navigate to it if in path, or jump) ──
  const branchTo = React.useCallback(
    (unitId: string) => {
      const idx = path.indexOf(unitId);
      if (idx >= 0) {
        goTo(idx);
      } else {
        // Jump: replace current step direction and navigate
        setDirection([1]);
        setStep(step); // trigger re-render with new unit
        onUnitSelect?.(unitId);
        toast.success("Branched to related unit");
      }
    },
    [path, goTo, step, onUnitSelect],
  );

  // ── Keyboard handler ─────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
      } else if (e.key === "b" || e.key === "B") {
        setSidebarOpen((v) => !v);
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

    await createRelation.mutateAsync({
      sourceUnitId: created.id,
      targetUnitId: currentUnitId,
      type: "derives_from",
      strength: 0.8,
    });

    if (navigatorId) {
      await addToNavigator.mutateAsync({
        navigatorId,
        unitId: created.id,
      });
    }
  };

  // ── Group relations by type for sidebar ────────────────────────────
  const relatedUnits = React.useMemo(() => {
    const grouped: Record<string, Array<{ id: string; content: string; unitType: string; direction: "out" | "in" }>> = {};
    for (const r of relations) {
      const isOutgoing = r.sourceUnitId === currentUnitId;
      const other = isOutgoing ? r.targetUnit : r.sourceUnit;
      if (!other || other.id === currentUnitId) continue;
      const type = r.type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type]!.push({
        id: other.id,
        content: sanitizeContent(other.content).slice(0, 60),
        unitType: other.unitType,
        direction: isOutgoing ? "out" : "in",
      });
    }
    return grouped;
  }, [relations, currentUnitId]);

  const outgoing = relations.filter((r) => r.sourceUnitId === currentUnitId);
  const incoming = relations.filter((r) => r.targetUnitId === currentUnitId);

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
            aria-label={sidebarOpen ? "Hide branches" : "Show branches"}
            title="Toggle branch sidebar (B)"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────── */}
      <div className="h-1 bg-bg-secondary">
        <motion.div
          className="h-full bg-accent-primary"
          animate={{ width: `${((step + 1) / path.length) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* ── Main content area with optional sidebar ───────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: card carousel */}
        <div className="flex flex-1 items-center justify-center px-4">
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
                      {sanitizeContent(unit.content)}
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
                            {createUnit.isPending ? "Creating..." : "Create & Link"}
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

        {/* ── Right sidebar: branching panel ──────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="shrink-0 border-l border-border bg-bg-surface overflow-hidden"
            >
              <div className="h-full w-[320px] overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <GitFork className="h-3.5 w-3.5" />
                  Branches
                </div>

                {/* ── Relations grouped by type ──────────────── */}
                {Object.keys(relatedUnits).length > 0 && (
                  <BranchSection
                    icon={<Link2 className="h-3.5 w-3.5" />}
                    title="Related Units"
                    defaultOpen
                  >
                    {Object.entries(relatedUnits).map(([type, units]) => (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center gap-1.5 px-1">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: RELATION_COLORS[type] ?? "#6B7280" }}
                          />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                            {type.replace(/_/g, " ")} ({units.length})
                          </span>
                        </div>
                        {units.map((u) => (
                          <BranchCard
                            key={u.id}
                            content={u.content}
                            unitType={u.unitType}
                            isInPath={pathSet.has(u.id)}
                            direction={u.direction}
                            onClick={() => branchTo(u.id)}
                          />
                        ))}
                      </div>
                    ))}
                  </BranchSection>
                )}

                {/* ── Contexts ───────────────────────────────── */}
                {contexts.length > 0 && (
                  <BranchSection
                    icon={<Layers className="h-3.5 w-3.5" />}
                    title={`Contexts (${contexts.length})`}
                  >
                    {contexts.map((ctx) => (
                      <div
                        key={ctx.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs border border-border",
                          ctx.id === contextId
                            ? "bg-accent-primary/10 border-accent-primary/30"
                            : "bg-bg-primary hover:bg-bg-hover cursor-pointer",
                        )}
                      >
                        <div className="font-medium text-text-primary truncate">
                          {ctx.name}
                        </div>
                        <div className="text-text-tertiary mt-0.5">
                          {ctx.unitCount} units
                          {ctx.id === contextId && (
                            <span className="ml-1.5 text-accent-primary font-medium">current</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </BranchSection>
                )}

                {/* ── Navigators ─────────────────────────────── */}
                {navigators.length > 0 && (
                  <BranchSection
                    icon={<Compass className="h-3.5 w-3.5" />}
                    title={`Navigators (${navigators.length})`}
                  >
                    {navigators.map((nav) => (
                      <div
                        key={nav.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs border border-border",
                          nav.id === navigatorId
                            ? "bg-accent-primary/10 border-accent-primary/30"
                            : "bg-bg-primary hover:bg-bg-hover cursor-pointer",
                        )}
                      >
                        <div className="font-medium text-text-primary truncate">
                          {nav.name}
                        </div>
                        <div className="text-text-tertiary mt-0.5">
                          {nav.path?.length ?? 0} steps
                          {nav.id === navigatorId && (
                            <span className="ml-1.5 text-accent-primary font-medium">current</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </BranchSection>
                )}

                {/* ── Assemblies ──────────────────────────────── */}
                {assemblies.length > 0 && (
                  <BranchSection
                    icon={<BookOpen className="h-3.5 w-3.5" />}
                    title={`Assemblies (${assemblies.length})`}
                  >
                    {assemblies.map((asm) => (
                      <div
                        key={asm.id}
                        className="rounded-lg px-3 py-2 text-xs border border-border bg-bg-primary hover:bg-bg-hover cursor-pointer"
                      >
                        <div className="font-medium text-text-primary truncate">
                          {asm.name}
                        </div>
                        <div className="text-text-tertiary mt-0.5 capitalize">
                          {asm.templateType?.replace(/_/g, " ") ?? "custom"}
                        </div>
                      </div>
                    ))}
                  </BranchSection>
                )}

                {/* Empty state */}
                {Object.keys(relatedUnits).length === 0 &&
                  contexts.length === 0 &&
                  navigators.length === 0 &&
                  assemblies.length === 0 && (
                    <p className="text-xs text-text-tertiary text-center py-8">
                      No branches found for this unit.
                    </p>
                  )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
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
        <span>B Branches</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}

// ─── Branch Section (collapsible) ────────────────────────────────────

function BranchSection({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        {icon}
        <span>{title}</span>
        <ChevronRight
          className={cn(
            "ml-auto h-3 w-3 text-text-tertiary transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && <div className="space-y-1.5 pl-0.5">{children}</div>}
    </div>
  );
}

// ─── Branch Card (clickable mini unit card) ──────────────────────────

function BranchCard({
  content,
  unitType,
  isInPath,
  direction,
  onClick,
}: {
  content: string;
  unitType: string;
  isInPath: boolean;
  direction: "out" | "in";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left text-xs border transition-colors",
        "hover:bg-bg-hover hover:border-accent-primary/50",
        isInPath
          ? "border-accent-primary/30 bg-accent-primary/5"
          : "border-border bg-bg-primary",
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <UnitTypeBadge unitType={unitType as UnitType} />
        {direction === "out" ? (
          <ArrowRight className="h-2.5 w-2.5 text-text-tertiary" />
        ) : (
          <ArrowRight className="h-2.5 w-2.5 text-text-tertiary rotate-180" />
        )}
        {isInPath && (
          <span className="ml-auto text-[9px] font-medium text-accent-primary">
            in path
          </span>
        )}
      </div>
      <p className="text-text-secondary line-clamp-2 leading-relaxed">
        {content}
      </p>
    </button>
  );
}
