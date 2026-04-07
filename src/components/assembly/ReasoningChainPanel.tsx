"use client";

import * as React from "react";
import { ChevronDown, GitBranch, Plus, Trash2, ArrowDown, Sparkles, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// ─── List item type (matches reasoningChain.list select shape) ────

interface ChainListItem {
  id: string;
  name: string;
  goal: string | null;
  contextId: string;
  steps: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Role styling ─────────────────────────────────────────────────

const ROLE_STYLES: Record<
  "premise" | "inference" | "conclusion",
  { badge: string; label: string }
> = {
  premise: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Premise",
  },
  inference: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Inference",
  },
  conclusion: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    label: "Conclusion",
  },
};

// ─── Types ────────────────────────────────────────────────────────

type StepRole = "premise" | "inference" | "conclusion";

interface EnrichedStep {
  unitId: string;
  role: StepRole;
  order: number;
  unit: {
    id: string;
    content: string;
    unitType: string;
    lifecycle: string;
  } | null;
}

// ─── Single chain view ────────────────────────────────────────────

interface ChainViewProps {
  chainId: string;
  contextId: string;
  onClose: () => void;
}

function ChainView({ chainId, contextId, onClose }: ChainViewProps) {
  const utils = api.useUtils();

  const { data: chain, isLoading } = api.reasoningChain.getById.useQuery({ id: chainId });

  // Units in this context available to add as steps — need projectId, so fetch context first
  const { data: contextData } = api.context.getById.useQuery({ id: contextId });
  const projectId = (contextData as { projectId?: string } | undefined)?.projectId;

  const { data: unitsData } = api.unit.list.useQuery(
    { projectId: projectId, contextId, limit: 100 },
    { enabled: !!projectId },
  );

  const addStep = api.reasoningChain.addStep.useMutation({
    onSuccess: () => utils.reasoningChain.getById.invalidate({ id: chainId }),
  });

  const removeStep = api.reasoningChain.removeStep.useMutation({
    onSuccess: () => utils.reasoningChain.getById.invalidate({ id: chainId }),
  });

  const deleteChain = api.reasoningChain.delete.useMutation({
    onSuccess: () => {
      void utils.reasoningChain.list.invalidate({ contextId });
      onClose();
    },
  });

  const [addRole, setAddRole] = React.useState<StepRole>("premise");
  const [addUnitId, setAddUnitId] = React.useState("");

  const existingUnitIds = new Set(chain?.steps.map((s) => s.unitId) ?? []);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  if (!chain) return null;

  const steps = chain.steps as EnrichedStep[];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Chain header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">{chain.name}</p>
          {chain.goal && (
            <p className="text-xs text-text-secondary mt-0.5">{chain.goal}</p>
          )}
        </div>
        <button
          onClick={() => deleteChain.mutate({ id: chain.id })}
          className="shrink-0 rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-accent-danger transition-colors"
          title="Delete chain"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Steps flow */}
      {steps.length === 0 ? (
        <p className="text-xs text-text-tertiary py-2">No steps yet. Add units below.</p>
      ) : (
        <ol className="space-y-1">
          {steps.map((step, idx) => {
            const roleStyle = ROLE_STYLES[step.role];
            return (
              <React.Fragment key={step.unitId}>
                <li className="group flex items-start gap-2 rounded-lg border border-border bg-bg-primary p-3">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      roleStyle.badge,
                    )}
                  >
                    {roleStyle.label}
                  </span>
                  <p className="flex-1 text-xs leading-relaxed text-text-primary line-clamp-3">
                    {step.unit?.content ?? "(unit not found)"}
                  </p>
                  <button
                    onClick={() => removeStep.mutate({ chainId: chain.id, unitId: step.unitId })}
                    className="shrink-0 rounded p-0.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-danger"
                    title="Remove step"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
                {idx < steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-3.5 w-3.5 text-text-tertiary" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      )}

      {/* Add step form */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <select
          value={addRole}
          onChange={(e) => setAddRole(e.target.value as StepRole)}
          className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="premise">Premise</option>
          <option value="inference">Inference</option>
          <option value="conclusion">Conclusion</option>
        </select>

        <select
          value={addUnitId}
          onChange={(e) => setAddUnitId(e.target.value)}
          className="flex-1 min-w-0 rounded border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">Select unit...</option>
          {(unitsData?.items ?? [])
            .filter((u) => !existingUnitIds.has(u.id))
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.content.slice(0, 60) + (u.content.length > 60 ? "…" : "")}
              </option>
            ))}
        </select>

        <Button
          size="sm"
          variant="ghost"
          disabled={!addUnitId || addStep.isPending}
          onClick={() => {
            if (!addUnitId) return;
            addStep.mutate({
              chainId: chain.id,
              step: { unitId: addUnitId, role: addRole, order: steps.length },
            });
            setAddUnitId("");
          }}
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── Create chain form ────────────────────────────────────────────

interface CreateChainFormProps {
  contextId: string;
  onCreated: (chainId: string) => void;
  onCancel: () => void;
}

function CreateChainForm({ contextId, onCreated, onCancel }: CreateChainFormProps) {
  const utils = api.useUtils();
  const [name, setName] = React.useState("");
  const [goal, setGoal] = React.useState("");

  const create = api.reasoningChain.create.useMutation({
    onSuccess: (chain) => {
      void utils.reasoningChain.list.invalidate({ contextId });
      onCreated(chain.id);
    },
  });

  return (
    <div className="flex flex-col gap-2 p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chain name..."
        className="w-full rounded border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        maxLength={200}
      />
      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Goal (optional)..."
        className="w-full rounded border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        maxLength={1000}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate({ name: name.trim(), goal: goal.trim() || undefined, contextId })}
        >
          Create
        </Button>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────

interface ReasoningChainPanelProps {
  contextId: string;
}

export function ReasoningChainPanel({ contextId }: ReasoningChainPanelProps) {
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeChainId, setActiveChainId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const { data: chains, isLoading } = api.reasoningChain.list.useQuery(
    { contextId },
    { enabled: isOpen },
  );

  const aiGenerateMutation = api.ai.generateReasoningChains.useMutation({
    onSuccess: (data) => {
      void utils.reasoningChain.list.invalidate({ contextId });
      if (data.chains.length > 0) {
        const desc = data.bridgeUnitsCreated > 0
          ? `Created ${data.bridgeUnitsCreated} bridge unit${data.bridgeUnitsCreated > 1 ? "s" : ""} to fill logical gaps`
          : undefined;
        toast.success(`Generated ${data.chains.length} reasoning chain${data.chains.length > 1 ? "s" : ""}`, { description: desc });
      } else {
        toast.info("No reasoning chains found in this context");
      }
    },
    onError: () => toast.error("Failed to generate reasoning chains"),
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Reasoning Chains
          {chains && chains.length > 0 && (
            <span className="ml-1 rounded-full bg-bg-secondary px-1.5 py-0.5 text-xs text-text-tertiary">
              {chains.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div>
          {activeChainId ? (
            <ChainView
              chainId={activeChainId}
              contextId={contextId}
              onClose={() => setActiveChainId(null)}
            />
          ) : creating ? (
            <CreateChainForm
              contextId={contextId}
              onCreated={(id) => {
                setCreating(false);
                setActiveChainId(id);
              }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-bg-secondary" />
                  ))}
                </div>
              ) : chains && chains.length > 0 ? (
                <ul className="space-y-1">
                  {(chains as ChainListItem[]).map((chain) => (
                    <li key={chain.id}>
                      <button
                        onClick={() => setActiveChainId(chain.id)}
                        className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-left text-xs hover:bg-bg-hover transition-colors"
                      >
                        <span className="block font-medium text-text-primary">{chain.name}</span>
                        {chain.goal && (
                          <span className="block text-text-tertiary mt-0.5 line-clamp-1">{chain.goal}</span>
                        )}
                        <span className="text-text-tertiary">
                          {Array.isArray(chain.steps) ? chain.steps.length : 0} step{Array.isArray(chain.steps) && chain.steps.length !== 1 ? "s" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-tertiary py-2">
                  No reasoning chains yet.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New chain
                </Button>
                <Button
                  size="sm"
                  className="flex-1 justify-center gap-1"
                  onClick={() => aiGenerateMutation.mutate({ contextId })}
                  disabled={aiGenerateMutation.isPending}
                >
                  {aiGenerateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiGenerateMutation.isPending ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
