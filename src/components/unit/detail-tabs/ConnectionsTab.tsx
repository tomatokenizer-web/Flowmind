"use client";

import * as React from "react";
import {
  Link2,
  FolderOpen,
  Compass,
  Package,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  X as XIcon,
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { usePanelStore } from "~/stores/panel-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import { RELATION_TYPE_COLORS } from "~/components/graph/graph-constants";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/shared/empty-state";
import { toast } from "~/lib/toast";

// ─── Types ──────────────────────────────────────────────────────────

interface ConnectionsTabProps {
  unitId: string;
  projectId: string;
  contextId?: string;
  unitContent?: string;
}

// ─── Collapsible Section ────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
        aria-expanded={open}
      >
        <Chevron className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="text-xs font-medium text-text-primary flex-1">{title}</span>
        <span className="text-[10px] tabular-nums text-text-tertiary">{count}</span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-1">
          {count === 0 ? (
            <p className="text-xs text-text-tertiary py-1">None</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

// ─── Strength bar ───────────────────────────────────────────────────

function StrengthBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-12 rounded-full bg-bg-secondary overflow-hidden shrink-0">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Contexts Section ───────────────────────────────────────────────

function ContextsSection({ unitId }: { unitId: string }) {
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);

  const { data: contexts = [], isLoading } = api.unit.getContextsForUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Contexts"
      icon={FolderOpen}
      count={contexts.length}
      defaultOpen={contexts.length > 0}
    >
      {contexts.map((ctx) => {
        const isCurrent = ctx.id === activeContextId;
        return (
          <button
            key={ctx.id}
            type="button"
            onClick={() => setActiveContext(ctx.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors",
              isCurrent && "border-l-2 border-accent-primary pl-1.5",
            )}
          >
            <FolderOpen className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className={cn("flex-1 text-xs truncate", isCurrent ? "text-accent-primary font-medium" : "text-text-primary")}>
              {ctx.name}
            </span>
            <span className="text-[10px] tabular-nums text-text-tertiary">
              {ctx.unitCount} units
            </span>
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Navigators Section ─────────────────────────────────────────────

const PURPOSE_BADGE_COLORS: Record<string, string> = {
  argument: "#3B82F6",
  derivation: "#8B5CF6",
  evidence: "#F59E0B",
  exploration: "#10B981",
  "ai-generated": "#06B6D4",
};

function NavigatorsSection({ unitId }: { unitId: string }) {
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  const { data: navigators = [], isLoading } = api.navigator.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Navigators"
      icon={Compass}
      count={navigators.length}
      defaultOpen={navigators.length > 0}
    >
      {navigators.map((nav) => {
        const stepIndex = nav.path.indexOf(unitId);
        const stepLabel = stepIndex >= 0 ? `Step ${stepIndex + 1} of ${nav.path.length}` : "";
        const purposeColor = PURPOSE_BADGE_COLORS[nav.purpose ?? ""] ?? "#6B7280";

        return (
          <button
            key={nav.id}
            type="button"
            onClick={() => setViewMode("navigate")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors"
          >
            <Compass className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-text-primary truncate block">{nav.name}</span>
              <span className="text-[10px] text-text-tertiary">{stepLabel}</span>
            </div>
            {nav.purpose && (
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                style={{
                  backgroundColor: `${purposeColor}20`,
                  color: purposeColor,
                }}
              >
                {nav.purpose}
              </span>
            )}
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Assemblies Section ─────────────────────────────────────────────

function AssembliesSection({ unitId }: { unitId: string }) {
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  const { data: assemblies = [], isLoading } = api.assembly.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Assemblies"
      icon={Package}
      count={assemblies.length}
      defaultOpen={assemblies.length > 0}
    >
      {assemblies.map((asm) => {
        const position = asm.items[0]?.position;
        return (
          <button
            key={asm.id}
            type="button"
            onClick={() => setViewMode("assembly")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors"
          >
            <Package className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className="flex-1 text-xs text-text-primary truncate">{asm.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {asm.templateType && (
                <span className="text-[10px] text-text-tertiary">{asm.templateType}</span>
              )}
              {position !== undefined && (
                <span className="text-[10px] tabular-nums text-text-tertiary">
                  #{position + 1}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Relation Types ─────────────────────────────────────────────────

const RELATION_TYPES = [
  "supports","contradicts","derives_from","expands","references",
  "exemplifies","defines","questions","inspires","echoes",
  "transforms_into","foreshadows","parallels","contextualizes",
  "operationalizes","contains","presupposes","defined_by",
  "grounded_in","instantiates",
];

// ─── Relation Manager (CRUD + AI Suggestions) ──────────────────────

function RelationManager({ unitId, unitContent, projectId }: { unitId: string; unitContent?: string; projectId: string }) {
  const [creating, setCreating] = React.useState(false);
  const [targetContent, setTargetContent] = React.useState("");
  const [relType, setRelType] = React.useState("supports");
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const openPanel = usePanelStore((s) => s.openPanel);
  const utils = api.useUtils();

  const { data: relations = [], isLoading } = api.relation.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  const { data: customTypes = [] } = api.customRelationType.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const { data: searchResults } = api.unit.list.useQuery(
    { projectId, limit: 50, lifecycle: "confirmed" },
    { enabled: !!projectId && creating },
  );

  const createRelation = api.relation.create.useMutation({
    onSuccess: () => {
      void utils.relation.listByUnit.invalidate({ unitId });
      void utils.unit.list.invalidate();
      setCreating(false);
      setTargetContent("");
    },
    onError: (err) => {
      toast.error("Relation creation failed", { description: err.message });
    },
  });

  const deleteRelation = api.relation.delete.useMutation({
    onSuccess: () => void utils.relation.listByUnit.invalidate({ unitId }),
  });

  const suggestRelationsMutation = api.ai.suggestRelations.useMutation({
    onError: (err) => {
      toast.error("AI suggestion failed", { description: err.message });
    },
  });

  const acceptSuggestion = (suggestion: { targetUnitId: string; relationType: string; strength: number }) => {
    createRelation.mutate({
      sourceUnitId: unitId,
      targetUnitId: suggestion.targetUnitId,
      type: suggestion.relationType,
      strength: suggestion.strength,
      direction: "one_way",
      purpose: ["ai_suggested"],
    });
    setDismissed((prev) => new Set(prev).add(suggestion.targetUnitId));
  };

  const suggestions = (suggestRelationsMutation.data?.suggestions ?? []).filter(
    (s) => !dismissed.has(s.targetUnitId),
  );

  const filteredUnits = searchResults?.items?.filter(
    (u) => u.id !== unitId && u.content.toLowerCase().includes(targetContent.toLowerCase()),
  ) ?? [];

  // Group relations by type
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof relations>();
    for (const rel of relations) {
      const arr = map.get(rel.type) ?? [];
      arr.push(rel);
      map.set(rel.type, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => b.strength - a.strength);
    }
    return [...map.entries()].sort(
      (a, b) => Math.max(...b[1].map((r) => r.strength)) - Math.max(...a[1].map((r) => r.strength)),
    );
  }, [relations]);

  return (
    <div className="space-y-3">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCreating(!creating)} className="gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          {creating ? "Cancel" : "Add Relation"}
        </Button>
        <button
          onClick={() => {
            if (unitContent?.trim()) {
              setDismissed(new Set());
              suggestRelationsMutation.mutate({
                content: unitContent,
                contextId: activeContextId ?? undefined,
                projectId,
              });
            }
          }}
          disabled={suggestRelationsMutation.isPending || !unitContent?.trim()}
          className="flex items-center gap-1 text-xs text-accent-primary hover:underline disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          {suggestRelationsMutation.isPending ? "Analyzing..." : "AI Suggest"}
        </button>
      </div>

      {/* Create relation form */}
      {creating && (
        <div className="rounded-xl border border-border bg-bg-secondary p-3 space-y-2">
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <optgroup label="System types">
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </optgroup>
            {customTypes.length > 0 && (
              <optgroup label="Custom types">
                {customTypes.map((ct) => (
                  <option key={ct.id} value={ct.name}>{ct.name.replace(/_/g, " ")}</option>
                ))}
              </optgroup>
            )}
          </select>
          <input
            type="text"
            value={targetContent}
            onChange={(e) => setTargetContent(e.target.value)}
            placeholder="Search units to connect..."
            className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          {filteredUnits.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUnits.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => createRelation.mutate({
                    sourceUnitId: unitId,
                    targetUnitId: u.id,
                    type: relType,
                    strength: 0.7,
                    direction: "one_way",
                    purpose: [],
                  })}
                  className="w-full rounded-lg bg-bg-primary px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover"
                >
                  {u.content.slice(0, 80)}...
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing relations */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />)}
        </div>
      ) : relations.length === 0 && !creating ? (
        <EmptyState icon={Link2} headline="No relations yet" description="Add a relation or use AI to find connections." className="py-6" />
      ) : (
        <div className="space-y-1">
          {grouped.map(([type, rels]) => (
            <div key={type} className="space-y-1">
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${RELATION_TYPE_COLORS[type] ?? "#6B7280"}20`,
                    color: RELATION_TYPE_COLORS[type] ?? "#6B7280",
                  }}
                >
                  {type.replace(/_/g, " ")}
                </span>
              </div>
              {rels.map((rel) => {
                const other = rel.sourceUnitId === unitId ? rel.targetUnit : rel.sourceUnit;
                const color = RELATION_TYPE_COLORS[rel.type] ?? "#6B7280";
                return (
                  <div key={rel.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg-hover transition-colors">
                    <button
                      type="button"
                      onClick={() => other && openPanel(other.id)}
                      className="flex-1 text-left text-xs text-text-primary truncate"
                    >
                      {other?.content?.slice(0, 50) ?? "Unknown unit"}
                      {(other?.content?.length ?? 0) > 50 ? "..." : ""}
                    </button>
                    <StrengthBar value={rel.strength} color={color} />
                    <button
                      onClick={() => deleteRelation.mutate({ id: rel.id })}
                      className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent-danger text-xs px-1 transition-opacity"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* AI Suggestions */}
      {suggestRelationsMutation.isPending && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">AI Suggestions</p>
          {suggestions.map((s) => (
            <div
              key={s.targetUnitId}
              className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-accent-primary">
                  {s.relationType.replace(/_/g, " ")}
                </span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  s.strength >= 0.8 ? "bg-green-500/10 text-green-400" :
                  s.strength >= 0.5 ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-text-tertiary/10 text-text-tertiary",
                )}>
                  {Math.round(s.strength * 100)}%
                </span>
              </div>
              {s.targetUnitContent && (
                <div className="rounded-md border border-border bg-bg-primary px-2.5 py-2 mb-2">
                  {s.targetUnitType && (
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
                      {s.targetUnitType.replace(/_/g, " ")}
                    </span>
                  )}
                  <p className="text-xs text-text-primary line-clamp-3 leading-relaxed">
                    {s.targetUnitContent}
                  </p>
                </div>
              )}
              {s.reasoning && (
                <p className="text-[11px] text-text-tertiary italic mb-2">{s.reasoning}</p>
              )}
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(s.targetUnitId))}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary hover:bg-bg-hover"
                >
                  <XIcon className="h-3 w-3" /> Dismiss
                </button>
                <button
                  onClick={() => acceptSuggestion(s)}
                  className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20"
                >
                  <Check className="h-3 w-3" /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ConnectionsTab ─────────────────────────────────────────────────

export function ConnectionsTab({ unitId, projectId, unitContent }: ConnectionsTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <RelationManager unitId={unitId} unitContent={unitContent} projectId={projectId} />
      <ContextsSection unitId={unitId} />
      <NavigatorsSection unitId={unitId} />
      <AssembliesSection unitId={unitId} />
    </div>
  );
}
