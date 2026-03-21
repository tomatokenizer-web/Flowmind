"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Loader2, Minus, Plus, Equal } from "lucide-react";

interface AssemblyDiffViewProps {
  assemblyAId: string;
  assemblyBId: string;
  assemblyAName?: string;
  assemblyBName?: string;
}

// ─── DiffCard ────────────────────────────────────────────────────────────────

function DiffCard({
  unitId,
  content,
  unitType,
  status,
}: {
  unitId: string;
  content: string;
  unitType: string;
  status: "added" | "removed" | "shared";
}) {
  const config = {
    added: {
      border: "border-accent-success/40",
      bg: "bg-accent-success/5",
      icon: <Plus className="h-3.5 w-3.5 text-accent-success shrink-0" />,
      label: "Added",
      labelColor: "text-accent-success",
    },
    removed: {
      border: "border-accent-danger/40",
      bg: "bg-accent-danger/5",
      icon: <Minus className="h-3.5 w-3.5 text-accent-danger shrink-0" />,
      label: "Removed",
      labelColor: "text-accent-danger",
    },
    shared: {
      border: "border-border",
      bg: "bg-bg-primary",
      icon: <Equal className="h-3.5 w-3.5 text-text-tertiary shrink-0" />,
      label: "Shared",
      labelColor: "text-text-tertiary",
    },
  } as const;

  const c = config[status];

  return (
    <div
      key={unitId}
      className={cn(
        "rounded-xl border p-3",
        c.border,
        c.bg,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {c.icon}
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", c.labelColor)}>
          {c.label}
        </span>
        <span className="ml-auto text-[10px] capitalize text-text-tertiary">{unitType}</span>
      </div>
      <p className="line-clamp-3 text-sm text-text-primary">{content}</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AssemblyDiffView({
  assemblyAId,
  assemblyBId,
  assemblyAName = "Assembly A",
  assemblyBName = "Assembly B",
}: AssemblyDiffViewProps) {
  const { data: diff, isLoading: diffLoading, error } = api.assembly.diff.useQuery(
    { assemblyAId, assemblyBId },
    { enabled: !!assemblyAId && !!assemblyBId },
  );

  // Fetch both assemblies so we can look up unit content by ID
  const { data: assemblyA, isLoading: loadingA } = api.assembly.getById.useQuery(
    { id: assemblyAId },
    { enabled: !!assemblyAId },
  );
  const { data: assemblyB, isLoading: loadingB } = api.assembly.getById.useQuery(
    { id: assemblyBId },
    { enabled: !!assemblyBId },
  );

  const isLoading = diffLoading || loadingA || loadingB;

  // Build a map from unitId → {content, unitType} across both assemblies
  const unitMap = React.useMemo(() => {
    const map = new Map<string, { content: string; unitType: string }>();
    for (const assembly of [assemblyA, assemblyB]) {
      if (!assembly) continue;
      for (const item of assembly.items) {
        if (item.unit) {
          map.set(item.unit.id, {
            content: item.unit.content as string,
            unitType: item.unit.unitType as string,
          });
        }
      }
    }
    return map;
  }, [assemblyA, assemblyB]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Comparing assemblies…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/5 p-4 text-sm text-accent-danger">
        Failed to compare assemblies: {error.message}
      </div>
    );
  }

  if (!diff) return null;

  // unitIds from the diff may be string | null (Prisma AssemblyItem.unitId); filter nulls
  const onlyInA = diff.onlyInA.filter((id): id is string => id !== null);
  const onlyInB = diff.onlyInB.filter((id): id is string => id !== null);
  const shared = diff.shared.filter((id): id is string => id !== null);
  const { summary } = diff;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-primary px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Plus className="h-4 w-4 text-accent-success" />
          <span className="font-medium text-accent-success">{summary.added}</span>
          <span className="text-text-tertiary">added in {assemblyBName}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Minus className="h-4 w-4 text-accent-danger" />
          <span className="font-medium text-accent-danger">{summary.removed}</span>
          <span className="text-text-tertiary">only in {assemblyAName}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Equal className="h-4 w-4 text-text-tertiary" />
          <span className="font-medium text-text-primary">{summary.shared}</span>
          <span className="text-text-tertiary">shared</span>
        </div>
      </div>

      {/* Side-by-side column headers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary truncate">
          {assemblyAName}
        </div>
        <div className="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary truncate">
          {assemblyBName}
        </div>
      </div>

      {/* Diff grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: removed (only in A) + shared */}
        <div className="space-y-2">
          {onlyInA.map((unitId) => {
            const u = unitMap.get(unitId);
            if (!u) return null;
            return (
              <DiffCard
                key={unitId}
                unitId={unitId}
                content={u.content}
                unitType={u.unitType}
                status="removed"
              />
            );
          })}
          {shared.map((unitId) => {
            const u = unitMap.get(unitId);
            if (!u) return null;
            return (
              <DiffCard
                key={unitId}
                unitId={unitId}
                content={u.content}
                unitType={u.unitType}
                status="shared"
              />
            );
          })}
          {onlyInA.length === 0 && shared.length === 0 && (
            <p className="py-4 text-center text-xs text-text-tertiary">No units</p>
          )}
        </div>

        {/* Right column: added (only in B) + shared */}
        <div className="space-y-2">
          {onlyInB.map((unitId) => {
            const u = unitMap.get(unitId);
            if (!u) return null;
            return (
              <DiffCard
                key={unitId}
                unitId={unitId}
                content={u.content}
                unitType={u.unitType}
                status="added"
              />
            );
          })}
          {shared.map((unitId) => {
            const u = unitMap.get(unitId);
            if (!u) return null;
            return (
              <DiffCard
                key={unitId}
                unitId={unitId}
                content={u.content}
                unitType={u.unitType}
                status="shared"
              />
            );
          })}
          {onlyInB.length === 0 && shared.length === 0 && (
            <p className="py-4 text-center text-xs text-text-tertiary">No units</p>
          )}
        </div>
      </div>
    </div>
  );
}
