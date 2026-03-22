"use client";

import * as React from "react";
import { Unlink, ChevronDown, ChevronRight, Archive, Trash2, Sparkles } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";
import { formatDistanceToNow } from "date-fns";

interface OrphanRecoveryPanelProps {
  projectId: string;
  collapsed?: boolean;
}

export function OrphanRecoveryPanel({ projectId, collapsed = false }: OrphanRecoveryPanelProps) {
  const [open, setOpen] = React.useState(false);
  const utils = api.useUtils();

  const { data: orphans = [], isLoading } = api.feedback.getOrphanUnits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const recoverOrphan = api.feedback.recoverOrphan.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getOrphanUnits.invalidate({ projectId });
      void utils.incubation.list.invalidate();
      const labels: Record<string, string> = {
        archive: "Archived",
        delete: "Deleted",
        incubate: "Sent to incubation",
        context: "Moved to context",
      };
      toast.success(labels[result.action] ?? "Done", { description: "Orphan unit handled." });
    },
    onError: () => {
      toast.error("Action failed");
    },
  });

  const count = orphans.length;

  if (collapsed) {
    if (count === 0) return null;
    return (
      <div className="border-t border-border flex items-center justify-center py-2">
        <div className="relative" title={`${count} orphan unit${count !== 1 ? "s" : ""}`}>
          <Unlink className="h-5 w-5 text-text-tertiary" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-warning text-[10px] font-medium text-white">
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
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <Unlink className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left font-medium">
          {isLoading ? "Scanning orphans…" : `${count} orphan unit${count !== 1 ? "s" : ""}`}
        </span>
        {count > 0 && (
          open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>

      {open && count > 0 && (
        <ul className="px-3 pb-3 space-y-2">
          {orphans.map((unit) => {
            const createdAt = typeof unit.createdAt === "string" ? new Date(unit.createdAt) : unit.createdAt;
            return (
              <li key={unit.id} className="rounded-lg border border-border bg-bg-elevated p-2 text-xs">
                <p className="mb-1 line-clamp-2 text-text-secondary">{unit.content}</p>
                <div className="mb-2 flex items-center gap-2 text-text-tertiary">
                  <span className="capitalize">{unit.unitType}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
                  {unit.isolationScore >= 1 && (
                    <>
                      <span>·</span>
                      <span className="text-accent-warning">fully isolated</span>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  <OrphanActionButton
                    label="Incubate"
                    icon={<Sparkles className="h-3 w-3" />}
                    disabled={recoverOrphan.isPending}
                    onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "incubate" })}
                  />
                  <OrphanActionButton
                    label="Archive"
                    icon={<Archive className="h-3 w-3" />}
                    disabled={recoverOrphan.isPending}
                    onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "archive" })}
                  />
                  <OrphanActionButton
                    label="Delete"
                    icon={<Trash2 className="h-3 w-3" />}
                    disabled={recoverOrphan.isPending}
                    danger
                    onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "delete" })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OrphanActionButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary transition-colors disabled:opacity-40",
        danger
          ? "hover:border-accent-danger hover:text-accent-danger"
          : "hover:border-accent-primary hover:text-accent-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
