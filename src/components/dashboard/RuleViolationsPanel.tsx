"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Loader2,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "~/components/ui/button";

interface RuleViolationsPanelProps {
  projectId: string;
  contextId?: string;
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Warning" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", label: "Info" },
} as const;

const ACTION_LABELS: Record<string, string> = {
  add_confidence: "Add Confidence Score",
  add_counterargument: "Add Counterargument",
  add_evidence: "Add Evidence",
  soften_certainty: "Soften Language",
  add_assumption_disclosure: "Disclose Assumption",
  break_cycle: "Break Reasoning Cycle",
};

type ScanResult = {
  ruleResult?: { violations: Array<{ rule: string; severity: string; message: string }> };
  candidates: Array<{ payload?: Record<string, unknown> }>;
  surfaced: number;
  deferred: number;
  deduplicated: number;
};

export function RuleViolationsPanel({ projectId, contextId }: RuleViolationsPanelProps) {
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);

  // Fetch units for the context (or project) to feed into the rules scan
  const unitsQuery = api.unit.list.useQuery(
    { projectId, contextId, limit: 100 },
    { enabled: !!projectId },
  );

  const unitItems = React.useMemo(() => {
    if (!unitsQuery.data) return [];
    // unit.list returns { items, nextCursor } or plain array depending on router version
    if (Array.isArray(unitsQuery.data)) return unitsQuery.data as { id: string; content: string; unitType: string }[];
    if ("items" in unitsQuery.data) return (unitsQuery.data as { items: { id: string; content: string; unitType: string }[] }).items;
    return [];
  }, [unitsQuery.data]);

  const unitIds = React.useMemo(() => unitItems.map((u) => u.id), [unitItems]);

  // Fetch relations for the loaded units
  const relationsQuery = api.relation.listByUnits.useQuery(
    { unitIds, contextId },
    { enabled: unitIds.length > 0 },
  );

  const scanMutation = api.proactive.scanRules.useMutation({
    onSuccess: (data) => setScanResult(data as unknown as ScanResult),
  });

  const runScan = React.useCallback(() => {
    const units = unitItems.map((u) => ({
      id: u.id,
      unitType: u.unitType,
      content: u.content,
    }));
    if (units.length === 0) return;

    const relations = (relationsQuery.data ?? []).map((r) => ({
      subtype: r.type,
      sourceId: r.sourceUnitId,
      targetId: r.targetUnitId,
    }));

    scanMutation.mutate({
      units,
      relations,
      contextId,
      dryRun: true,
    });
  }, [unitItems, relationsQuery.data, contextId, scanMutation]);

  // Auto-scan when units load
  const hasScanned = React.useRef(false);
  React.useEffect(() => {
    if (!hasScanned.current && unitItems.length > 0) {
      hasScanned.current = true;
      runScan();
    }
  }, [unitItems, runScan]);

  const isLoading = unitsQuery.isLoading || scanMutation.isPending;

  if (isLoading && !scanResult) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="text-xs text-text-tertiary">Checking epistemic rules...</span>
      </div>
    );
  }

  if (!scanResult && unitItems.length === 0) {
    return null; // No units to scan
  }

  const violations = scanResult?.ruleResult?.violations ?? [];
  const candidates = scanResult?.candidates ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Rule Check</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { hasScanned.current = false; runScan(); }}
          disabled={scanMutation.isPending}
          className="h-7 text-xs"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", scanMutation.isPending && "animate-spin")} /> Rescan
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 text-xs">
        {(["error", "warning", "info"] as const).map((sev) => {
          const count = violations.filter((v) => v.severity === sev).length;
          if (count === 0) return null;
          const config = SEVERITY_CONFIG[sev];
          const SevIcon = config.icon;
          return (
            <span key={sev} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", config.bg, config.color)}>
              <SevIcon className="h-3 w-3" />
              {count}
            </span>
          );
        })}
        {violations.length === 0 && scanResult && (
          <span className="text-green-500 text-xs flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> All rules pass
          </span>
        )}
      </div>

      {/* Violations list (compact) */}
      {violations.length > 0 && (
        <div className="space-y-1.5">
          {violations.slice(0, 5).map((violation, idx) => {
            const sevKey = violation.severity as keyof typeof SEVERITY_CONFIG;
            const config = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG.info;
            const SevIcon = config.icon;

            const matchingCandidate = candidates.find(
              (c) => typeof c.payload === "object" && c.payload !== null && (c.payload as Record<string, unknown>).rule === violation.rule,
            );
            const action = matchingCandidate?.payload as { action?: string; suggestion?: string } | undefined;

            return (
              <div key={idx} className={cn("rounded p-2 text-xs", config.bg)}>
                <div className="flex items-start gap-1.5">
                  <SevIcon className={cn("h-3 w-3 mt-0.5 shrink-0", config.color)} />
                  <div className="min-w-0">
                    <span className="text-text-primary">{violation.message}</span>
                    {action?.action && (
                      <span className="ml-2 text-accent">
                        {ACTION_LABELS[action.action] ?? action.action}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {violations.length > 5 && (
            <div className="text-xs text-text-tertiary text-center">
              +{violations.length - 5} more violations
            </div>
          )}
        </div>
      )}
    </div>
  );
}
