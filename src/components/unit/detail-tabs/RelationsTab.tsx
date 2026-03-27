"use client";

import * as React from "react";
import { Link2 } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/shared/empty-state";
import { toast } from "~/lib/toast";

const RELATION_TYPES = [
  "supports","contradicts","derives_from","expands","references",
  "exemplifies","defines","questions","inspires","echoes",
  "transforms_into","foreshadows","parallels","contextualizes",
  "operationalizes","contains","presupposes","defined_by",
  "grounded_in","instantiates",
];

interface RelationsTabProps {
  unitId: string;
  projectId?: string;
}

export function RelationsTab({ unitId, projectId }: RelationsTabProps) {
  const [creating, setCreating] = React.useState(false);
  const [targetContent, setTargetContent] = React.useState("");
  const [relType, setRelType] = React.useState("supports");
  const utils = api.useUtils();

  const { data: relations = [], isLoading } = api.relation.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  const { data: customTypes = [] } = api.customRelationType.list.useQuery(
    { projectId: projectId },
    { enabled: !!projectId },
  );

  const { data: searchResults } = api.unit.list.useQuery(
    { projectId: projectId, limit: 50, lifecycle: "confirmed" },
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
