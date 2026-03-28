"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  Minus,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { FormField } from "~/components/ui/form-field";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── Stance options ─── */

const STANCE_OPTIONS: {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: "support",
    label: "Support",
    icon: Shield,
    color: "var(--accent-success)",
  },
  {
    value: "oppose",
    label: "Oppose",
    icon: Swords,
    color: "var(--accent-error)",
  },
  {
    value: "neutral",
    label: "Neutral",
    icon: Minus,
    color: "var(--text-tertiary)",
  },
  {
    value: "exploring",
    label: "Exploring",
    icon: Sparkles,
    color: "var(--accent-primary)",
  },
];

/* ─── Types ─── */

interface PerspectiveEditorProps {
  /** The context this perspective applies to */
  contextId: string;
  /** The unit this perspective is for */
  unitId: string;
  /** The unit's original from_type */
  unitFromType?: string;
  className?: string;
}

/* ─── Component ─── */

export function PerspectiveEditor({
  contextId,
  unitId,
  unitFromType,
  className,
}: PerspectiveEditorProps) {
  const utils = api.useUtils();

  const perspectiveQuery = api.perspective.getByContext.useQuery(
    { contextId, unitId },
    { enabled: !!contextId && !!unitId },
  );

  const upsertMutation = api.perspective.upsert.useMutation({
    onSuccess: () => {
      void utils.perspective.getByContext.invalidate({ contextId, unitId });
    },
  });

  const perspective = perspectiveQuery.data;

  /* ─── Local state ─── */

  const [typeOverride, setTypeOverride] = React.useState("");
  const [stance, setStance] = React.useState<"support" | "oppose" | "neutral" | "exploring">("neutral");
  const [importance, setImportance] = React.useState(0.5);
  const [note, setNote] = React.useState("");
  const [isDirty, setIsDirty] = React.useState(false);

  /* ─── Sync from query ─── */

  React.useEffect(() => {
    if (perspective) {
      setTypeOverride(perspective.type ?? "");
      setStance((perspective.stance as "support" | "oppose" | "neutral" | "exploring") ?? "neutral");
      setImportance(perspective.importance ?? 0.5);
      setNote(perspective.note ?? "");
      setIsDirty(false);
    }
  }, [perspective]);

  /* ─── Dirty tracking ─── */

  function markDirty() {
    setIsDirty(true);
  }

  /* ─── Save ─── */

  function handleSave() {
    upsertMutation.mutate({
      contextId,
      unitId,
      type: typeOverride || undefined,
      stance,
      importance,
      note: note || undefined,
    });
    setIsDirty(false);
  }

  /* ─── Type mismatch indicator ─── */

  const hasTypeOverride =
    typeOverride && unitFromType && typeOverride !== unitFromType;

  /* ─── Loading ─── */

  if (perspectiveQuery.isLoading) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        <Skeleton height="24px" width="40%" />
        <Skeleton height="32px" />
        <Skeleton height="32px" />
        <Skeleton height="64px" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Perspective in this context
        </h3>
        {isDirty && (
          <Button
            variant="primary"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleSave}
            disabled={upsertMutation.isPending}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {upsertMutation.isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      {/* Type override */}
      <FormField
        htmlFor="perspective-type"
        label="Type override"
        description="Optionally reinterpret this unit's type within this context"
      >
        <div className="relative">
          <input
            id="perspective-type"
            value={typeOverride}
            onChange={(e) => {
              setTypeOverride(e.target.value);
              markDirty();
            }}
            placeholder={unitFromType ?? "Same as original type"}
            className={cn(
              "w-full rounded-lg border bg-bg-surface px-3 py-2 pr-8",
              "text-sm text-text-primary placeholder:text-text-tertiary outline-none",
              "transition-all duration-fast",
              hasTypeOverride
                ? "border-accent-warning focus:ring-1 focus:ring-accent-warning"
                : "border-border focus:border-accent-primary focus:ring-1 focus:ring-accent-primary",
            )}
          />
          {hasTypeOverride && (
            <SimpleTooltip content={`Differs from original type: ${unitFromType}`}>
              <AlertCircle
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-warning"
                aria-label="Type override differs from original"
              />
            </SimpleTooltip>
          )}
        </div>
      </FormField>

      {/* Stance selector */}
      <div>
        <p className="text-xs font-medium text-text-primary mb-2">Stance</p>
        <div className="flex gap-1.5">
          {STANCE_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const isSelected = stance === value;
            return (
              <SimpleTooltip key={value} content={label}>
                <button
                  onClick={() => {
                    setStance(value as "support" | "oppose" | "neutral" | "exploring");
                    markDirty();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2",
                    "border text-xs font-medium",
                    "transition-all duration-fast",
                    isSelected
                      ? "border-current"
                      : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover",
                  )}
                  style={isSelected ? { color, borderColor: color, backgroundColor: `${color}14` } : undefined}
                  aria-label={label}
                  aria-pressed={isSelected}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>

      {/* Importance slider */}
      <FormField
        htmlFor="perspective-importance"
        label="Importance"
        description={`${(importance * 100).toFixed(0)}% -- how central is this unit in this context?`}
      >
        <input
          id="perspective-importance"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={importance}
          onChange={(e) => {
            setImportance(parseFloat(e.target.value));
            markDirty();
          }}
          className={cn(
            "w-full h-1.5 rounded-full appearance-none bg-bg-secondary",
            "accent-accent-primary cursor-pointer",
          )}
          aria-label="Importance"
        />
      </FormField>

      {/* Note field */}
      <FormField
        htmlFor="perspective-note"
        label="Note"
        description="Per-context memo for this unit"
      >
        <textarea
          id="perspective-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            markDirty();
          }}
          rows={3}
          placeholder="Add a note about this unit's role in this context..."
          className={cn(
            "w-full resize-y rounded-lg border border-border bg-bg-surface px-3 py-2",
            "text-sm text-text-primary placeholder:text-text-tertiary outline-none",
            "focus:border-accent-primary focus:ring-1 focus:ring-accent-primary",
            "transition-all duration-fast",
          )}
        />
      </FormField>
    </div>
  );
}
