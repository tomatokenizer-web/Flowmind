"use client";

import * as React from "react";
import { X, Search, BookOpen, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import { useProjectId } from "~/contexts/project-context";

// ─── Category metadata ──────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { label: string; description: string; color: string }
> = {
  argument: {
    label: "Argument",
    description:
      "Logical relationships that connect claims, evidence, and reasoning.",
    color: "#3B82F6",
  },
  creative_research: {
    label: "Creative & Research",
    description:
      "Relationships for creative thinking, pattern recognition, and research workflows.",
    color: "#8B5CF6",
  },
  structure_containment: {
    label: "Structure & Containment",
    description:
      "Hierarchical and structural relationships for organizing knowledge.",
    color: "#10B981",
  },
  custom: {
    label: "Custom",
    description: "User-defined relation types specific to this project.",
    color: "#F59E0B",
  },
};

// ─── Relation type examples ─────────────────────────────────────────

const RELATION_EXAMPLES: Record<string, string> = {
  supports: '"Evidence A supports Claim B"',
  contradicts: '"Counter-argument X contradicts Claim Y"',
  derives_from: '"Conclusion C derives from Premise P"',
  expands: '"Detail D expands on Overview O"',
  references: '"Note N references Source S"',
  exemplifies: '"Case study E exemplifies Principle P"',
  defines: '"Definition D defines Term T"',
  questions: '"Question Q questions Assumption A"',
  inspires: '"Idea A inspires Concept B"',
  echoes: '"Pattern in A echoes Pattern in B"',
  transforms_into: '"Draft A transforms into Final B"',
  foreshadows: '"Scene A foreshadows Event B"',
  parallels: '"Structure in A parallels Structure in B"',
  contextualizes: '"Background A contextualizes Topic B"',
  operationalizes: '"Action A operationalizes Theory T"',
  contains: '"Chapter A contains Section B"',
  presupposes: '"Argument A presupposes Assumption B"',
  defined_by: '"Concept A defined by Definition B"',
  grounded_in: '"Theory A grounded in Evidence B"',
  instantiates: '"Example A instantiates Pattern B"',
  precedes: '"Step A precedes Step B"',
  supersedes: '"Version 2 supersedes Version 1"',
  complements: '"Perspective A complements Perspective B"',
};

// ─── Component ──────────────────────────────────────────────────────

interface RelationGlossaryProps {
  open: boolean;
  onClose: () => void;
}

export function RelationGlossary({ open, onClose }: RelationGlossaryProps) {
  const projectId = useProjectId();
  const trapRef = useFocusTrap<HTMLDivElement>({
    active: open,
    onEscape: onClose,
    returnFocus: true,
  });

  const [search, setSearch] = React.useState("");
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set(Object.keys(CATEGORY_META)));

  // Create custom type form state
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newTypeName, setNewTypeName] = React.useState("");
  const [newTypeDescription, setNewTypeDescription] = React.useState("");
  const [newTypeScope, setNewTypeScope] = React.useState<"private" | "shared">("shared");
  const [createError, setCreateError] = React.useState<string | null>(null);

  const utils = api.useUtils();

  const { data: stats, isLoading } = api.relationType.stats.useQuery(
    { projectId: projectId ?? undefined },
    { enabled: open },
  );

  const createCustomType = api.customRelationType.create.useMutation({
    onSuccess: () => {
      void utils.relationType.stats.invalidate({ projectId: projectId ?? undefined });
      setShowCreateForm(false);
      setNewTypeName("");
      setNewTypeDescription("");
      setNewTypeScope("shared");
      setCreateError(null);
    },
    onError: (err) => {
      setCreateError(err.message);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newTypeName.trim()) return;
    setCreateError(null);
    createCustomType.mutate({
      name: newTypeName.trim().toLowerCase().replace(/\s+/g, "_"),
      description: newTypeDescription.trim(),
      projectId,
      scope: newTypeScope,
      reusable: true,
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Build a flat list of all types for filtering
  const allTypes = React.useMemo(() => {
    if (!stats) return [];

    const types: Array<{
      name: string;
      description: string;
      category: string;
      usageCount: number;
      isCustom: boolean;
      example?: string;
    }> = [];

    // System types
    for (const [category, items] of Object.entries(stats.systemTypes)) {
      for (const item of items) {
        types.push({
          ...item,
          category,
          example: RELATION_EXAMPLES[item.name],
        });
      }
    }

    // Custom types
    for (const item of stats.customTypes) {
      types.push({
        ...item,
        example: undefined,
      });
    }

    return types;
  }, [stats]);

  // Filter by search
  const filteredTypes = React.useMemo(() => {
    if (!search.trim()) return allTypes;
    const q = search.toLowerCase();
    return allTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.example && t.example.toLowerCase().includes(q)),
    );
  }, [allTypes, search]);

  // Group filtered types by category
  const groupedFiltered = React.useMemo(() => {
    const groups = new Map<
      string,
      typeof filteredTypes
    >();
    for (const t of filteredTypes) {
      const cat = t.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(t);
    }
    return groups;
  }, [filteredTypes]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={trapRef}
            className={cn(
              "fixed left-1/2 top-[8%] z-50 w-full max-w-2xl",
              "rounded-card border border-border bg-bg-primary",
              "shadow-modal overflow-hidden",
            )}
            initial={{ opacity: 0, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-label="Relation Type Glossary"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent-primary" />
                <h2 className="text-base font-semibold text-text-primary">
                  Relation Type Glossary
                </h2>
                {stats && (
                  <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-text-tertiary">
                    {allTypes.length} types -- {stats.totalRelations} total
                    relations
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                  "transition-colors duration-fast",
                )}
                aria-label="Close glossary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-border px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search relation types..."
                  className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  aria-label="Search relation types"
                />
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
                </div>
              ) : groupedFiltered.size === 0 ? (
                <p className="py-8 text-center text-sm text-text-tertiary">
                  {search
                    ? "No relation types match your search."
                    : "No relation types found."}
                </p>
              ) : (
                Array.from(groupedFiltered.entries()).map(
                  ([category, types]) => {
                    const meta = CATEGORY_META[category] ?? {
                      label: category,
                      description: "",
                      color: "#6B7280",
                    };
                    const isExpanded = expandedCategories.has(category);

                    return (
                      <div key={category} className="mb-4 last:mb-0">
                        {/* Category header */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-bg-hover"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-text-tertiary" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-text-tertiary" />
                          )}
                          <span
                            className="inline-block h-3 w-3 rounded-sm"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="text-sm font-semibold text-text-primary">
                            {meta.label}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            ({types.length})
                          </span>
                        </button>

                        {isExpanded && (
                          <>
                            {meta.description && (
                              <p className="mb-2 ml-8 text-xs text-text-tertiary">
                                {meta.description}
                              </p>
                            )}
                            <div className="ml-2 space-y-1">
                              {types.map((type) => (
                                <div
                                  key={type.name}
                                  className="rounded-lg border border-border/60 px-3 py-2.5 hover:bg-bg-hover/50"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs font-medium text-text-primary">
                                        {type.name}
                                      </code>
                                      {type.isCustom && (
                                        <span className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-[10px] text-accent-primary">
                                          custom
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-xs",
                                        type.usageCount > 0
                                          ? "bg-accent-primary/10 text-accent-primary"
                                          : "bg-bg-secondary text-text-tertiary",
                                      )}
                                    >
                                      {type.usageCount}{" "}
                                      {type.usageCount === 1
                                        ? "use"
                                        : "uses"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-text-secondary">
                                    {type.description}
                                  </p>
                                  {type.example && (
                                    <p className="mt-1 text-xs italic text-text-tertiary">
                                      e.g. {type.example}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  },
                )
              )}

              {/* Create custom type section */}
              {projectId && (
                <div className="mt-4 border-t border-border pt-4">
                  {!showCreateForm ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border",
                        "py-3 text-sm text-text-secondary transition-colors",
                        "hover:border-accent-primary/50 hover:bg-bg-hover hover:text-text-primary",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      )}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create custom type
                    </button>
                  ) : (
                    <form onSubmit={handleCreateSubmit} className="space-y-3 rounded-xl border border-border bg-bg-secondary p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        New custom relation type
                      </p>

                      {/* Name */}
                      <div className="space-y-1">
                        <label htmlFor="custom-type-name" className="text-xs text-text-secondary">
                          Name <span className="text-accent-error">*</span>
                        </label>
                        <input
                          id="custom-type-name"
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="e.g. critiques, extends, motivates"
                          required
                          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                        <p className="text-[11px] text-text-tertiary">
                          Spaces will become underscores. Must not conflict with system types.
                        </p>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label htmlFor="custom-type-desc" className="text-xs text-text-secondary">
                          Description
                        </label>
                        <input
                          id="custom-type-desc"
                          type="text"
                          value={newTypeDescription}
                          onChange={(e) => setNewTypeDescription(e.target.value)}
                          placeholder="What does this relation express?"
                          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                      </div>

                      {/* Scope */}
                      <div className="space-y-1">
                        <label htmlFor="custom-type-scope" className="text-xs text-text-secondary">
                          Scope
                        </label>
                        <select
                          id="custom-type-scope"
                          value={newTypeScope}
                          onChange={(e) => setNewTypeScope(e.target.value as "private" | "shared")}
                          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        >
                          <option value="shared">Shared — visible to all collaborators</option>
                          <option value="private">Private — only visible to you</option>
                        </select>
                      </div>

                      {/* Error */}
                      {createError && (
                        <p className="rounded-lg border border-accent-error/20 bg-red-50 px-3 py-2 text-xs text-accent-error">
                          {createError}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false);
                            setCreateError(null);
                            setNewTypeName("");
                            setNewTypeDescription("");
                          }}
                          className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newTypeName.trim() || createCustomType.isPending}
                          className={cn(
                            "rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-medium text-white",
                            "hover:bg-accent-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                        >
                          {createCustomType.isPending ? "Creating…" : "Create"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
