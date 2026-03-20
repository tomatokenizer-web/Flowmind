"use client";

import * as React from "react";
import { Plus, ChevronRight, Compass, X } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { usePanelStore } from "~/stores/panel-store";
import { useSelectionStore } from "~/stores/selectionStore";

interface NavigatorPanelProps {
  contextId: string;
}

export function NavigatorPanel({ contextId }: NavigatorPanelProps) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [activeNavId, setActiveNavId] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);
  const utils = api.useUtils();

  const { data: navigators = [] } = api.navigator.list.useQuery({ contextId });

  const createNav = api.navigator.create.useMutation({
    onSuccess: () => { void utils.navigator.list.invalidate({ contextId }); setCreating(false); setNewName(""); },
  });

  const deleteNav = api.navigator.delete.useMutation({
    onSuccess: () => { void utils.navigator.list.invalidate({ contextId }); setActiveNavId(null); },
  });

  const openPanel = usePanelStore((s) => s.openPanel);
  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);

  const activeNav = navigators.find((n) => n.id === activeNavId);
  const totalSteps = activeNav?.path?.length ?? 0;

  const handleStep = (step: number) => {
    setActiveStep(step);
    const unitId = activeNav?.path?.[step];
    if (unitId) { setSelectedUnit(unitId); openPanel(unitId); }
  };

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          <Compass className="h-3.5 w-3.5" /> Navigators
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreating(!creating)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {creating && (
        <div className="flex gap-1">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) createNav.mutate({ name: newName.trim(), contextId });
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Navigator name..."
            className="flex-1 rounded-lg border border-border bg-bg-primary px-2 py-1 text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      )}

      {navigators.length === 0 && !creating && (
        <p className="text-xs text-text-tertiary">No navigators yet. Create one to define a reading path.</p>
      )}

      {navigators.map((nav) => (
        <div key={nav.id} className="rounded-lg border border-border bg-bg-primary">
          <button
            type="button"
            onClick={() => setActiveNavId(activeNavId === nav.id ? null : nav.id)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover"
          >
            <span className="truncate font-medium">{nav.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-tertiary">{nav.path?.length ?? 0} steps</span>
              <ChevronRight className={cn("h-3.5 w-3.5 text-text-tertiary transition-transform", activeNavId === nav.id && "rotate-90")} />
            </div>
          </button>

          {activeNavId === nav.id && totalSteps > 0 && (
            <div className="border-t border-border p-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
                <span>Step {activeStep + 1} of {totalSteps}</span>
                <div className="flex gap-1">
                  <button disabled={activeStep === 0} onClick={() => handleStep(activeStep - 1)} className="px-2 py-0.5 rounded border border-border disabled:opacity-40 hover:bg-bg-hover">←</button>
                  <button disabled={activeStep >= totalSteps - 1} onClick={() => handleStep(activeStep + 1)} className="px-2 py-0.5 rounded border border-border disabled:opacity-40 hover:bg-bg-hover">→</button>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {nav.path?.map((_, i) => (
                  <button key={i} onClick={() => handleStep(i)}
                    className={cn("h-2 w-2 rounded-full transition-colors", i === activeStep ? "bg-accent-primary" : "bg-bg-hover hover:bg-border")} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
