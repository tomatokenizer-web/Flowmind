"use client";

import { useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";

// ─── Tree Node Type ─────────────────────────────────────────────────

export interface ContextTreeNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  projectId: string;
  sortOrder: number;
  unitCount: number;
  children: ContextTreeNode[];
}

// ─── Build tree from flat list ──────────────────────────────────────

function buildTree(
  contexts: Array<{
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    projectId: string;
    sortOrder: number;
    _count: { unitContexts: number };
    children: Array<{ id: string }>;
  }>,
): ContextTreeNode[] {
  const nodeMap = new Map<string, ContextTreeNode>();

  // Create all nodes first
  for (const ctx of contexts) {
    nodeMap.set(ctx.id, {
      id: ctx.id,
      name: ctx.name,
      description: ctx.description,
      parentId: ctx.parentId,
      projectId: ctx.projectId,
      sortOrder: ctx.sortOrder,
      unitCount: ctx._count.unitContexts,
      children: [],
    });
  }

  // Build hierarchy
  const roots: ContextTreeNode[] = [];
  for (const ctx of contexts) {
    const node = nodeMap.get(ctx.id)!;
    if (ctx.parentId && nodeMap.has(ctx.parentId)) {
      nodeMap.get(ctx.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by sortOrder, then by name as tiebreaker
  function sortChildren(nodes: ContextTreeNode[]) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }
  sortChildren(roots);

  return roots;
}

// ─── Flatten tree for DnD sortable list ─────────────────────────────

export interface FlattenedNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  unitCount: number;
  hasChildren: boolean;
}

function flattenTree(
  nodes: ContextTreeNode[],
  expandedNodes: Set<string>,
  depth = 0,
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      depth,
      unitCount: node.unitCount,
      hasChildren: node.children.length > 0,
    });
    if (node.children.length > 0 && expandedNodes.has(node.id)) {
      result.push(...flattenTree(node.children, expandedNodes, depth + 1));
    }
  }
  return result;
}

// ─── Hook ───────────────────────────────────────────────────────────

interface UseContextTreeOptions {
  projectId: string | undefined;
}

export function useContextTree({ projectId }: UseContextTreeOptions) {
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const expandedNodes = useSidebarStore((s) => s.expandedNodes);
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const toggleNode = useSidebarStore((s) => s.toggleNode);

  const { data: contexts, isLoading, refetch } = api.context.list.useQuery(
    { projectId: projectId },
    { enabled: !!projectId },
  );

  const tree = useMemo(
    () => (contexts ? buildTree(contexts) : []),
    [contexts],
  );

  const flatNodes = useMemo(
    () => flattenTree(tree, expandedNodes),
    [tree, expandedNodes],
  );

  const utils = api.useUtils();

  const createMutation = api.context.create.useMutation({
    onSuccess: () => {
      void utils.context.list.invalidate();
    },
  });

  const updateMutation = api.context.update.useMutation({
    onSuccess: () => {
      void utils.context.list.invalidate();
    },
  });

  const deleteMutation = api.context.delete.useMutation({
    onSuccess: () => {
      void utils.context.list.invalidate();
    },
  });

  const createContext = useCallback(
    async (name: string, parentId?: string) => {
      if (!projectId) return;
      return createMutation.mutateAsync({
        name,
        projectId,
        parentId,
      });
    },
    [projectId, createMutation],
  );

  const renameContext = useCallback(
    async (id: string, name: string) => {
      return updateMutation.mutateAsync({ id, name });
    },
    [updateMutation],
  );

  const deleteContext = useCallback(
    async (id: string) => {
      if (activeContextId === id) {
        setActiveContext(null);
      }
      return deleteMutation.mutateAsync({ id });
    },
    [deleteMutation, activeContextId, setActiveContext],
  );

  const reorderMutation = api.context.reorder.useMutation({
    // Optimistically reorder contexts in cache immediately on drag end
    onMutate: async ({ orderedIds, projectId: mutProjectId, parentId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await utils.context.list.cancel({ projectId: mutProjectId });

      // Snapshot current cache value for rollback
      const previousContexts = utils.context.list.getData({ projectId: mutProjectId });

      // Apply optimistic update: reassign sortOrder based on orderedIds
      if (previousContexts) {
        utils.context.list.setData({ projectId: mutProjectId }, (old) => {
          if (!old) return old;
          // Build a map of id -> new sort order (siblings only)
          const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
          return old.map((ctx) => {
            const newOrder = orderMap.get(ctx.id);
            // Only update sortOrder for contexts being reordered (same parent group)
            if (newOrder !== undefined && ctx.parentId === (parentId ?? null)) {
              return { ...ctx, sortOrder: newOrder };
            }
            return ctx;
          });
        });
      }

      return { previousContexts, mutProjectId };
    },
    // Rollback on error using the snapshot
    onError: (_err, _vars, context) => {
      if (context?.previousContexts !== undefined) {
        utils.context.list.setData(
          { projectId: context.mutProjectId },
          context.previousContexts,
        );
      }
    },
    // Always refetch after settle to sync with server truth
    onSettled: (_data, _err, { projectId: mutProjectId }) => {
      void utils.context.list.invalidate({ projectId: mutProjectId });
    },
  });

  const moveMutation = api.context.move.useMutation({
    onSuccess: () => {
      void utils.context.list.invalidate();
    },
  });

  const reorderContexts = useCallback(
    async (orderedIds: string[], parentId: string | null) => {
      if (!projectId) return;
      return reorderMutation.mutateAsync({
        orderedIds,
        projectId,
        parentId,
      });
    },
    [projectId, reorderMutation],
  );

  const moveContext = useCallback(
    async (id: string, newParentId: string | null) => {
      if (!projectId) return;
      return moveMutation.mutateAsync({
        id,
        newParentId,
        projectId,
      });
    },
    [projectId, moveMutation],
  );

  return {
    tree,
    flatNodes,
    isLoading,
    activeContextId,
    expandedNodes,
    setActiveContext,
    toggleNode,
    createContext,
    renameContext,
    deleteContext,
    reorderContexts,
    moveContext,
    refetch,
  };
}
