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

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: (assemblyId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────

export function AssemblyTemplateDialog({ open, onOpenChange, projectId, onCreated }: Props) {
  const utils = api.useUtils();
  const [selected, setSelected] = React.useState<string>("blank");
  const [name, setName] = React.useState("New Assembly");

  const createBlank = api.assembly.create.useMutation({
    onSuccess: (a) => {
      void utils.assembly.list.invalidate();
      onCreated(a.id);
      onOpenChange(false);
      setSelected("blank");
      setName("New Assembly");
    },
  });

  const createFromTemplate = api.assembly.createFromTemplate.useMutation({
    onSuccess: (a) => {
      void utils.assembly.list.invalidate();
      onCreated(a.id);
      onOpenChange(false);
      setSelected("blank");
      setName("New Assembly");
    },
  });

  const isPending = createBlank.isPending || createFromTemplate.isPending;

  const handleCreate = () => {
    const trimmedName = name.trim() || "New Assembly";
    if (selected === "blank") {
      createBlank.mutate({ name: trimmedName, projectId });
    } else {
      const template = TEMPLATES.find((t) => t.id === selected);
      if (!template) return;
      createFromTemplate.mutate({
        name: trimmedName,
        projectId,
        templateType: template.id,
        slots: template.slots,
      });
    }
  };

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0]!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onClick={() => setSelected(t.id)}
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
            <p className="mb-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide">Slots</p>
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

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
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
