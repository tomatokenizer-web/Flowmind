"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import {
  Sparkles,
  RefreshCw,
  MessageSquareWarning,
  Lightbulb,
  Scale,
  Loader2,
  Plus,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import type {
  AlternativeFraming,
  CounterArgument,
  IdentifiedAssumption,
  StanceClassification,
} from "~/server/ai";

interface UnitAIActionsMenuProps {
  unit: {
    id: string;
    content: string;
    unitType: string;
  };
  contextId?: string;
  targetUnit?: {
    id: string;
    content: string;
  };
  onCreateUnit?: (content: string, type: string) => void;
  onUpdateUnit?: (id: string, updates: { content?: string; unitType?: string }) => void;
}

type DialogType = "framing" | "counter" | "assumptions" | "stance" | "rules" | null;

export function UnitAIActionsMenu({
  unit,
  contextId,
  targetUnit,
  onCreateUnit,
  onUpdateUnit,
}: UnitAIActionsMenuProps) {
  const [activeDialog, setActiveDialog] = React.useState<DialogType>(null);

  // Mutations
  const utils = api.useUtils();
  const framingMutation = api.ai.generateAlternativeFraming.useMutation();
  const counterMutation = api.ai.suggestCounterArguments.useMutation();
  const assumptionsMutation = api.ai.identifyAssumptions.useMutation();
  const stanceMutation = api.ai.classifyStance.useMutation();
  const rulesMutation = api.proactive.scanRules.useMutation({
    onSuccess: () => {
      void utils.proposal.list.invalidate();
      void utils.proposal.countPending.invalidate();
      void utils.proactive.getBudgetStatus.invalidate();
    },
  });

  const handleFraming = () => {
    setActiveDialog("framing");
    framingMutation.mutate({
      content: unit.content,
      currentType: unit.unitType,
      contextId,
    });
  };

  const handleCounter = () => {
    setActiveDialog("counter");
    counterMutation.mutate({
      content: unit.content,
      unitType: unit.unitType,
      contextId,
    });
  };

  const handleAssumptions = () => {
    setActiveDialog("assumptions");
    assumptionsMutation.mutate({
      content: unit.content,
      contextId,
    });
  };

  const handleStance = () => {
    if (!targetUnit) return;
    setActiveDialog("stance");
    stanceMutation.mutate({
      unitContent: unit.content,
      targetContent: targetUnit.content,
      contextId,
    });
  };

  const handleRulesScan = () => {
    setActiveDialog("rules");
    rulesMutation.mutate({
      units: [
        {
          id: unit.id,
          unitType: unit.unitType,
          content: unit.content,
        },
      ],
      relations: [],
      contextId,
      dryRun: false,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">AI Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>AI Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleFraming}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Alternative Framing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCounter}>
            <MessageSquareWarning className="mr-2 h-4 w-4" />
            Suggest Counter-Arguments
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAssumptions}>
            <Lightbulb className="mr-2 h-4 w-4" />
            Identify Assumptions
          </DropdownMenuItem>
          {targetUnit && (
            <DropdownMenuItem onClick={handleStance}>
              <Scale className="mr-2 h-4 w-4" />
              Classify Stance
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRulesScan}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Scan Epistemic Rules
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Alternative Framing Dialog */}
      <Dialog open={activeDialog === "framing"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Alternative Framings
            </DialogTitle>
            <DialogDescription>
              Different ways to express the same idea
            </DialogDescription>
          </DialogHeader>
          <FramingResults
            data={framingMutation.data}
            isLoading={framingMutation.isPending}
            error={framingMutation.error?.message}
            onApply={(f) => {
              onUpdateUnit?.(unit.id, { content: f.reframedContent, unitType: f.newType });
              setActiveDialog(null);
            }}
            onCreateNew={(f) => {
              onCreateUnit?.(f.reframedContent, f.newType);
              setActiveDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Counter-Arguments Dialog */}
      <Dialog open={activeDialog === "counter"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              Counter-Arguments
            </DialogTitle>
            <DialogDescription>
              Challenges to strengthen your argument
            </DialogDescription>
          </DialogHeader>
          <CounterResults
            data={counterMutation.data}
            isLoading={counterMutation.isPending}
            error={counterMutation.error?.message}
            onCreateNew={(c) => {
              onCreateUnit?.(c.content, "counterargument");
              setActiveDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Assumptions Dialog */}
      <Dialog open={activeDialog === "assumptions"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Identified Assumptions
            </DialogTitle>
            <DialogDescription>
              Underlying premises in your reasoning
            </DialogDescription>
          </DialogHeader>
          <AssumptionsResults
            data={assumptionsMutation.data}
            isLoading={assumptionsMutation.isPending}
            error={assumptionsMutation.error?.message}
            onCreateNew={(a) => {
              onCreateUnit?.(a.content, "assumption");
              setActiveDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Stance Classification Dialog */}
      <Dialog open={activeDialog === "stance"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Stance Classification
            </DialogTitle>
            <DialogDescription>
              How this unit relates to the target
            </DialogDescription>
          </DialogHeader>
          <StanceResults
            data={stanceMutation.data}
            isLoading={stanceMutation.isPending}
            error={stanceMutation.error?.message}
          />
        </DialogContent>
      </Dialog>

      {/* Epistemic Rules Dialog */}
      <Dialog open={activeDialog === "rules"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Epistemic Rules Scan
            </DialogTitle>
            <DialogDescription>
              Violations detected and proposals surfaced through your daily budget
            </DialogDescription>
          </DialogHeader>
          <RulesScanResults
            data={rulesMutation.data}
            isLoading={rulesMutation.isPending}
            error={rulesMutation.error?.message}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Result Components ────────────────────────────────────────────────────

function FramingResults({
  data,
  isLoading,
  error,
  onApply,
  onCreateNew,
}: {
  data?: AlternativeFraming[];
  isLoading: boolean;
  error?: string;
  onApply: (f: AlternativeFraming) => void;
  onCreateNew: (f: AlternativeFraming) => void;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3 max-h-[400px] overflow-auto">
      {data.map((f, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
              {f.newType}
            </span>
            <span className="text-xs text-text-secondary">
              {Math.round(f.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm mb-2">{f.reframedContent}</p>
          <p className="text-xs text-text-secondary mb-3">{f.rationale}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onApply(f)}>
              <ChevronRight className="mr-1 h-3 w-3" />
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onCreateNew(f)}>
              <Plus className="mr-1 h-3 w-3" />
              Add as New
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CounterResults({
  data,
  isLoading,
  error,
  onCreateNew,
}: {
  data?: CounterArgument[];
  isLoading: boolean;
  error?: string;
  onCreateNew: (c: CounterArgument) => void;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3 max-h-[400px] overflow-auto">
      {data.map((c, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${c.strength * 100}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">
              {Math.round(c.strength * 100)}% strength
            </span>
          </div>
          <p className="text-sm mb-2">{c.content}</p>
          <p className="text-xs text-text-secondary mb-1">
            <strong>Targets:</strong> {c.targetsClaim}
          </p>
          <p className="text-xs text-text-secondary mb-3">{c.rationale}</p>
          <Button variant="ghost" size="sm" onClick={() => onCreateNew(c)}>
            <Plus className="mr-1 h-3 w-3" />
            Add as Unit
          </Button>
        </div>
      ))}
    </div>
  );
}

function AssumptionsResults({
  data,
  isLoading,
  error,
  onCreateNew,
}: {
  data?: IdentifiedAssumption[];
  isLoading: boolean;
  error?: string;
  onCreateNew: (a: IdentifiedAssumption) => void;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState />;

  const importanceColors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400",
    moderate: "bg-amber-500/20 text-amber-400",
    minor: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-auto">
      {data.map((a, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${importanceColors[a.importance]}`}
            >
              {a.importance}
            </span>
            <span className="text-xs text-text-secondary">
              {a.isExplicit ? "explicit" : "implicit"}
            </span>
          </div>
          <p className="text-sm mb-2">{a.content}</p>
          <p className="text-xs text-text-secondary mb-3">{a.rationale}</p>
          <Button variant="ghost" size="sm" onClick={() => onCreateNew(a)}>
            <Plus className="mr-1 h-3 w-3" />
            Add as Unit
          </Button>
        </div>
      ))}
    </div>
  );
}

function StanceResults({
  data,
  isLoading,
  error,
}: {
  data?: StanceClassification;
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState />;

  const stanceColors: Record<string, string> = {
    support: "text-green-500",
    oppose: "text-red-500",
    neutral: "text-gray-400",
    exploring: "text-blue-400",
  };

  const stanceIcons: Record<string, string> = {
    support: "Supports",
    oppose: "Opposes",
    neutral: "Neutral to",
    exploring: "Exploring",
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className={`text-2xl font-bold ${stanceColors[data.stance]}`}>
          {stanceIcons[data.stance]}
        </div>
        <div className="text-sm text-text-secondary mt-1">
          {Math.round(data.confidence * 100)}% confidence
        </div>
      </div>

      <div className="p-3 rounded-lg border border-border bg-bg-secondary">
        <p className="text-sm">{data.rationale}</p>
      </div>

      {data.keyIndicators.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            Key Indicators
          </div>
          <ul className="space-y-1">
            {data.keyIndicators.map((indicator, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-accent">•</span>
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type RulesScanData = NonNullable<
  ReturnType<typeof api.proactive.scanRules.useMutation>["data"]
>;

function RulesScanResults({
  data,
  isLoading,
  error,
}: {
  data: RulesScanData | undefined;
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState />;

  const violations = data.ruleResult.violations;

  if (violations.length === 0) {
    return (
      <div className="py-6 px-4 text-center space-y-2">
        <ShieldCheck className="h-8 w-8 mx-auto text-green-500" />
        <p className="text-sm font-medium">No violations detected</p>
        <p className="text-xs text-text-secondary">
          This unit passes all active epistemic rules.
        </p>
      </div>
    );
  }

  const severityStyle: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
    error: { icon: AlertCircle, className: "text-red-500 bg-red-500/10 border-red-500/30", label: "Error" },
    warning: { icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10 border-amber-500/30", label: "Warning" },
    info: { icon: Info, className: "text-blue-500 bg-blue-500/10 border-blue-500/30", label: "Info" },
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-auto">
      <div className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
        <span>
          <strong className="text-text-primary">{violations.length}</strong>{" "}
          violation{violations.length === 1 ? "" : "s"} found
        </span>
        <span>
          <strong className="text-text-primary">{data.surfaced}</strong>{" "}
          surfaced · <strong className="text-text-primary">{data.deferred}</strong> deferred
        </span>
      </div>
      {violations.map((v, i) => {
        const style = severityStyle[v.severity] ?? severityStyle.info!;
        const Icon = style.icon;
        return (
          <div
            key={i}
            className={`p-3 rounded-lg border ${style.className}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {style.label}
              </span>
              <span className="text-xs text-text-secondary">· {v.rule}</span>
            </div>
            <p className="text-sm">{v.message}</p>
          </div>
        );
      })}
      {data.surfaced > 0 && (
        <p className="text-xs text-text-secondary text-center pt-1">
          Actionable violations have been added to your proposal inbox.
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-text-secondary text-sm">
      No results found
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const isApiKey = message.includes("API") || message.includes("api-key") || message.includes("authentication");
  return (
    <div className="py-6 px-4 text-center">
      <div className="text-red-400 text-sm font-medium mb-2">AI request failed</div>
      <p className="text-xs text-text-secondary">
        {isApiKey
          ? "The Anthropic API key is missing or invalid. Update ANTHROPIC_API_KEY in your .env file."
          : message}
      </p>
    </div>
  );
}
