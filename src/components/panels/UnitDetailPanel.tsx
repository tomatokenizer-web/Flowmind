"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Link2,
  Settings2,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  History,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { UnitTypeSelector } from "~/components/unit/UnitTypeSelector";
import { VersionHistory } from "~/components/unit/version-history";
import { AILifecycleBadge } from "~/components/unit/lifecycle-badge";
import { MetadataEditor, type MetadataValues } from "~/components/unit/metadata-editor";
import { ResourceAttachmentStrip, type ResourceAttachment } from "~/components/unit/resource-attachment";
import { EmptyState } from "~/components/shared/empty-state";
import { usePanelStore, type DetailTab } from "~/stores/panel-store";
import type { UnitType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface UnitDetailData {
  id: string;
  content: string;
  projectId?: string;
  unitType: UnitType;
  lifecycle: string;
  createdAt: Date | string;
  modifiedAt?: Date | string | null;
  originType?: string | null;
  sourceSpan?: Record<string, unknown> | null;
  versionCount?: number;
  aiTrustLevel?: string | null;
  certainty?: string | null;
  completeness?: string | null;
  evidenceDomain?: string | null;
  scope?: string | null;
  stance?: string | null;
  resources?: ResourceAttachment[];
  relationCount?: number;
  branchPotential?: number;
}

interface UnitDetailPanelProps {
  unit: UnitDetailData | null;
  isLoading?: boolean;
  onClose: () => void;
  onContentChange?: (content: string) => void;
  onMetadataChange?: (field: keyof MetadataValues, value: string | null) => void;
  onLifecycleChange?: (lifecycle: string) => void;
  onRemoveResource?: (resourceId: string) => void;
  className?: string;
}

// ─── Content Tab ─────────────────────────────────────────────────────

function ContentTab({
  unit,
  onContentChange,
  onLifecycleChange,
}: {
  unit: UnitDetailData;
  onContentChange?: (content: string) => void;
  onLifecycleChange?: (lifecycle: string) => void;
}) {
  const [localContent, setLocalContent] = useState(unit.content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local content when unit changes
  useEffect(() => {
    setLocalContent(unit.content);
  }, [unit.id, unit.content]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalContent(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onContentChange?.(value);
      }, 1000);
    },
    [onContentChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Save on blur
  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (localContent !== unit.content) {
      onContentChange?.(localContent);
    }
  }, [localContent, unit.content, onContentChange]);

  const wordCount = localContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = localContent.length;

  return (
    <div className="space-y-4">
      {/* Unit type — clickable to change */}
      <div className="flex items-center gap-2">
        <UnitTypeSelector unitId={unit.id} currentType={unit.unitType} />
        <AILifecycleBadge lifecycle={unit.lifecycle as "draft" | "pending" | "confirmed"} size="sm" />
      </div>

      {/* Content editor (plain textarea — Tiptap wired in Task 3 full) */}
      <div className="space-y-1">
        <textarea
          value={localContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          className={cn(
            "w-full min-h-[200px] resize-y rounded-lg border border-border bg-bg-primary p-3",
            "text-sm text-text-primary leading-relaxed",
            "placeholder:text-text-tertiary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
            "motion-reduce:transition-none",
          )}
          placeholder="Write your thought..."
          aria-label="Unit content"
        />
        <div className="flex items-center justify-between text-[11px] text-text-tertiary px-1">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>

      {/* Lifecycle controls */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-text-secondary">Lifecycle</span>
        <div className="flex items-center gap-2">
          {(["draft", "pending", "confirmed"] as const).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => onLifecycleChange?.(state)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                "border transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
                "motion-reduce:transition-none",
                unit.lifecycle === state
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover",
              )}
              aria-pressed={unit.lifecycle === state}
              aria-label={`Set lifecycle to ${state}`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Resources */}
      {unit.resources && unit.resources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            Resources
          </div>
          <ResourceAttachmentStrip resources={unit.resources} />
        </div>
      )}

      {/* Version History */}
      <div className="border-t border-border pt-3">
        <VersionHistory unitId={unit.id} currentContent={unit.content} />
      </div>
    </div>
  );
}

// ─── Metadata Tab ────────────────────────────────────────────────────

