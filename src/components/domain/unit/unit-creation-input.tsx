"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Plus, SendHorizonal } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { AIProcessingIndicator } from "~/components/shared/loading-spinner";
import { usePipelineStore } from "@/stores/pipeline-store";
import {
  UNIT_TYPE_CONFIG,
  getUnitTypeConfig,
  type UnitType,
} from "./unit-type-badge";
import { UnitTypeBadge } from "./unit-type-badge";

/* ─── Types ─── */

interface RelatedUnit {
  id: string;
  content: string;
  primaryType: string;
  similarity: number;
}

interface UnitCreationInputProps {
  /** Called when the user submits a new unit */
  onSubmit?: (data: { content: string; primaryType: string }) => void;
  /** Related units to suggest connecting after creation */
  relatedUnits?: RelatedUnit[];
  /** Called when user taps connect on a related unit */
  onConnect?: (sourceId: string, targetId: string) => void;
  /** ID of the most recently created unit (for quick-connect) */
  lastCreatedUnitId?: string | null;
  /** Whether to show the pipeline processing indicator */
  showPipelineIndicator?: boolean;
  /** Placeholder text */
  placeholder?: string;
  className?: string;
}

/* ─── Quick Connect Panel ─── */

function QuickConnectPanel({
  relatedUnits,
  lastCreatedUnitId,
  onConnect,
  onDismiss,
}: {
  relatedUnits: RelatedUnit[];
  lastCreatedUnitId: string;
  onConnect?: (sourceId: string, targetId: string) => void;
  onDismiss: () => void;
}) {
  if (relatedUnits.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "rounded-lg border border-border/50 bg-bg-surface p-2.5 space-y-2",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Related units
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] text-text-tertiary hover:text-text-primary transition-colors duration-fast"
          >
            Dismiss
          </button>
        </div>
        <div className="space-y-1">
          {relatedUnits.slice(0, 3).map((related) => (
            <div
              key={related.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5",
                "hover:bg-bg-hover transition-colors duration-fast",
              )}
            >
              <UnitTypeBadge type={related.primaryType} size="sm" />
              <span className="flex-1 text-xs text-text-secondary line-clamp-1">
                {related.content}
              </span>
              <span className="text-[10px] text-text-tertiary shrink-0">
                {Math.round(related.similarity * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => onConnect?.(lastCreatedUnitId, related.id)}
                aria-label={`Connect to: ${related.content.slice(0, 30)}`}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── UnitCreationInput Component ─── */

export function UnitCreationInput({
  onSubmit,
  relatedUnits = [],
  onConnect,
  lastCreatedUnitId = null,
  showPipelineIndicator = true,
  placeholder = "Capture a thought...",
  className,
}: UnitCreationInputProps) {
  const [content, setContent] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [showQuickConnect, setShowQuickConnect] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { isProcessing } = usePipelineStore();

  /* Auto-resize textarea */
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  /* Show quick-connect when we have a newly created unit and related suggestions */
  React.useEffect(() => {
    if (lastCreatedUnitId && relatedUnits.length > 0) {
      setShowQuickConnect(true);
    }
  }, [lastCreatedUnitId, relatedUnits]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    onSubmit?.({
      content: trimmed,
      primaryType: selectedType ?? "claim",
    });

    setContent("");
    setSelectedType(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const typeConfig = selectedType ? getUnitTypeConfig(selectedType) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-card border border-border",
          "bg-bg-primary p-2",
          "transition-colors duration-fast",
          "focus-within:border-border-focus focus-within:shadow-active",
        )}
      >
        {/* Type pre-selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                "transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                selectedType
                  ? cn(typeConfig?.bgClass, typeConfig?.accentClass)
                  : "bg-bg-secondary text-text-tertiary hover:bg-bg-hover hover:text-text-secondary",
              )}
              aria-label="Select unit type"
            >
              {selectedType && typeConfig ? (
                <typeConfig.icon className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {/* Auto-detect option */}
            <DropdownMenuItem
              onSelect={() => setSelectedType(null)}
              className={cn(!selectedType && "bg-bg-hover")}
            >
              <Plus className="mr-2 h-4 w-4 text-text-tertiary" />
              Auto-detect
            </DropdownMenuItem>
            {Object.entries(UNIT_TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setSelectedType(key)}
                  className={cn(selectedType === key && "bg-bg-hover")}
                >
                  <Icon className={cn("mr-2 h-4 w-4", config.accentClass)} />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "outline-none",
            "min-h-[32px] max-h-[160px] py-1.5",
          )}
          aria-label="New thought unit content"
        />

        {/* Submit button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0",
            content.trim()
              ? "text-accent-primary hover:text-accent-primary"
              : "text-text-tertiary",
          )}
          onClick={handleSubmit}
          disabled={!content.trim()}
          aria-label="Submit thought unit"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>

      {/* Pipeline processing indicator */}
      {showPipelineIndicator && isProcessing && (
        <AIProcessingIndicator label="AI processing your thought" />
      )}

      {/* Quick connect panel */}
      <AnimatePresence>
        {showQuickConnect && lastCreatedUnitId && (
          <QuickConnectPanel
            relatedUnits={relatedUnits}
            lastCreatedUnitId={lastCreatedUnitId}
            onConnect={onConnect}
            onDismiss={() => setShowQuickConnect(false)}
          />
        )}
      </AnimatePresence>

      {/* Hint */}
      {!content && !isProcessing && !showQuickConnect && (
        <p className="text-[10px] text-text-tertiary px-1">
          Press Enter to submit. Shift+Enter for newline.
        </p>
      )}
    </div>
  );
}

UnitCreationInput.displayName = "UnitCreationInput";
