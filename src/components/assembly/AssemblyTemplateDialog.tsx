"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Wand2, Check, X } from "lucide-react";

// ─── Template definitions ─────────────────────────────────────────

interface TemplateSlot {
  name: string;
  position: number;
}

interface AssemblyTemplate {
  id: string;
  label: string;
  description: string;
  slots: TemplateSlot[];
}

const TEMPLATES: AssemblyTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    description: "Start from scratch with no predefined slots.",
    slots: [],
  },
  {
    id: "essay",
    label: "Essay",
    description: "Classic five-part essay structure with intro, body, and conclusion.",
    slots: [
      { name: "Introduction", position: 0 },
      { name: "Body I", position: 1 },
      { name: "Body II", position: 2 },
      { name: "Body III", position: 3 },
      { name: "Conclusion", position: 4 },
    ],
  },
  {
    id: "research_paper",
    label: "Research Paper",
    description: "IMRaD structure: Introduction, Methods, Results, Discussion.",
    slots: [
      { name: "Abstract", position: 0 },
      { name: "Introduction", position: 1 },
      { name: "Methods", position: 2 },
      { name: "Results", position: 3 },
      { name: "Discussion", position: 4 },
    ],
  },
  {
    id: "presentation",
    label: "Presentation",
    description: "Slide-ready outline: hook, problem, solution, evidence, call-to-action.",
    slots: [
      { name: "Hook", position: 0 },
      { name: "Problem", position: 1 },
      { name: "Solution", position: 2 },
      { name: "Evidence", position: 3 },
      { name: "Call to Action", position: 4 },
    ],
  },
  {
    id: "debate_brief",
    label: "Debate Brief",
    description: "Structured argument with claim, warrants, evidence, and rebuttals.",
    slots: [
      { name: "Claim", position: 0 },
      { name: "Warrant I", position: 1 },
      { name: "Warrant II", position: 2 },
      { name: "Evidence", position: 3 },
      { name: "Rebuttal", position: 4 },
    ],
  },
];

// ─── Auto-mapping types ───────────────────────────────────────────

