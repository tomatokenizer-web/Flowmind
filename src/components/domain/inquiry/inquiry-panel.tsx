"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  Layers,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton, SkeletonText } from "~/components/shared/skeleton";

/* ─── Completeness Ring ─── */

interface CompletenessRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function CompletenessRing({
  percentage,
  size = 40,
  strokeWidth = 3,
}: CompletenessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${Math.round(percentage)}% complete`}
      role="img"
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--bg-secondary)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-slow"
      />
      {/* Percentage text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[9px] font-medium fill-text-secondary"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

/* ─── Types ─── */

interface InquiryPanelProps {
  inquiryId: string;
  className?: string;
}

/* ─── Component ─── */

export function InquiryPanel({ inquiryId, className }: InquiryPanelProps) {
  const utils = api.useUtils();
  const setActiveContext = useWorkspaceStore((s) => s.setActiveContext);

  const inquiryQuery = api.inquiry.getById.useQuery({ id: inquiryId });
  const compassQuery = api.compass.getByInquiry.useQuery(
    { inquiryId },
    { enabled: !!inquiryId },
  );
  const updateMutation = api.inquiry.update.useMutation({
    onSuccess: () => {
      void utils.inquiry.getById.invalidate({ id: inquiryId });
      void utils.inquiry.list.invalidate();
    },
  });
  const pivotMutation = api.inquiry.pivot.useMutation({
    onSuccess: () => {
      void utils.inquiry.getById.invalidate({ id: inquiryId });
    },
  });

  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [editingQuestion, setEditingQuestion] = React.useState(false);
  const [questionDraft, setQuestionDraft] = React.useState("");

  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const questionRef = React.useRef<HTMLTextAreaElement>(null);

  const inquiry = inquiryQuery.data;
  const compass = compassQuery.data;

  React.useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  React.useEffect(() => {
    if (editingQuestion) questionRef.current?.focus();
  }, [editingQuestion]);

  /* ─── Name editing ─── */

  function startEditingName() {
    if (!inquiry) return;
    setNameDraft(inquiry.title);
    setEditingName(true);
  }

  function saveName() {
    if (!inquiry) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== inquiry.title) {
      updateMutation.mutate({ id: inquiryId, title: trimmed });
    }
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    }
    if (e.key === "Escape") setEditingName(false);
  }

  /* ─── Question editing ─── */

  function startEditingQuestion() {
    if (!inquiry) return;
    setQuestionDraft(inquiry.startingQuestions?.[0] ?? "");
    setEditingQuestion(true);
  }

  function saveQuestion() {
    if (!inquiry) return;
    const trimmed = questionDraft.trim();
    if (trimmed !== (inquiry.startingQuestions?.[0] ?? "")) {
      updateMutation.mutate({ id: inquiryId, title: trimmed || inquiry.title });
    }
    setEditingQuestion(false);
  }

  function handleQuestionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setEditingQuestion(false);
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveQuestion();
    }
  }

  /* ─── Completeness percentage ─── */

  const completeness = React.useMemo(() => {
    if (!compass) return 0;
    return compass.completeness * 100;
  }, [compass]);

  /* ─── Loading ─── */

  if (inquiryQuery.isLoading) {
    return (
      <div className={cn("flex flex-col gap-4 p-4", className)}>
        <Skeleton height="24px" width="60%" />
        <SkeletonText lines={2} />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="56px" />
          ))}
        </div>
      </div>
    );
  }

  if (!inquiry) return null;

  return (
    <section
      className={cn("flex flex-col h-full", className)}
      aria-label={`Inquiry: ${inquiry.title}`}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleNameKeyDown}
                  className={cn(
                    "flex-1 bg-transparent text-lg font-semibold tracking-heading-tight text-text-primary",
                    "border-b-2 border-accent-primary outline-none px-0 py-0.5",
                  )}
                  aria-label="Inquiry name"
                  maxLength={120}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={saveName}
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4 text-accent-success" />
                </Button>
              </div>
            ) : (
              <button
                onClick={startEditingName}
                className={cn(
                  "flex items-center gap-2 group text-left",
                  "rounded-lg -ml-1 px-1 py-0.5",
                  "hover:bg-bg-hover transition-colors duration-fast",
                )}
                aria-label="Click to edit inquiry name"
              >
                <h2 className="text-lg font-semibold tracking-heading-tight text-text-primary truncate">
                  {inquiry.title}
                </h2>
                <Pencil
                  className="h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-fast shrink-0"
                  aria-hidden="true"
                />
              </button>
            )}

            {/* Question / purpose */}
            {editingQuestion ? (
              <div className="mt-2">
                <textarea
                  ref={questionRef}
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value)}
                  onBlur={saveQuestion}
                  onKeyDown={handleQuestionKeyDown}
                  rows={2}
                  className={cn(
                    "w-full resize-y rounded-lg border border-accent-primary bg-bg-surface px-3 py-2",
                    "text-sm text-text-primary placeholder:text-text-tertiary outline-none",
                  )}
                  placeholder="What question drives this inquiry?"
                  aria-label="Inquiry question"
                />
              </div>
            ) : (
              <button
                onClick={startEditingQuestion}
                className={cn(
                  "mt-1 text-left text-sm rounded-lg -ml-1 px-1 py-0.5 w-full",
                  "hover:bg-bg-hover transition-colors duration-fast",
                  inquiry.startingQuestions?.[0]
                    ? "text-text-secondary"
                    : "text-text-tertiary italic",
                )}
                aria-label="Click to edit inquiry question"
              >
                {inquiry.startingQuestions?.[0] || "What question drives this inquiry?"}
              </button>
            )}
          </div>

          {/* Completeness ring */}
          <CompletenessRing percentage={completeness} />
        </div>

        {/* Pivot action */}
        <div className="mt-3">
          <SimpleTooltip content="Pivot this inquiry to explore a new angle">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-text-secondary"
              onClick={() => pivotMutation.mutate({ inquiryId, fromGoal: inquiry.title, toGoal: inquiry.title, reason: "Manual pivot" })}
              disabled={pivotMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {pivotMutation.isPending ? "Pivoting..." : "Pivot"}
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Context cards */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">
            Contexts
          </h3>
          {inquiry.contexts?.length ? (
            inquiry.contexts.map(
              (ctx: { id: string; name: string; unitCount?: number }) => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-card border border-border bg-bg-surface p-3",
                    "hover:shadow-hover hover:border-accent-primary/30 transition-all duration-fast",
                    "text-left w-full group",
                  )}
                >
                  <Layers
                    className="h-5 w-5 text-text-tertiary group-hover:text-accent-primary transition-colors duration-fast shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-text-primary truncate">
                      {ctx.name}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {ctx.unitCount ?? 0} units
                    </span>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary transition-colors duration-fast shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ),
            )
          ) : (
            <p className="text-sm text-text-tertiary italic py-4 text-center">
              No contexts yet. Create one to start exploring.
            </p>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
