"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, GripVertical, ChevronRight } from "lucide-react";
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
  createdUnitId?: string;
}

// ─── Purpose Labels ───────────────────────────────────────────────────────

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
  contextId,
  onComplete,
  onCancel,
  className,
}: DecompositionReviewProps) {
  // Track proposal states with boundaries that can be adjusted
  const [proposalStates, setProposalStates] = React.useState<ProposalState[]>(() =>
    initialProposals.map((p) => ({ proposal: p, status: "pending" }))
  );

  // Track drag state for boundary handles
  const [draggingIdx, setDraggingIdx] = React.useState<number | null>(null);
  const textContainerRef = React.useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  // Unit creation mutation
  const createUnitMutation = api.unit.create.useMutation();
  // Relation creation mutation
  const createRelationMutation = api.relation.create.useMutation();

  // Count stats
  const acceptedCount = proposalStates.filter((p) => p.status === "accepted").length;
  const rejectedCount = proposalStates.filter((p) => p.status === "rejected").length;
  const pendingCount = proposalStates.filter((p) => p.status === "pending").length;

  // Check if all proposals are processed
  const isComplete = pendingCount === 0;

  // Handle accepting a single proposal
  const handleAccept = React.useCallback(
    async (index: number) => {
      const state = proposalStates[index];
      if (!state || state.status !== "pending") return;

      try {
        // Create the unit with lifecycle "pending" (not "draft") because the user
        // explicitly accepted it. This also allows relation creation, which the
        // relation router rejects for "draft" units.
        const unit = await createUnitMutation.mutateAsync({
          content: state.proposal.content,
          projectId,
          unitType: state.proposal.proposedType as UnitType,
          originType: "ai_generated",
          lifecycle: "pending",
        });

        // Update state with created unit ID
        setProposalStates((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, status: "accepted", createdUnitId: unit.id } : p
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
            // Relation creation may fail if target unit is in draft state
            // This is expected - we'll skip these silently
          }
        }

        // Invalidate unit list
        await utils.unit.list.invalidate();
      } catch (error) {
        console.error("Failed to create unit:", error);
        // If it's a duplicate conflict, mark as rejected with feedback
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("duplicate") || errMsg.includes("CONFLICT") || errMsg.includes("identical content")) {
          setProposalStates((prev) =>
            prev.map((p, i) => (i === index ? { ...p, status: "rejected" } : p))
          );
        }
      }
    },
    [proposalStates, createUnitMutation, createRelationMutation, projectId, relationProposals, utils]
  );

  // Handle rejecting a single proposal
  const handleReject = React.useCallback((index: number) => {
    setProposalStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, status: "rejected" } : p))
    );
  }, []);

  // Accept all remaining pending proposals
  const handleAcceptAllRemaining = React.useCallback(async () => {
    const pendingIndices = proposalStates
      .map((p, i) => (p.status === "pending" ? i : -1))
      .filter((i) => i !== -1);

    for (const idx of pendingIndices) {
      await handleAccept(idx);
    }
  }, [proposalStates, handleAccept]);

  // Handle completion
  const handleDone = React.useCallback(() => {
    onComplete(acceptedCount, rejectedCount);
  }, [onComplete, acceptedCount, rejectedCount]);

  // Handle drag start for boundary adjustment
  const handleDragStart = React.useCallback((index: number) => {
    setDraggingIdx(index);
  }, []);

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (draggingIdx === null || !textContainerRef.current) return;

      const container = textContainerRef.current;
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;

      // Calculate character position from mouse position (approximate)
      const relativeX = clientX - rect.left;
      const charWidth = rect.width / originalText.length;
      const newCharPos = Math.round(relativeX / charWidth);
      const clampedPos = Math.max(0, Math.min(originalText.length, newCharPos));

      // Update the boundary
      setProposalStates((prev) => {
        const updated = [...prev];
        const current = updated[draggingIdx];
        if (!current) return prev;

        // Adjust the endChar of current proposal
        const newEndChar = Math.max(current.proposal.startChar + 5, clampedPos);
        updated[draggingIdx] = {
          ...current,
          proposal: { ...current.proposal, endChar: newEndChar, content: originalText.slice(current.proposal.startChar, newEndChar) },
        };

        // Adjust the startChar of next proposal if it exists
        if (draggingIdx < updated.length - 1) {
          const next = updated[draggingIdx + 1];
          if (next) {
            updated[draggingIdx + 1] = {
              ...next,
              proposal: { ...next.proposal, startChar: newEndChar, content: originalText.slice(newEndChar, next.proposal.endChar) },
            };
          }
        }

        return updated;
      });

      setDraggingIdx(null);
    },
    [draggingIdx, originalText]
  );

  // Get colors for unit type
  const getTypeColors = (type: string) => {
    return UNIT_TYPE_COLORS[type as UnitType] ?? { bg: "#F5F5F7", accent: "#6E6E73" };
  };

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

      {/* Original text with boundary overlays */}
      <div
        ref={textContainerRef}
        className="relative rounded-lg border border-border-primary bg-bg-secondary p-4"
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
      >
        <div className="text-sm leading-relaxed text-text-primary">
          {proposalStates.map((state, idx) => {
            const colors = getTypeColors(state.proposal.proposedType);
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
                >
                  {state.proposal.content}
                </motion.span>
                {/* Draggable boundary handle */}
                {idx < proposalStates.length - 1 && (
                  <span
                    className={cn(
                      "relative mx-1 inline-flex cursor-col-resize items-center opacity-50 hover:opacity-100",
                      draggingIdx === idx && "opacity-100"
                    )}
                    onMouseDown={() => handleDragStart(idx)}
                    onTouchStart={() => handleDragStart(idx)}
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
            const colors = getTypeColors(state.proposal.proposedType);
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
                  {/* Type badge and content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium capitalize"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.accent,
                        }}
                      >
                        {state.proposal.proposedType.replace(/_/g, " ")}
                      </span>
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
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                      {state.proposal.content}
                    </p>
                    {/* Show relation count if any */}
                    {relationProposals.filter((r) => r.sourceIdx === idx).length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-text-tertiary">
                        <ChevronRight className="h-3 w-3" />
                        {relationProposals.filter((r) => r.sourceIdx === idx).length} relation
                        {relationProposals.filter((r) => r.sourceIdx === idx).length > 1 ? "s" : ""}{" "}
                        proposed
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAccept(idx)}
                        disabled={createUnitMutation.isPending}
                        className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(idx)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-100 hover:text-red-600"
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAcceptAllRemaining}
              disabled={createUnitMutation.isPending}
            >
              Accept All ({pendingCount})
            </Button>
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