interface SlotMapping {
  slot: string;
  proposedUnitId: string;
  confidence: number;
  accepted: boolean;
}

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Optional: when provided, enables AI slot auto-mapping */
  contextId?: string;
  onCreated: (assemblyId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────

export function AssemblyTemplateDialog({ open, onOpenChange, projectId, contextId, onCreated }: Props) {
  const utils = api.useUtils();
  const [selected, setSelected] = React.useState<string>("blank");
  const [name, setName] = React.useState("New Assembly");

  // Auto-mapping state
  const [mappings, setMappings] = React.useState<SlotMapping[] | null>(null);
  const [mappingError, setMappingError] = React.useState<string | null>(null);

  const proposeSlotMappings = api.assembly.proposeSlotMappings.useQuery(
    { contextId: contextId!, templateType: selected },
    {
      enabled: false, // manual trigger only
    },
  );

  const createBlank = api.assembly.create.useMutation({
    onSuccess: (a) => {
      void utils.assembly.list.invalidate();
      onCreated(a.id);
      handleClose();
    },
  });

  const createFromTemplate = api.assembly.createFromTemplate.useMutation({
    onSuccess: (a) => {
      void utils.assembly.list.invalidate();
      onCreated(a.id);
      handleClose();
    },
  });

  const isPending = createBlank.isPending || createFromTemplate.isPending;

  function handleClose() {
    onOpenChange(false);
    setSelected("blank");
    setName("New Assembly");
    setMappings(null);
    setMappingError(null);
  }

  async function handleAutoMap() {
    if (!contextId || selected === "blank") return;
    setMappingError(null);
    try {
      const result = await proposeSlotMappings.refetch();
      if (result.data && result.data.length > 0) {
        setMappings(
          result.data.map((p) => ({ ...p, accepted: true }))
        );
      } else {
        setMappingError("No suitable units found for auto-mapping.");
      }
    } catch {
      setMappingError("Failed to propose mappings.");
    }
  }

  function toggleMapping(slot: string) {
    setMappings((prev) =>
      prev ? prev.map((m) => (m.slot === slot ? { ...m, accepted: !m.accepted } : m)) : prev
    );
  }

  const handleCreate = () => {
    const trimmedName = name.trim() || "New Assembly";

    if (selected === "blank") {
      createBlank.mutate({ name: trimmedName, projectId });
      return;
    }

    const template = TEMPLATES.find((t) => t.id === selected);
    if (!template) return;

    // Build slots, optionally with accepted unitId mappings
    // The createFromTemplate API only takes slot name + position, so accepted mappings
    // will be added as units post-creation (future enhancement).
    // For now we pass slots as-is; accepted mappings are surfaced to the user for awareness.
    createFromTemplate.mutate({
      name: trimmedName,
      projectId,
      templateType: template.id,
      slots: template.slots,
    });
  };

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0]!;
  const canAutoMap = !!contextId && selected !== "blank";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Assembly</DialogTitle>
          <DialogDescription>
            Choose a template to get started, or create a blank assembly.
          </DialogDescription>
        </DialogHeader>

        {/* Name input */}
        <div className="mt-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="assembly-name">
            Name
          </label>
          <input
            id="assembly-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            placeholder="Assembly name"
            maxLength={200}
          />
        </div>

        {/* Template grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelected(t.id);
                setMappings(null);
                setMappingError(null);
              }}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                selected === t.id
                  ? "border-accent-primary bg-accent-primary/10 text-text-primary"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-accent-primary/40 hover:bg-bg-secondary/80",
              )}
            >
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs text-text-tertiary line-clamp-2">{t.description}</span>
            </button>
          ))}
        </div>

        {/* Slot preview */}
        {selectedTemplate.slots.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-bg-primary px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Slots</p>
              {canAutoMap && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={handleAutoMap}
                  disabled={proposeSlotMappings.isFetching}
                >
                  <Wand2 className="h-3 w-3" />
                  {proposeSlotMappings.isFetching ? "Mapping..." : "Auto-map units"}
                </Button>
              )}
            </div>
            <ol className="flex flex-wrap gap-1.5">
              {selectedTemplate.slots.map((slot) => (
                <li
                  key={slot.position}
                  className="rounded bg-bg-secondary px-2 py-0.5 text-xs text-text-secondary border border-border"
                >
                  {slot.position + 1}. {slot.name}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Auto-mapping results */}
        {mappingError && (
          <p className="mt-2 text-xs text-accent-danger">{mappingError}</p>
        )}

        {mappings && mappings.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-bg-primary px-3 py-2 space-y-1.5">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
              Proposed Mappings — accept or reject each
            </p>
            {mappings.map((m) => (
              <div
                key={m.slot}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border transition-colors",
                  m.accepted
                    ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                    : "border-border bg-bg-secondary opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-text-primary">{m.slot}</span>
                  <span className="mx-1.5 text-text-tertiary">→</span>
                  <ProposedUnitLabel unitId={m.proposedUnitId} projectId={projectId} />
                  <span className="ml-1.5 text-[10px] text-text-tertiary">
                    {Math.round(m.confidence * 100)}% confidence
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMapping(m.slot)}
                  className={cn(
                    "shrink-0 rounded p-0.5 transition-colors",
                    m.accepted
                      ? "text-green-600 hover:text-accent-danger"
                      : "text-text-tertiary hover:text-green-600",
                  )}
                  title={m.accepted ? "Reject mapping" : "Accept mapping"}
                >
                  {m.accepted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper: show a short unit label by ID ────────────────────────

function ProposedUnitLabel({ unitId, projectId }: { unitId: string; projectId: string }) {
  const { data } = api.unit.list.useQuery({ projectId, limit: 100 });
  const unit = data?.items.find((u) => u.id === unitId);
  if (!unit) return <span className="text-xs text-text-tertiary">{unitId.slice(0, 8)}…</span>;
  const preview = unit.content.slice(0, 50) + (unit.content.length > 50 ? "…" : "");
  return <span className="text-xs text-text-secondary">{preview}</span>;
}
