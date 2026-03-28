"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";

/* ─── Types ─── */

export type SearchLayer = "text" | "semantic" | "structure" | "temporal";

export interface SearchFilter {
  id: string;
  layer: SearchLayer;
  label: string;
  value: string;
  /** Raw filter syntax, e.g. type:claim, in:"Ethics" */
  raw: string;
}

export interface ParsedQuery {
  /** Raw text keywords */
  textKeywords: string[];
  /** Semantic concept matches */
  semanticConcepts: string[];
  /** Structural filters (type, relation, context) */
  structureFilters: SearchFilter[];
  /** Temporal range if detected */
  temporalRange: { since?: string; until?: string } | null;
}

export interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilter[];
  savedAt: number;
  newResultsSince: number;
}

interface SearchHistoryEntry {
  query: string;
  filters: SearchFilter[];
  timestamp: number;
}

/* ─── Filter Parsing ─── */

const FILTER_PATTERNS: {
  regex: RegExp;
  layer: SearchLayer;
  build: (match: RegExpMatchArray) => Omit<SearchFilter, "id">;
}[] = [
  {
    regex: /type:(\w+)/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `Type: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /in:"([^"]+)"/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `In: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /has:(\w+)/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `Has: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /since:(\d{4}-\d{2}(?:-\d{2})?)/gi,
    layer: "temporal",
    build: (m) => ({
      layer: "temporal",
      label: `Since: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /until:(\d{4}-\d{2}(?:-\d{2})?)/gi,
    layer: "temporal",
    build: (m) => ({
      layer: "temporal",
      label: `Until: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /status:(\w+)/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `Status: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /by:(me|ai)/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `By: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /assembly:(\w+)/gi,
    layer: "structure",
    build: (m) => ({
      layer: "structure",
      label: `Assembly: ${m[1]}`,
      value: m[1]!,
      raw: m[0]!,
    }),
  },
  {
    regex: /is:orphan/gi,
    layer: "structure",
    build: () => ({
      layer: "structure",
      label: "Is: orphan",
      value: "orphan",
      raw: "is:orphan",
    }),
  },
];

let filterIdCounter = 0;
function nextFilterId(): string {
  return `filter_${++filterIdCounter}_${Date.now()}`;
}

function parseQueryIntoFilters(raw: string): {
  filters: SearchFilter[];
  textQuery: string;
} {
  const filters: SearchFilter[] = [];
  let remaining = raw;

  for (const pattern of FILTER_PATTERNS) {
    let match: RegExpExecArray | null;
    // Reset regex state
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(raw)) !== null) {
      const built = pattern.build(match);
      filters.push({ id: nextFilterId(), ...built });
      remaining = remaining.replace(match[0]!, "");
    }
  }

  // Handle @ prefix as context filter
  const atMatch = remaining.match(/@(\S+)/);
  if (atMatch) {
    filters.push({
      id: nextFilterId(),
      layer: "structure",
      label: `In: ${atMatch[1]}`,
      value: atMatch[1]!,
      raw: atMatch[0]!,
    });
    remaining = remaining.replace(atMatch[0]!, "");
  }

  // Handle # prefix as tag filter
  const hashMatch = remaining.match(/#(\S+)/);
  if (hashMatch) {
    filters.push({
      id: nextFilterId(),
      layer: "structure",
      label: `Tag: ${hashMatch[1]}`,
      value: hashMatch[1]!,
      raw: hashMatch[0]!,
    });
    remaining = remaining.replace(hashMatch[0]!, "");
  }

  return { filters, textQuery: remaining.trim() };
}

function parseInterpretation(textQuery: string, filters: SearchFilter[]): ParsedQuery {
  const textKeywords = textQuery
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const semanticConcepts = textKeywords.length > 2
    ? [textKeywords.join(" ")]
    : [];

  const structureFilters = filters.filter((f) => f.layer === "structure");

  const sinceFilter = filters.find(
    (f) => f.layer === "temporal" && f.raw.startsWith("since:"),
  );
  const untilFilter = filters.find(
    (f) => f.layer === "temporal" && f.raw.startsWith("until:"),
  );

  const temporalRange =
    sinceFilter || untilFilter
      ? {
          since: sinceFilter?.value,
          until: untilFilter?.value,
        }
      : null;

  return { textKeywords, semanticConcepts, structureFilters, temporalRange };
}

/* ─── History / Saved Persistence ─── */

const HISTORY_KEY = "flowmind-search-history";
const SAVED_KEY = "flowmind-saved-searches";
const MAX_HISTORY = 20;

function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // storage full — silently ignore
  }
}

function loadSaved(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function persistSaved(entries: SavedSearch[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(entries));
  } catch {
    // storage full — silently ignore
  }
}

/* ─── Hook ─── */

export type SearchViewMode = "list" | "graph";

export function useSearch() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  /* ─── State ─── */
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<SearchFilter[]>([]);
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<SearchViewMode>("list");
  const [history, setHistory] = React.useState<SearchHistoryEntry[]>(loadHistory);
  const [savedSearches, setSavedSearches] = React.useState<SavedSearch[]>(loadSaved);

  /* ─── Debounce query ─── */
  React.useEffect(() => {
    const t = setTimeout(() => {
      const { filters: parsed, textQuery } = parseQueryIntoFilters(query);
      setFilters((prev) => {
        // Merge: keep manually added filters, replace parsed ones
        const manualFilters = prev.filter(
          (f) => !parsed.some((p) => p.raw === f.raw),
        );
        return [...manualFilters, ...parsed];
      });
      setDebouncedQuery(textQuery);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  /* ─── tRPC query ─── */
  const searchQuery = api.search.global.useQuery(
    {
      query: debouncedQuery,
      projectId: activeProjectId!,
      limit: 50,
    },
    {
      enabled: debouncedQuery.length >= 2 && !!activeProjectId,
    },
  );

  /* ─── Interpretation ─── */
  const interpretation = React.useMemo(
    () => parseInterpretation(debouncedQuery, filters),
    [debouncedQuery, filters],
  );

  /* ─── Add / remove filters ─── */
  const addFilter = React.useCallback((filter: Omit<SearchFilter, "id">) => {
    setFilters((prev) => [...prev, { id: nextFilterId(), ...filter }]);
  }, []);

  const removeFilter = React.useCallback((filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters([]);
  }, []);

  /* ─── History management ─── */
  const addToHistory = React.useCallback(
    (q: string, f: SearchFilter[]) => {
      if (!q.trim()) return;
      setHistory((prev) => {
        const next = [
          { query: q, filters: f, timestamp: Date.now() },
          ...prev.filter((h) => h.query !== q),
        ].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    },
    [],
  );

  const removeFromHistory = React.useCallback((timestamp: number) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.timestamp !== timestamp);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = React.useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  /* ─── Saved searches ─── */
  const saveSearch = React.useCallback(
    (q: string, f: SearchFilter[]) => {
      setSavedSearches((prev) => {
        const entry: SavedSearch = {
          id: `saved_${Date.now()}`,
          query: q,
          filters: f,
          savedAt: Date.now(),
          newResultsSince: 0,
        };
        const next = [entry, ...prev.filter((s) => s.query !== q)];
        persistSaved(next);
        return next;
      });
    },
    [],
  );

  const removeSavedSearch = React.useCallback((id: string) => {
    setSavedSearches((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSaved(next);
      return next;
    });
  }, []);

  /* ─── Execute search (add to history) ─── */
  const executeSearch = React.useCallback(
    (q: string, f: SearchFilter[]) => {
      setQuery(q);
      setFilters(f);
      addToHistory(q, f);
    },
    [addToHistory],
  );

  return {
    query,
    setQuery,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    results: searchQuery.data,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    interpretation,
    viewMode,
    setViewMode,
    history,
    removeFromHistory,
    clearHistory,
    savedSearches,
    saveSearch,
    removeSavedSearch,
    executeSearch,
  };
}

export type UseSearchReturn = ReturnType<typeof useSearch>;
