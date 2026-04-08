"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Search,
  Database,
  GitBranch,
  Clock,
  Layers,
  Play,
  Loader2,
  Filter,
  Network,
  GitCompare,
  Route,
  Combine,
  Sparkles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

interface GraphQueryPanelProps {
  projectId: string;
  contextId?: string;
}

type MethodKey =
  | "structural"
  | "topological"
  | "temporal"
  | "semantic"
  | "aggregation"
  | "attribute"
  | "path"
  | "comparative"
  | "composite";

const METHOD_META: Record<
  MethodKey,
  { label: string; icon: React.ReactNode; description: string }
> = {
  structural: { label: "Structural", icon: <Database size={14} />, description: "Filter by type, lifecycle, scope" },
  semantic: { label: "Semantic", icon: <Search size={14} />, description: "Text similarity search" },
  topological: { label: "Topological", icon: <Network size={14} />, description: "Graph analysis metrics" },
  temporal: { label: "Temporal", icon: <Clock size={14} />, description: "Time-based retrieval" },
  aggregation: { label: "Aggregation", icon: <Layers size={14} />, description: "Group and summarize" },
  attribute: { label: "Attribute", icon: <Filter size={14} />, description: "Filter by metadata" },
  path: { label: "Path", icon: <Route size={14} />, description: "Graph traversal" },
  comparative: { label: "Comparative", icon: <GitCompare size={14} />, description: "Diff two contexts" },
  composite: { label: "Composite", icon: <Combine size={14} />, description: "Chain methods" },
};

const UNIT_TYPES = ["claim", "evidence", "question", "concept", "assumption", "principle", "observation", "synthesis"] as const;
const LIFECYCLES = ["seed", "growing", "mature", "dormant", "archived"] as const;
const TOPO_METRICS = ["centrality", "bridge_units", "orphans", "clusters"] as const;
const PERIODS = ["today", "this_week", "this_month", "custom"] as const;
const GROUP_BY = ["unitType", "lifecycle", "epistemicAct"] as const;

const UNIT_TYPE_COLORS: Record<string, string> = {
  claim: "bg-blue-500/15 text-blue-400",
  evidence: "bg-green-500/15 text-green-400",
  question: "bg-yellow-500/15 text-yellow-400",
  concept: "bg-purple-500/15 text-purple-400",
  assumption: "bg-orange-500/15 text-orange-400",
  principle: "bg-cyan-500/15 text-cyan-400",
  observation: "bg-pink-500/15 text-pink-400",
  synthesis: "bg-indigo-500/15 text-indigo-400",
};

const inputCls = "w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none";
const btnCls = "rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50";
const labelCls = "block text-xs font-medium text-text-secondary mb-1";

// ─── Component ─────────────────────────────────────────────────────