function MetadataTab({
  unit,
  onMetadataChange,
}: {
  unit: UnitDetailData;
  onMetadataChange?: (field: keyof MetadataValues, value: string | null) => void;
}) {
  const createdAt =
    typeof unit.createdAt === "string" ? new Date(unit.createdAt) : unit.createdAt;
  const modifiedAt = unit.modifiedAt
    ? typeof unit.modifiedAt === "string"
      ? new Date(unit.modifiedAt)
      : unit.modifiedAt
    : null;

  const originLabel = unit.originType?.replace(/_/g, " ") ?? "Direct write";

  return (
    <div className="space-y-5">
      {/* Dates section */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Timestamps
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Created
            </span>
            <span className="text-text-primary" title={format(createdAt, "PPpp")}>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>
          {modifiedAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Modified
              </span>
              <span className="text-text-primary" title={format(modifiedAt, "PPpp")}>
                {formatDistanceToNow(modifiedAt, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Provenance section */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Provenance
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Origin
            </span>
            <span className="text-text-primary capitalize">{originLabel}</span>
          </div>
          {unit.aiTrustLevel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">AI Trust</span>
              <span className="text-text-primary capitalize">
                {unit.aiTrustLevel.replace(/_/g, " ")}
              </span>
            </div>
          )}
          {unit.sourceSpan && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Source Span</span>
              <span className="text-text-primary truncate max-w-[160px]">
                {JSON.stringify(unit.sourceSpan)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Version link */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          History
        </h4>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <History className="h-3 w-3" aria-hidden="true" />
            Versions
          </span>
          <button
            type="button"
            className="text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
          >
            {unit.versionCount ?? 0} version{(unit.versionCount ?? 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </section>

      {/* Lifecycle badge */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Status
        </h4>
        <AILifecycleBadge
          lifecycle={unit.lifecycle as "draft" | "pending" | "confirmed"}
          size="md"
        />
      </section>

      {/* Editable metadata fields (FR73) */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Classification
        </h4>
        <MetadataEditor
          values={{
            unitType: unit.unitType,
            certainty: (unit.certainty as MetadataValues["certainty"]) ?? null,
            completeness: (unit.completeness as MetadataValues["completeness"]) ?? null,
            evidenceDomain: (unit.evidenceDomain as MetadataValues["evidenceDomain"]) ?? null,
            scope: (unit.scope as MetadataValues["scope"]) ?? null,
            stance: (unit.stance as MetadataValues["stance"]) ?? null,
          }}
          onChange={(field, value) => onMetadataChange?.(field, value)}
        />
      </section>
    </div>
  );
}

// ─── Relations Tab ────────────────────────────────────────────────────

const RELATION_TYPES = [
  "supports","contradicts","derives_from","expands","references",
  "exemplifies","defines","questions","inspires","echoes",
  "transforms_into","foreshadows","parallels","contextualizes",
  "operationalizes","contains","presupposes","defined_by",
  "grounded_in","instantiates",
];

function RelationsTab({ unitId, projectId }: { unitId: string; projectId?: string }) {
  const [creating, setCreating] = React.useState(false);
  const [targetContent, setTargetContent] = React.useState("");
  const [relType, setRelType] = React.useState("supports");
  const utils = api.useUtils();

  const { data: relations = [], isLoading } = api.relation.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  // Search units to link to
  const { data: searchResults } = api.unit.list.useQuery(
    { projectId: projectId!, limit: 10 },
    { enabled: !!projectId && creating },
  );

  const createRelation = api.relation.create.useMutation({
    onSuccess: () => {
      void utils.relation.listByUnit.invalidate({ unitId });
      setCreating(false);
      setTargetContent("");
    },
  });

  const deleteRelation = api.relation.delete.useMutation({
    onSuccess: () => void utils.relation.listByUnit.invalidate({ unitId }),
  });

  const filteredUnits = searchResults?.items?.filter(
    (u) => u.id !== unitId && u.content.toLowerCase().includes(targetContent.toLowerCase()),
  ) ?? [];

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Create relation button */}
      <Button variant="ghost" size="sm" onClick={() => setCreating(!creating)} className="self-start">
        <Link2 className="h-3.5 w-3.5" />
        {creating ? "Cancel" : "Add Relation"}
      </Button>

      {/* Create relation form */}
      {creating && (
        <div className="rounded-xl border border-border bg-bg-secondary p-3 space-y-2">
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {RELATION_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
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
          {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-secondary" />)}
        </div>
      ) : relations.length === 0 && !creating ? (
        <EmptyState icon={Link2} headline="No relations yet" description="Add a relation to connect this unit to others." className="py-8" />
      ) : (
        relations.map((rel) => {
          const other = rel.sourceUnitId === unitId ? rel.targetUnit : rel.sourceUnit;
          const direction = rel.sourceUnitId === unitId ? "→" : "←";
          return (
            <div key={rel.id} className="group rounded-lg border border-border bg-bg-primary p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-accent-primary">{rel.type.replace(/_/g, " ")}</span>
                  <span className="text-text-tertiary">{direction} {Math.round(rel.strength * 100)}%</span>
                </div>
                <button
                  onClick={() => deleteRelation.mutate({ id: rel.id })}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent-danger text-xs px-1"
                >✕</button>
              </div>
              <p className="line-clamp-2 text-sm text-text-primary">{other?.content}</p>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── AI Tab ───────────────────────────────────────────────────────────

function AITab({ unitId, content, branchPotential }: { unitId: string; content: string; branchPotential?: number }) {
  const filled = Math.round((branchPotential ?? 0) * 4);

  const suggestTypeMutation = api.ai.suggestType.useMutation();

  return (
    <div className="space-y-4 p-4">
      {/* Type suggestion */}
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">AI Type Suggestion</p>
        {suggestTypeMutation.data ? (
          <div className="text-sm text-text-primary">
            Suggested: <strong>{suggestTypeMutation.data.suggestion?.unitType}</strong>
            <span className="ml-2 text-text-tertiary">({Math.round((suggestTypeMutation.data.suggestion?.confidence ?? 0) * 100)}% confidence)</span>
            <p className="mt-1 text-xs text-text-secondary">{suggestTypeMutation.data.suggestion?.reasoning}</p>
          </div>
        ) : (
          <button
            onClick={() => suggestTypeMutation.mutate({ content })}
            disabled={suggestTypeMutation.isPending}
            className="text-sm text-accent-primary hover:underline disabled:opacity-50"
          >
            {suggestTypeMutation.isPending ? "Analyzing..." : "Suggest type for this unit"}
          </button>
        )}
      </div>

      {/* Branch potential */}
      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <span className="text-sm text-text-secondary">Branch Potential</span>
        <span className="inline-flex items-center gap-0.5" aria-label={`Branch potential: ${filled} of 4`}>
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "text-base leading-none",
                i < filled ? "text-accent-primary" : "text-text-tertiary",
              )}
              aria-hidden="true"
            >
              {i < filled ? "●" : "○"}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-space-4">
      <div className="animate-pulse bg-bg-secondary rounded-lg h-6 w-24" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-full" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-3/4" />
      <div className="animate-pulse bg-bg-secondary rounded-xl h-40 w-full" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-1/2" />
    </div>
  );
}

// ─── Tab icons ───────────────────────────────────────────────────────

const TAB_CONFIG: { value: DetailTab; label: string; Icon: React.ElementType }[] = [
  { value: "content", label: "Content", Icon: FileText },
  { value: "relations", label: "Relations", Icon: Link2 },
  { value: "metadata", label: "Metadata", Icon: Settings2 },
  { value: "ai", label: "AI", Icon: Sparkles },
];

// ─── UnitDetailPanel ─────────────────────────────────────────────────

export function UnitDetailPanel({
  unit,
  isLoading,
  onClose,
  onContentChange,
  onMetadataChange,
  onLifecycleChange,
  onRemoveResource,
  className,
}: UnitDetailPanelProps) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const setActiveTab = usePanelStore((s) => s.setActiveTab);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Panel header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-space-4 shrink-0">
        <h2 className="text-sm font-medium text-text-primary truncate">
          {unit ? "Unit Detail" : "Details"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close detail panel"
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && <PanelSkeleton />}

      {/* Empty state — no unit selected */}
      {!isLoading && !unit && (
        <div className="flex flex-1 flex-col items-center justify-center gap-space-4 p-space-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-bg-secondary" />
          <p className="text-sm text-text-secondary">
            Select a thought unit to see its details
          </p>
        </div>
      )}

      {/* Unit detail content */}
      {!isLoading && unit && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DetailTab)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="px-space-4 shrink-0 w-full">
            {TAB_CONFIG.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-space-4">
              <TabsContent value="content" className="mt-0">
                <ContentTab
                  unit={unit}
                  onContentChange={onContentChange}
                  onLifecycleChange={onLifecycleChange}
                />
              </TabsContent>

              <TabsContent value="relations" className="mt-0">
                <RelationsTab unitId={unit.id} projectId={unit.projectId} />
              </TabsContent>

              <TabsContent value="metadata" className="mt-0">
                <MetadataTab
                  unit={unit}
                  onMetadataChange={onMetadataChange}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <AITab unitId={unit.id} content={unit.content} branchPotential={unit.branchPotential} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      )}
    </div>
  );
}
