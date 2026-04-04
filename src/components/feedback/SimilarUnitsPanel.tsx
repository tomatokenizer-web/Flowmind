"use client";

import * as React from "react";
import { Copy, Check, X, ChevronDown, ChevronRight, GitMerge } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";

interface SimilarUnitsPanelProps {
  projectId: string;
  collapsed?: boolean;
}

export function SimilarUnitsPanel({ projectId, collapsed = false }: SimilarUnitsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const utils = api.useUtils();

  const { data, isLoading } = api.feedback.detectSimilarUnits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const compressClaims = api.feedback.compressClaims.useMutation({
    onSuccess: () => {
      void utils.feedback.detectSimilarUnits.invalidate({ projectId });
      toast.success("Units merged", { description: "Similar units compressed into one." });
    },
    onError: () => {
      toast.error("Merge failed");
    },
  });

  const activePairs = (data?.pairs ?? []).filter(
    (p) => !dismissed.has(`${p.unitA.id}:${p.unitB.id}`),
  );

  const count = activePairs.length;

  function dismiss(unitAId: string, unitBId: string) {
    setDismissed((prev) => new Set([...prev, `${unitAId}:${unitBId}`]));
  }

  if (collapsed) {
    if (count === 0) return null;
    return (
      <div className="border-t border-border flex items-center justify-center py-2">
        <div className="relative" title={`${count} similar unit pair${count !== 1 ? "s" : ""}`}>
          <Copy className="h-5 w-5 text-accent-primary" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-medium text-white">
            {count > 9 ? "9+" : count}
          </span>
        </div>
      </div>
    );
  }

  if (count === 0 && !isLoading) return null;

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-accent-primary hover:bg-bg-hover transition-colors"
      >
        <Copy className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left font-medium">
          {isLoading ? "Checking duplicates…" : `${count} similar pair${count !== 1 ? "s" : ""}`}
        </span>
        {count > 0 && (
          open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>

      {open && count > 0 && (
        <ul className="px-3 pb-3 space-y-2">
          {activePairs.map((pair) => (
            <li key={`${pair.unitA.id}:${pair.unitB.id}`} className="rounded-lg border border-border bg-bg-elevated p-2 text-xs">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 font-medium text-accent-primary">
                  {Math.round(pair.similarity * 100)}% similar
                </span>
              </div>
              <p className="mb-1 line-clamp-2 text-text-secondary">{pair.unitA.content}</p>
              <p className="mb-2 line-clamp-2 text-text-tertiary">{pair.unitB.content}</p>
              <div className="flex gap-1">
                <SimilarActionButton
                  label="Merge"
                  icon={<GitMerge className="h-3 w-3" />}
                  disabled={compressClaims.isPending}
                  onClick={() => {
                    const coreContent = pair.unitA.content.length <= pair.unitB.content.length
                      ? pair.unitA.content
                      : pair.unitB.content;
                    compressClaims.mutate({
                      unitIds: [pair.unitA.id, pair.unitB.id],
                      coreContent,
                      projectId,
                    });
                  }}
                />
                <SimilarActionButton
                  label="Keep Both"
                  icon={<Check className="h-3 w-3" />}
                  disabled={compressClaims.isPending}
                  onClick={() => dismiss(pair.unitA.id, pair.unitB.id)}
                />
                <SimilarActionButton
                  label="Dismiss"
                  icon={<X className="h-3 w-3" />}
                  disabled={false}
                  onClick={() => dismiss(pair.unitA.id, pair.unitB.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimilarActionButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}
