"use client";

import { useState, useCallback, useMemo } from "react";
import type { UnitCardUnit } from "~/components/domain/unit";

/* ─── Types ─── */

export type NavigatorMode = "query" | "path" | "selection";

export type PathType =
  | "argument"
  | "causal"
  | "temporal"
  | "associative"
  | "containment"
  | "cross-context";

export type TraversalMode = "depth-first" | "breadth-first" | "guided";

export interface PathNode {
  unitId: string;
  /** The relation type that led to this node */
  relationFromPrevious?: string;
  /** Layer of the relation */
  relationLayer?: string;
  /** Whether this node has been visited */
  visited: boolean;
  /** Available branches from this node */
  branches: BranchOption[];
}

export interface BranchOption {
  unitId: string;
  relationType: string;
  relationLayer?: string;
  /** Brief description derived from the unit content */
  preview?: string;
}

interface NavigatorState {
  mode: NavigatorMode;
  pathType: PathType;
  traversalMode: TraversalMode;
  path: PathNode[];
  currentStepIndex: number;
  startUnitIds: string[];
  isActive: boolean;
  /** View toggle for the results */
  viewMode: "list" | "reading";
}

interface NavigatorActions {
  setMode: (mode: NavigatorMode) => void;
  setPathType: (type: PathType) => void;
  setTraversalMode: (mode: TraversalMode) => void;
  setViewMode: (mode: "list" | "reading") => void;
  startNavigation: (startUnitIds: string[]) => void;
  stopNavigation: () => void;
  goForward: () => void;
  goBack: () => void;
  goToStep: (index: number) => void;
  takeBranch: (branchUnitId: string) => void;
  appendToPath: (node: PathNode) => void;
  setPath: (path: PathNode[]) => void;
}

export type UseNavigatorReturn = NavigatorState & NavigatorActions & {
  currentNode: PathNode | null;
  canGoForward: boolean;
  canGoBack: boolean;
  visitedCount: number;
  totalCount: number;
};

/* ─── Relation type mappings for each path type ─── */

export const PATH_TYPE_RELATIONS: Record<PathType, string[]> = {
  argument: ["supports", "contradicts", "rebuts", "qualifies", "concedes"],
  causal: ["causes", "enables", "prevents", "inhibits", "triggers"],
  temporal: ["precedes", "follows", "concurrent_with", "during"],
  associative: ["analogous_to", "echoes", "parallels", "resonates_with"],
  containment: ["contains", "part_of", "subsumes", "belongs_to"],
  "cross-context": ["recontextualizes", "appears_in", "referenced_by"],
};

/* ─── Hook ─── */

export function useNavigator(): UseNavigatorReturn {
  const [state, setState] = useState<NavigatorState>({
    mode: "query",
    pathType: "argument",
    traversalMode: "depth-first",
    path: [],
    currentStepIndex: -1,
    startUnitIds: [],
    isActive: false,
    viewMode: "list",
  });

  const setMode = useCallback((mode: NavigatorMode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  const setPathType = useCallback((pathType: PathType) => {
    setState((s) => ({ ...s, pathType }));
  }, []);

  const setTraversalMode = useCallback((traversalMode: TraversalMode) => {
    setState((s) => ({ ...s, traversalMode }));
  }, []);

  const setViewMode = useCallback((viewMode: "list" | "reading") => {
    setState((s) => ({ ...s, viewMode }));
  }, []);

  const startNavigation = useCallback((startUnitIds: string[]) => {
    const initialNodes: PathNode[] = startUnitIds.map((id, i) => ({
      unitId: id,
      visited: i === 0,
      branches: [],
    }));

    setState((s) => ({
      ...s,
      startUnitIds,
      path: initialNodes,
      currentStepIndex: initialNodes.length > 0 ? 0 : -1,
      isActive: true,
    }));
  }, []);

  const stopNavigation = useCallback(() => {
    setState((s) => ({
      ...s,
      path: [],
      currentStepIndex: -1,
      startUnitIds: [],
      isActive: false,
    }));
  }, []);

  const goForward = useCallback(() => {
    setState((s) => {
      if (s.currentStepIndex >= s.path.length - 1) return s;
      const nextIndex = s.currentStepIndex + 1;
      const updatedPath = [...s.path];
      updatedPath[nextIndex] = { ...updatedPath[nextIndex]!, visited: true };
      return { ...s, path: updatedPath, currentStepIndex: nextIndex };
    });
  }, []);

  const goBack = useCallback(() => {
    setState((s) => {
      if (s.currentStepIndex <= 0) return s;
      return { ...s, currentStepIndex: s.currentStepIndex - 1 };
    });
  }, []);

  const goToStep = useCallback((index: number) => {
    setState((s) => {
      if (index < 0 || index >= s.path.length) return s;
      const updatedPath = [...s.path];
      // Mark all nodes up to the target as visited
      for (let i = 0; i <= index; i++) {
        updatedPath[i] = { ...updatedPath[i]!, visited: true };
      }
      return { ...s, path: updatedPath, currentStepIndex: index };
    });
  }, []);

  const takeBranch = useCallback((branchUnitId: string) => {
    setState((s) => {
      // Find the branch info from the current node
      const currentNode = s.path[s.currentStepIndex];
      if (!currentNode) return s;

      const branch = currentNode.branches.find(
        (b) => b.unitId === branchUnitId,
      );

      const newNode: PathNode = {
        unitId: branchUnitId,
        relationFromPrevious: branch?.relationType,
        relationLayer: branch?.relationLayer,
        visited: true,
        branches: [],
      };

      // Truncate path after current position and add new node
      const truncatedPath = s.path.slice(0, s.currentStepIndex + 1);
      truncatedPath.push(newNode);

      return {
        ...s,
        path: truncatedPath,
        currentStepIndex: truncatedPath.length - 1,
      };
    });
  }, []);

  const appendToPath = useCallback((node: PathNode) => {
    setState((s) => ({
      ...s,
      path: [...s.path, node],
    }));
  }, []);

  const setPath = useCallback((path: PathNode[]) => {
    setState((s) => ({
      ...s,
      path,
      currentStepIndex: path.length > 0 ? 0 : -1,
      isActive: path.length > 0,
    }));
  }, []);

  const currentNode = useMemo(
    () => state.path[state.currentStepIndex] ?? null,
    [state.path, state.currentStepIndex],
  );

  const canGoForward = state.currentStepIndex < state.path.length - 1;
  const canGoBack = state.currentStepIndex > 0;
  const visitedCount = state.path.filter((n) => n.visited).length;
  const totalCount = state.path.length;

  return {
    ...state,
    currentNode,
    canGoForward,
    canGoBack,
    visitedCount,
    totalCount,
    setMode,
    setPathType,
    setTraversalMode,
    setViewMode,
    startNavigation,
    stopNavigation,
    goForward,
    goBack,
    goToStep,
    takeBranch,
    appendToPath,
    setPath,
  };
}
