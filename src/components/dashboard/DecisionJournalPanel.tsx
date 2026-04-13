"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Loader2,
  Scale,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface DecisionJournalPanelProps {
  projectId: string;
}

// ─── Create Decision Form ────────────────────────────────────────

interface OptionDraft {
  label: string;
  description: string;
  pros: string[];
  cons: string[];
}

function CreateDecisionForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [context, setContext] = React.useState("");
  const [options, setOptions] = React.useState<OptionDraft[]>([
    { label: "", description: "", pros: [""], cons: [""] },
    { label: "", description: "", pros: [""], cons: [""] },
  ]);

  const utils = api.useUtils();
  const createMutation = api.decisionJournal.create.useMutation({
    onSuccess: () => {
      void utils.decisionJournal.list.invalidate();
      onCreated();
    },
  });

  const addOption = () => {
    setOptions([...options, { label: "", description: "", pros: [""], cons: [""] }]);
  };

  const updateOption = (idx: number, field: keyof OptionDraft, value: string | string[]) => {
    setOptions(options.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options
      .filter((o) => o.label.trim())
      .map((o) => ({
        label: o.label.trim(),
        description: o.description.trim(),
        pros: o.pros.filter((p) => p.trim()),
        cons: o.cons.filter((c) => c.trim()),
      }));

    if (!title.trim() || validOptions.length < 1) return;

    createMutation.mutate({
      title: title.trim(),
      context: context.trim(),
      options: validOptions,
      projectId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-text-secondary">Decision Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What decision are you facing?"
          className="mt-1 w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text-secondary">Context</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Background information for this decision..."
          rows={2}
          className="mt-1 w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Options</label>
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus className="h-3 w-3" /> Add option
          </button>
        </div>
        {options.map((opt, idx) => (
          <div key={idx} className="rounded border border-border p-3 space-y-2">
            <input
              type="text"
              value={opt.label}
              onChange={(e) => updateOption(idx, "label", e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="w-full rounded border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-medium text-green-500 uppercase">Pros</span>
                <input
                  type="text"
                  value={opt.pros[0] ?? ""}
                  onChange={(e) => updateOption(idx, "pros", [e.target.value])}
                  placeholder="Advantage..."
                  className="mt-0.5 w-full rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-red-400 uppercase">Cons</span>
                <input
                  type="text"
                  value={opt.cons[0] ?? ""}
                  onChange={(e) => updateOption(idx, "cons", [e.target.value])}
                  placeholder="Disadvantage..."
                  className="mt-0.5 w-full rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={createMutation.isPending || !title.trim()}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Decision"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Decision Entry Card ─────────────────────────────────────────

function DecisionEntryCard({
  entry,
  onRecordDecision,
  onRecordOutcome,
  onRemove,
}: {
  entry: {
    id: string;
    title: string;
    context: string;
    options: Array<{ label: string; description: string; pros: string[]; cons: string[] }>;
    chosen: string | null;
    rationale: string | null;
    outcome: string | null;
    unitIds: string[];
    createdAt: Date;
  };
  onRecordDecision: (id: string, chosen: string, rationale: string) => void;
  onRecordOutcome: (id: string, outcome: string) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [decidingIdx, setDecidingIdx] = React.useState<number | null>(null);
  const [rationale, setRationale] = React.useState("");
  const [outcomeText, setOutcomeText] = React.useState("");
  const [showOutcomeForm, setShowOutcomeForm] = React.useState(false);

  const isDecided = !!entry.chosen;
  const hasOutcome = !!entry.outcome;

  return (
    <div className="border border-border rounded bg-bg-primary">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-bg-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">{entry.title}</span>
            {isDecided && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                Decided
              </span>
            )}
            {hasOutcome && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                Outcome Recorded
              </span>
            )}
          </div>
          <span className="text-xs text-text-tertiary">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            {isDecided && ` \u00B7 Chose: ${entry.chosen}`}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {entry.context && (
            <p className="text-xs text-text-secondary">{entry.context}</p>
          )}

          {/* Options */}
          <div className="space-y-2">
            {entry.options.map((opt, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded border p-2",
                  entry.chosen === opt.label
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  {entry.chosen === opt.label && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {!isDecided && (
                    <button
                      type="button"
                      onClick={() => setDecidingIdx(decidingIdx === idx ? null : idx)}
                      className="text-xs text-accent hover:underline"
                    >
                      Choose
                    </button>
                  )}
                </div>
                {opt.pros.length > 0 && (
                  <div className="flex items-start gap-1 mt-1">
                    <ThumbsUp className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-text-secondary">{opt.pros.join(", ")}</span>
                  </div>
                )}
                {opt.cons.length > 0 && (
                  <div className="flex items-start gap-1 mt-0.5">
                    <ThumbsDown className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-text-secondary">{opt.cons.join(", ")}</span>
                  </div>
                )}

                {/* Inline decision form */}
                {decidingIdx === idx && !isDecided && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      placeholder="Why did you choose this option?"
                      rows={2}
                      className="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          onRecordDecision(entry.id, opt.label, rationale);
                          setDecidingIdx(null);
                          setRationale("");
                        }}
                        disabled={!rationale.trim()}
                        className="h-6 text-xs"
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDecidingIdx(null)}
                        className="h-6 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Rationale */}
          {entry.rationale && (
            <div className="rounded border border-border p-2">
              <span className="text-[10px] font-medium text-text-tertiary uppercase">Rationale</span>
              <p className="text-xs text-text-secondary mt-0.5">{entry.rationale}</p>
            </div>
          )}

          {/* Outcome */}
          {entry.outcome && (
            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-2">
              <span className="text-[10px] font-medium text-blue-400 uppercase">Outcome</span>
              <p className="text-xs text-text-secondary mt-0.5">{entry.outcome}</p>
            </div>
          )}

          {/* Record outcome form */}
          {isDecided && !hasOutcome && (
            <div>
              {showOutcomeForm ? (
                <div className="space-y-2">
                  <textarea
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                    placeholder="What was the outcome of this decision?"
                    rows={2}
                    className="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        onRecordOutcome(entry.id, outcomeText);
                        setShowOutcomeForm(false);
                        setOutcomeText("");
                      }}
                      disabled={!outcomeText.trim()}
                      className="h-6 text-xs"
                    >
                      Save Outcome
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOutcomeForm(false)}
                      className="h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOutcomeForm(true)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> Record outcome
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this decision entry?")) {
                  onRemove(entry.id);
                }
              }}
              className="text-xs text-red-400 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

export function DecisionJournalPanel({ projectId }: DecisionJournalPanelProps) {
  const [showCreate, setShowCreate] = React.useState(false);
  const utils = api.useUtils();

  const listQuery = api.decisionJournal.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const recordDecisionMutation = api.decisionJournal.recordDecision.useMutation({
    onSuccess: () => void utils.decisionJournal.list.invalidate(),
  });

  const recordOutcomeMutation = api.decisionJournal.recordOutcome.useMutation({
    onSuccess: () => void utils.decisionJournal.list.invalidate(),
  });

  const removeMutation = api.decisionJournal.remove.useMutation({
    onSuccess: () => void utils.decisionJournal.list.invalidate(),
  });

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const entries = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Decision Journal</h2>
          {entries.length > 0 && (
            <span className="text-xs text-text-tertiary">{entries.length} entries</span>
          )}
        </div>
        {!showCreate && (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Decision
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="border border-accent/20 rounded p-4 bg-accent/5">
          <CreateDecisionForm
            projectId={projectId}
            onCreated={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {entries.length === 0 && !showCreate ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No decisions recorded yet. Track your thinking process by creating a decision entry.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <DecisionEntryCard
              key={entry.id}
              entry={entry}
              onRecordDecision={(id, chosen, rationale) =>
                recordDecisionMutation.mutate({ id, chosen, rationale })
              }
              onRecordOutcome={(id, outcome) =>
                recordOutcomeMutation.mutate({ id, outcome })
              }
              onRemove={(id) => removeMutation.mutate({ id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