export function GraphQueryPanel({ projectId, contextId }: GraphQueryPanelProps) {
  const [method, setMethod] = React.useState<MethodKey>("structural");

  // Structural params
  const [unitType, setUnitType] = React.useState("");
  const [lifecycle, setLifecycle] = React.useState("");

  // Topological params
  const [topoMetric, setTopoMetric] = React.useState<typeof TOPO_METRICS[number]>("centrality");

  // Temporal params
  const [period, setPeriod] = React.useState<typeof PERIODS[number]>("this_week");

  // Semantic params
  const [searchText, setSearchText] = React.useState("");

  // Aggregation params
  const [groupBy, setGroupBy] = React.useState<typeof GROUP_BY[number]>("unitType");

  // Attribute params
  const [importanceMin, setImportanceMin] = React.useState(0);
  const [importanceMax, setImportanceMax] = React.useState(1);
  const [flagged, setFlagged] = React.useState(false);

  // Path params
  const [pathUnitId, setPathUnitId] = React.useState("");
  const [pathDirection, setPathDirection] = React.useState<"ancestors" | "descendants" | "both">("both");
  const [pathMaxDepth, setPathMaxDepth] = React.useState(5);

  // Comparative params
  const [contextIdA, setContextIdA] = React.useState("");
  const [contextIdB, setContextIdB] = React.useState("");

  // NL search bar state
  const [nlQuery, setNlQuery] = React.useState("");
  const [pendingNlRun, setPendingNlRun] = React.useState(false);

  function handleNlSearch() {
    if (!nlQuery.trim()) return;
    const q = nlQuery.toLowerCase();

    // Classify locally (mirrors server classifyNL logic for instant UX)
    if (/\b(today|yesterday|this week|this month|recent|latest|new|created)\b/.test(q)) {
      const p = /today|yesterday/.test(q) ? "today" : /this week/.test(q) ? "this_week" : "this_month";
      setMethod("temporal");
      setPeriod(p as typeof period);
    } else if (/\b(central|hub|bridge|connect|orphan|isolated|cluster|communit)/.test(q)) {
      const m = /bridge|connect/.test(q) ? "bridge_units" : /orphan|isolated/.test(q) ? "orphans" : /cluster|communit/.test(q) ? "clusters" : "centrality";
      setMethod("topological");
      setTopoMetric(m as typeof topoMetric);
    } else if (/\b(how many|count|distribut|breakdown|summary|statistic|group)\b/.test(q)) {
      setMethod("aggregation");
    } else if (/\b(claim|evidence|question|concept|definition|note)\b/.test(q) && /\b(find|show|list|all|get)\b/.test(q)) {
      const typeMatch = q.match(/\b(claim|evidence|question|concept|definition|note|analogy|example|summary)\b/);
      if (typeMatch) setUnitType(typeMatch[1]!);
      setMethod("structural");
    } else if (/\b(important|salient|flagged|pinned)\b/.test(q)) {
      setMethod("attribute");
      setImportanceMin(0.7);
    } else {
      setMethod("semantic");
      setSearchText(nlQuery);
    }
    setPendingNlRun(true);
  }

  // ─── Query hooks (enabled: false, triggered by refetch) ──────────

  const structural = api.graphQuery.structural.useQuery(
    { projectId, unitType: unitType || undefined, lifecycle: lifecycle || undefined, contextId },
    { enabled: false },
  );

  const topological = api.graphQuery.topological.useQuery(
    { projectId, metric: topoMetric, contextId },
    { enabled: false },
  );

  const temporal = api.graphQuery.temporal.useQuery(
    { projectId, period },
    { enabled: false },
  );

  const semantic = api.graphQuery.semantic.useQuery(
    { projectId, text: searchText || undefined, contextId },
    { enabled: false },
  );

  const aggregation = api.graphQuery.aggregation.useQuery(
    { projectId, groupBy, contextId },
    { enabled: false },
  );

  const attribute = api.graphQuery.attribute.useQuery(
    { projectId, importanceMin, importanceMax, flagged: flagged || undefined },
    { enabled: false },
  );

  const path = api.graphQuery.path.useQuery(
    { unitId: pathUnitId || "00000000-0000-0000-0000-000000000000", direction: pathDirection, maxDepth: pathMaxDepth },
    { enabled: false },
  );

  const comparative = api.graphQuery.comparative.useQuery(
    { projectId, contextIdA: contextIdA || "00000000-0000-0000-0000-000000000000", contextIdB: contextIdB || "00000000-0000-0000-0000-000000000000" },
    { enabled: false },
  );

  // ─── Derived state ──────────────────────────────────────────────

  const queryMap = { structural, topological, temporal, semantic, aggregation, attribute, path, comparative } as const;
  const activeQuery = method !== "composite" ? queryMap[method] : null;
  const isLoading = activeQuery?.isFetching ?? false;

  // Extract items from the current result
  const resultData = activeQuery?.data as { items?: Array<{ id: string; content: string; unitType: string; importance: number; score?: number }>; count?: number; data?: Record<string, unknown> } | undefined;
  const items = resultData?.items ?? [];
  const count = resultData?.count ?? items.length;
  const aggregationData = resultData?.data;

  function handleRun() {
    if (method === "composite") return;
    void queryMap[method].refetch();
  }

  // Auto-run after NL classification sets params
  React.useEffect(() => {
    if (pendingNlRun) {
      setPendingNlRun(false);
      handleRun();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNlRun, method]);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-bg-surface">
      {/* Header with NL search */}
      <div className="border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-accent-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Graph Query</h2>
        </div>
        <div className="relative">
          <Sparkles size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNlSearch()}
            placeholder="Ask in natural language... e.g. 'show all claims' or 'what was created today'"
            className="w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Method tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        {(Object.entries(METHOD_META) as [MethodKey, typeof METHOD_META[MethodKey]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              method === key
                ? "bg-accent-primary/10 text-accent-primary"
                : "text-text-tertiary hover:bg-bg-hover hover:text-text-secondary",
            )}
          >
            {meta.icon}
            {meta.label}
          </button>
        ))}
      </div>

      {/* Parameter form */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-text-tertiary">
          {METHOD_META[method].description}
        </p>

        {method === "structural" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Unit Type</label>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className={inputCls}>
                <option value="">All types</option>
                {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Lifecycle</label>
              <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)} className={inputCls}>
                <option value="">All stages</option>
                {LIFECYCLES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        {method === "semantic" && (
          <div>
            <label className={labelCls}>Search Text</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Enter search query..."
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
            />
          </div>
        )}

        {method === "topological" && (
          <div>
            <label className={labelCls}>Metric</label>
            <select value={topoMetric} onChange={(e) => setTopoMetric(e.target.value as typeof topoMetric)} className={inputCls}>
              {TOPO_METRICS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </div>
        )}

        {method === "temporal" && (
          <div>
            <label className={labelCls}>Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className={inputCls}>
              {PERIODS.map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
            </select>
          </div>
        )}

        {method === "aggregation" && (
          <div>
            <label className={labelCls}>Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className={inputCls}>
              {GROUP_BY.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        {method === "attribute" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Importance Min</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={importanceMin}
                  onChange={(e) => setImportanceMin(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Importance Max</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={importanceMax}
                  onChange={(e) => setImportanceMax(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => setFlagged(e.target.checked)}
                className="rounded border-border"
              />
              Flagged only
            </label>
          </div>
        )}

        {method === "path" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Unit ID</label>
              <input
                type="text"
                value={pathUnitId}
                onChange={(e) => setPathUnitId(e.target.value)}
                placeholder="UUID of starting unit"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Direction</label>
              <select value={pathDirection} onChange={(e) => setPathDirection(e.target.value as typeof pathDirection)} className={inputCls}>
                <option value="ancestors">Ancestors</option>
                <option value="descendants">Descendants</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Max Depth</label>
              <input
                type="number"
                min={1}
                max={10}
                value={pathMaxDepth}
                onChange={(e) => setPathMaxDepth(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {method === "comparative" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Context A</label>
              <input
                type="text"
                value={contextIdA}
                onChange={(e) => setContextIdA(e.target.value)}
                placeholder="Context UUID"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Context B</label>
              <input
                type="text"
                value={contextIdB}
                onChange={(e) => setContextIdB(e.target.value)}
                placeholder="Context UUID"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {method === "composite" && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-bg-secondary p-6">
            <p className="text-sm text-text-tertiary">Coming soon -- chain multiple query methods together</p>
          </div>
        )}

        {/* Run button */}
        <div className="mt-4">
          <button
            onClick={handleRun}
            disabled={isLoading || method === "composite"}
            className={cn(btnCls, "inline-flex items-center gap-2")}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run Query
          </button>
        </div>
      </div>

      {/* Results area */}
      <div className="border-t border-border px-4 py-3">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-accent-primary" />
          </div>
        )}

        {!isLoading && activeQuery?.data && method === "aggregation" && aggregationData && (
          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">Aggregation results</p>
            <div className="space-y-1">
              {Object.entries(aggregationData).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-1.5 text-sm">
                  <span className="text-text-primary">{key}</span>
                  <span className="font-mono text-text-tertiary">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && activeQuery?.data && method !== "aggregation" && items.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              {count} result{count !== 1 ? "s" : ""} found
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-sm"
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                      UNIT_TYPE_COLORS[item.unitType] ?? "bg-bg-primary text-text-tertiary",
                    )}
                  >
                    {item.unitType}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">
                    {item.content.length > 80 ? item.content.slice(0, 80) + "..." : item.content}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-text-tertiary">
                    {item.importance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && activeQuery?.data && method !== "aggregation" && items.length === 0 && (
          <p className="py-4 text-center text-sm text-text-tertiary">
            No results. Try adjusting your query parameters.
          </p>
        )}

        {!isLoading && !activeQuery?.data && method !== "composite" && (
          <p className="py-4 text-center text-sm text-text-tertiary">
            Configure parameters above and click Run.
          </p>
        )}
      </div>
    </div>
  );
}
