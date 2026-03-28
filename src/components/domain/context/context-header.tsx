"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Eye,
  Pencil,
  Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── Types ─── */

interface ContextHeaderProps {
  contextId: string;
  className?: string;
}

/* ─── Component ─── */

export function ContextHeader({ contextId, className }: ContextHeaderProps) {
  const utils = api.useUtils();
  const contextQuery = api.context.getById.useQuery({ id: contextId });
  const updateMutation = api.context.update.useMutation({
    onSuccess: () => {
      void utils.context.getById.invalidate({ id: contextId });
      void utils.context.list.invalidate();
    },
  });
  const muteMutation = api.context.mute.useMutation({
    onSuccess: () => {
      void utils.context.getById.invalidate({ id: contextId });
    },
  });

  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState("");
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [descriptionDraft, setDescriptionDraft] = React.useState("");
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);

  const context = contextQuery.data;

  /* Focus inputs on edit mode */
  React.useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  React.useEffect(() => {
    if (editingDescription) descriptionRef.current?.focus();
  }, [editingDescription]);

  /* ─── Title editing ─── */

  function startEditingTitle() {
    if (!context) return;
    setTitleDraft(context.name);
    setEditingTitle(true);
  }

  function saveTitle() {
    if (!context) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== context.name) {
      updateMutation.mutate({ id: contextId, name: trimmed });
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    }
    if (e.key === "Escape") {
      setEditingTitle(false);
    }
  }

  /* ─── Description editing ─── */

  function startEditingDescription() {
    if (!context) return;
    setDescriptionDraft(context.description ?? "");
    setEditingDescription(true);
  }

  function saveDescription() {
    if (!context) return;
    const trimmed = descriptionDraft.trim();
    if (trimmed !== (context.description ?? "")) {
      updateMutation.mutate({ id: contextId, description: trimmed || undefined });
    }
    setEditingDescription(false);
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditingDescription(false);
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveDescription();
    }
  }

  /* ─── Mute toggle ─── */

  function toggleMute() {
    if (!context) return;
    muteMutation.mutate({ contextId, unitId: contextId });
  }

  /* ─── Loading state ─── */

  if (contextQuery.isLoading) {
    return (
      <div className={cn("flex flex-col gap-2 px-1", className)}>
        <Skeleton height="28px" width="60%" />
        <Skeleton height="16px" width="40%" />
      </div>
    );
  }

  if (!context) return null;

  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {/* Inquiry breadcrumb */}
      {context.inquiryId && (
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <span className="font-medium text-text-secondary">Inquiry</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span
            className="truncate max-w-[200px] text-accent-primary cursor-pointer hover:underline"
          >
            Untitled inquiry
          </span>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center gap-2 group">
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              className={cn(
                "flex-1 bg-transparent text-xl font-semibold tracking-heading-tight text-text-primary",
                "border-b-2 border-accent-primary outline-none",
                "px-0 py-0.5",
              )}
              aria-label="Context name"
              maxLength={120}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={saveTitle}
              aria-label="Save title"
            >
              <Check className="h-4 w-4 text-accent-success" />
            </Button>
          </div>
        ) : (
          <button
            onClick={startEditingTitle}
            className={cn(
              "flex items-center gap-2 flex-1 text-left group/title",
              "rounded-lg -ml-1 px-1 py-0.5",
              "hover:bg-bg-hover transition-colors duration-fast",
            )}
            aria-label="Click to edit context name"
          >
            <h1 className="text-xl font-semibold tracking-heading-tight text-text-primary truncate">
              {context.name}
            </h1>
            <Pencil
              className="h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover/title:opacity-100 transition-opacity duration-fast shrink-0"
              aria-hidden="true"
            />
          </button>
        )}

        {/* Mute toggle */}
        <SimpleTooltip content="Mute context">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleMute}
            aria-label="Mute context"
          >
            <Eye className="h-4 w-4 text-text-secondary" />
          </Button>
        </SimpleTooltip>
      </div>

      {/* Description */}
      {editingDescription ? (
        <div className="flex flex-col gap-1">
          <textarea
            ref={descriptionRef}
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={handleDescriptionKeyDown}
            rows={3}
            className={cn(
              "w-full resize-y rounded-lg border border-accent-primary bg-bg-surface px-3 py-2",
              "text-sm text-text-primary placeholder:text-text-tertiary",
              "outline-none",
              "transition-colors duration-fast",
            )}
            placeholder="Add a description for this context..."
            aria-label="Context description"
          />
          <p className="text-xs text-text-tertiary">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        </div>
      ) : (
        <button
          onClick={startEditingDescription}
          className={cn(
            "text-left text-sm rounded-lg -ml-1 px-1 py-0.5",
            "hover:bg-bg-hover transition-colors duration-fast",
            context.description ? "text-text-secondary" : "text-text-tertiary italic",
          )}
          aria-label="Click to edit description"
        >
          {context.description || "Add a description..."}
        </button>
      )}

      {/* AI-generated summary (collapsible) */}
      {context.snapshot && (
        <div className="mt-1">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className={cn(
              "flex items-center gap-1.5 text-xs text-text-tertiary",
              "hover:text-text-secondary transition-colors duration-fast",
            )}
            aria-expanded={summaryOpen}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>AI Summary</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-fast",
                summaryOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence>
            {summaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-xs text-text-secondary leading-relaxed bg-bg-surface rounded-lg px-3 py-2 border border-border">
                  {context.snapshot}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </header>
  );
}
