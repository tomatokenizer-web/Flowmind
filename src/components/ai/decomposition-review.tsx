"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, GripVertical, ChevronRight, Pencil, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UNIT_TYPE_COLORS } from "~/lib/unit-types";
import { api } from "~/trpc/react";
import type { UnitType } from "@prisma/client";
import type { UnitProposal, DecompositionRelationProposal, UserPurpose } from "~/server/ai";

// ─── Types ────────────────────────────────────────────────────────────────

interface DecompositionReviewProps {
  originalText: string;
  purpose: UserPurpose;
  proposals: UnitProposal[];
  relationProposals: DecompositionRelationProposal[];
  projectId: string;
  contextId: string;
  onComplete: (acceptedCount: number, rejectedCount: number) => void;
  onCancel: () => void;
  className?: string;
}

type ProposalStatus = "pending" | "accepted" | "rejected";

interface ProposalState {
  proposal: UnitProposal;
  status: ProposalStatus;
  /** User-edited content (overrides proposal.content when set) */
  editedContent: string;
  /** User-selected type override */
  editedType: string;
  createdUnitId?: string;
  isEditing: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────

const UNIT_TYPES: UnitType[] = [
  "claim",
  "question",
  "evidence",
  "counterargument",
  "observation",
  "idea",
  "definition",
  "assumption",
  "action",
];

const PURPOSE_LABELS: Record<UserPurpose, { label: string; color: string }> = {
  arguing: { label: "Building Argument", color: "text-blue-600" },
  brainstorming: { label: "Brainstorming", color: "text-purple-600" },
  researching: { label: "Researching", color: "text-green-600" },
  defining: { label: "Defining Concepts", color: "text-teal-600" },
  other: { label: "General Notes", color: "text-gray-600" },
};

// ─── Component ────────────────────────────────────────────────────────────

export function DecompositionReview({
  originalText,
  purpose,
  proposals: initialProposals,
  relationProposals,
  projectId,
  contextId: _contextId,
  onComplete,
  onCancel,
  className,
}: DecompositionReviewProps) {
  const [proposalStates, setProposalStates] = React.useState<ProposalState[]>(() =>
    initialProposals.map((p) => ({
      proposal: p,
      status: "pending",
      editedContent: p.content,
      editedType: p.proposedType,
      isEditing: false,
    }))
  );

  // Drag state for boundary handles
  const [draggingIdx, setDraggingIdx] = React.useState<number | null>(null);
  const textContainerRef = React.useRef<HTMLDivElement>(null);

  const utils = api.useUtils();
  const createUnitMutation = api.unit.create.useMutation();
  const createRelationMutation = api.relation.create.useMutation();

  // Stats
  const acceptedCount = proposalStates.filter((p) => p.status === "accepted").length;
  const rejectedCount = proposalStates.filter((p) => p.status === "rejected").length;
  const pendingCount = proposalStates.filter((p) => p.status === "pending").length;
  const isComplete = pendingCount === 0;

  // ── Editing helpers ──────────────────────────────────────────────────────

  const startEditing = React.useCallback((index: number) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, isEditing: true } : p))
    );
  }, []);

  const commitEdit = React.useCallback((index: number) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, isEditing: false } : p))
    );
  }, []);

  const updateEditedContent = React.useCallback((index: number, value: string) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, editedContent: value } : p))
    );
  }, []);

  const updateEditedType = React.useCallback((index: number, value: string) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, editedType: value } : p))
    );
  }, []);

  // ── Accept / Reject ──────────────────────────────────────────────────────

  const handleAccept = React.useCallback(
    async (index: number) => {
      const state = proposalStates[index];
      if (!state || state.status !== "pending") return;

      const content = state.editedContent.trim() || state.proposal.content;
      const unitType = state.editedType as UnitType;

      try {
        const unit = await createUnitMutation.mutateAsync({
          content,
          projectId,
          unitType,
          originType: "ai_generated",
          lifecycle: "pending",
        });

        setProposalStates((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, status: "accepted", createdUnitId: unit.id, isEditing: false } : p
          )
        );

        // Create relations for this unit
        const relevantRelations = relationProposals.filter((r) => r.sourceIdx === index);
        for (const rel of relevantRelations) {
          try {
            await createRelationMutation.mutateAsync({
              sourceUnitId: unit.id,
              targetUnitId: rel.targetUnitId,
              type: rel.relationType,
              strength: rel.strength,
            });
          } catch {
            // Silently skip - target may be in draft state
          }
        }

        await utils.unit.list.invalidate();
      } catch (error) {
        console.error("Failed to create unit:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        // Auto-reject duplicates
        if (errMsg.includes("duplicate") || errMsg.includes("CONFLICT") || errMsg.includes("identical content")) {
          setProposalStates((prev) =>
            prev.map((p, i) => (i === index ? { ...p, status: "rejected" } : p))
          );
        }
      }
    },
    [proposalStates, createUnitMutation, createRelationMutation, projectId, relationProposals, utils]
  );

  const handleReject = React.useCallback((index: number) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, status: "rejected", isEditing: false } : p))
    );
  }, []);

  // Bulk actions
  const handleAcceptAllRemaining = React.useCallback(async () => {
    const pendingIndices = proposalStates
      .map((p, i) => (p.status === "pending" ? i : -1))
      .filter((i) => i !== -1);
    for (const idx of pendingIndices) {
      await handleAccept(idx);
    }
  }, [proposalStates, handleAccept]);

  const handleRejectAllRemaining = React.useCallback(() => {
    setProposalStates((prev) =>
      prev.map((p) => (p.status === "pending" ? { ...p, status: "rejected", isEditing: false } : p))
    );
  }, []);

  const handleDone = React.useCallback(() => {
    onComplete(acceptedCount, rejectedCount);
  }, [onComplete, acceptedCount, rejectedCount]);

  // ── Drag boundary handles ────────────────────────────────────────────────

  const handleDragStart = React.useCallback((index: number) => {
    setDraggingIdx(index);
  }, []);

  const handleDragEnd = React.useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (draggingIdx === null || !textContainerRef.current) return;

      const container = textContainerRef.current;
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
      const relativeX = clientX - rect.left;
      const charWidth = rect.width / originalText.length;
      const newCharPos = Math.round(relativeX / charWidth);
      const clampedPos = Math.max(0, Math.min(originalText.length, newCharPos));

      setProposalStates((prev) => {
        const updated = [...prev];
        const current = updated[draggingIdx];
        if (!current) return prev;

        const newEndChar = Math.max(current.proposal.startChar + 5, clampedPos);
        const newContent = originalText.slice(current.proposal.startChar, newEndChar);
        updated[draggingIdx] = {
          ...current,
          proposal: { ...current.proposal, endChar: newEndChar, content: newContent },
          editedContent: newContent,
        };

        if (draggingIdx < updated.length - 1) {
          const next = updated[draggingIdx + 1];
          if (next) {
            const nextContent = originalText.slice(newEndChar, next.proposal.endChar);
            updated[draggingIdx + 1] = {
              ...next,
              proposal: { ...next.proposal, startChar: newEndChar, content: nextContent },
              editedContent: nextContent,
            };
          }
        }

        return updated;
      });

      setDraggingIdx(null);
    },
    [draggingIdx, originalText]
  );

  const getTypeColors = (type: string) =>
    UNIT_TYPE_COLORS[type as UnitType] ?? { bg: "#F5F5F7", accent: "#6E6E73" };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-text-primary">AI Decomposition</span>
          <span className={cn("text-xs font-medium", PURPOSE_LABELS[purpose].color)}>
            {PURPOSE_LABELS[purpose].label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="text-emerald-600">{acceptedCount} accepted</span>
          <span>·</span>
          <span className="text-red-500">{rejectedCount} rejected</span>
          <span>·</span>
          <span>{pendingCount} pending</span>
        </div>
      </div>

      {/* Original text with color-coded boundary highlights */}
      <div
        ref={textContainerRef}
        className="relative rounded-lg border border-border-primary bg-bg-secondary p-4"
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
      >
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          Original Text
        </p>
        <div className="text-sm leading-relaxed text-text-primary">
          {proposalStates.map((state, idx) => {
            const colors = getTypeColors(state.editedType);
            const isAccepted = state.status === "accepted";
            const isRejected = state.status === "rejected";

            return (
              <React.Fragment key={state.proposal.id}>
                <motion.span
                  layout
                  className={cn(
                    "relative inline rounded px-0.5 transition-colors duration-200",
                    isAccepted && "opacity-50",
                    isRejected && "line-through opacity-30"
                  )}
                  style={{
                    backgroundColor: isRejected ? "#FEF2F2" : colors.bg,
                    borderLeft: `2px solid ${isRejected ? "#991B1B" : colors.accent}`,
                  }}
                  title={state.editedType.replace(/_/g, " ")}
                >
                  {state.editedContent || state.proposal.content}
                </motion.span>
                {/* Draggable boundary handle */}
                {idx < proposalStates.length - 1 && (
                  <span
                    className={cn(
                      "relative mx-1 inline-flex cursor-col-resize items-center opacity-40 hover:opacity-100",
                      draggingIdx === idx && "opacity-100"
                    )}
                    onMouseDown={() => handleDragStart(idx)}
                    onTouchStart={() => handleDragStart(idx)}
                    title="Drag to adjust boundary"
                  >
                    <GripVertical className="h-4 w-4 text-text-tertiary" />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Proposal cards */}
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {proposalStates.map((state, idx) => {
            const colors = getTypeColors(state.editedType);
            const isPending = state.status === "pending";

            return (
              <motion.div
                key={state.proposal.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{
                  opacity: state.status === "rejected" ? 0.5 : 1,
                  y: 0,
                  scale: state.status === "accepted" ? 0.98 : 1,
                }}
                exit={{ opacity: 0, scale: 0.95, x: state.status === "accepted" ? 50 : -50 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "rounded-lg border p-3 transition-colors duration-200",
                  isPending
                    ? "border-border-primary bg-bg-primary"
                    : state.status === "accepted"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-red-200 bg-red-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type badge row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type selector (only editable when pending) */}
                      {isPending ? (
                        <div className="relative inline-flex items-center">
                          <select
                            value={state.editedType}
                            onChange={(e) => updateEditedType(idx, e.target.value)}
                            className={cn(
                              "appearance-none rounded px-1.5 py-0.5 pr-5 text-xs font-medium capitalize cursor-pointer",
                              "border-0 outline-none focus:ring-1 focus:ring-offset-0 focus:ring-blue-400"
                            )}
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.accent,
                            }}
                            aria-label="Unit type"
                          >
                            {UNIT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3"
                            style={{ color: colors.accent }}
                          />
                        </div>
                      ) : (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: colors.bg, color: colors.accent }}
                        >
                          {state.editedType.replace(/_/g, " ")}
                        </span>
                      )}

                      <span className="text-[10px] text-text-tertiary">
                        {Math.round(state.proposal.confidence * 100)}% confident
                      </span>

                      {state.status === "accepted" && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                          <Check className="h-3 w-3" /> Created
                        </span>
                      )}
                      {state.status === "rejected" && (
                        <span className="flex items-center gap-0.5 text-[10px] text-red-500">
                          <X className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>

                    {/* Content: editable textarea or read-only text */}
                    {state.isEditing ? (
                      <div className="mt-1.5">
                        <textarea
                          autoFocus
                          value={state.editedContent}
                          onChange={(e) => updateEditedContent(idx, e.target.value)}
                          onBlur={() => commitEdit(idx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              commitEdit(idx);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              // Revert to proposal content on Escape
                              updateEditedContent(idx, state.proposal.content);
                              commitEdit(idx);
                            }
                          }}
                          className={cn(
                            "w-full resize-none rounded border border-blue-300 bg-blue-50/30 px-2 py-1",
                            "text-sm text-text-primary outline-none focus:ring-1 focus:ring-blue-400",
                            "min-h-[60px]"
                          )}
                          rows={3}
                          aria-label="Edit unit content"
                        />
                        <p className="mt-0.5 text-[10px] text-text-tertiary">
                          Cmd+Enter to confirm · Esc to revert
                        </p>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          "mt-1 text-sm",
                          state.status === "rejected" ? "text-text-tertiary line-clamp-2" : "text-text-secondary line-clamp-3"
                        )}
                      >
                        {state.editedContent || state.proposal.content}
                      </p>
                    )}

                    {/* Relation count */}
                    {relationProposals.filter((r) => r.sourceIdx === idx).length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-text-tertiary">
                        <ChevronRight className="h-3 w-3" />
                        {relationProposals.filter((r) => r.sourceIdx === idx).length} relation
                        {relationProposals.filter((r) => r.sourceIdx === idx).length > 1 ? "s" : ""}{" "}
                        proposed
                      </p>
                    )}
                  </div>

                  {/* Action buttons - only for pending */}
                  {isPending && (
                    <div className="flex shrink-0 gap-1">
                      {/* Edit button */}
                      {!state.isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(idx)}
                          className="h-7 w-7 p-0 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary"
                          title="Edit content"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {/* Accept */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAccept(idx)}
                        disabled={createUnitMutation.isPending || state.isEditing}
                        className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                        title="Accept this unit"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      {/* Reject */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(idx)}
                        disabled={state.isEditing}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-100 hover:text-red-600"
                        title="Reject this unit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border-primary pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-text-secondary">
          Cancel
        </Button>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRejectAllRemaining}
                disabled={createUnitMutation.isPending}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                Reject All ({pendingCount})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAcceptAllRemaining}
                disabled={createUnitMutation.isPending}
              >
                Accept All ({pendingCount})
              </Button>
            </>
          )}
          {isComplete && (
            <Button variant="primary" size="sm" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
