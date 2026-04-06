"use client";

import * as React from "react";
import { ArrowUpCircle, ChevronDown, Layers } from "lucide-react";
import { cn } from "~/lib/utils";

// ─── LoadingCards ────────────────────────────────────────────────────

export function LoadingCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-secondary" />
      ))}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ElementType;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-text-tertiary" />
      <p className="text-sm text-text-tertiary">{message}</p>
    </div>
  );
}

// ─── ContextPicker ───────────────────────────────────────────────────

interface ContextPickerProps {
  contexts: Array<{ id: string; name: string }>;
  onSelect: (id: string) => void;
  disabled: boolean;
}

export function ContextPicker({ contexts, onSelect, disabled }: ContextPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors disabled:opacity-40"
      >
        <ArrowUpCircle className="h-3.5 w-3.5" />
        Promote
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-lg border border-border bg-bg-surface p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
            Select Context
          </p>
          <div className="max-h-48 overflow-y-auto">
            {contexts.length === 0 ? (
              <p className="px-2 py-3 text-xs text-text-tertiary text-center">No contexts</p>
            ) : (
              contexts.map((ctx) => (
                <button
                  key={ctx.id}
                  type="button"
                  onClick={() => { onSelect(ctx.id); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                  <Layers className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{ctx.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ActionButton ────────────────────────────────────────────────────

interface ActionButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export function ActionButton({ icon, label, onClick, disabled, danger }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
        danger
          ? "border-border text-text-secondary hover:border-accent-danger hover:text-accent-danger"
          : "border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
