"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Clock,
  Layers,
  FileText,
  Plus,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSelectionStore } from "~/stores/selectionStore";
import { useLayoutStore } from "~/stores/layout-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { usePanelStore } from "~/stores/panel-store";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import type { UnitType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  projectId?: string;
  contextId?: string;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  section: "recent" | "contexts" | "actions";
}

// ─── Command Palette Store ───────────────────────────────────────────

let globalOpenFn: (() => void) | null = null;

export function openCommandPalette() {
  globalOpenFn?.();
}

// ─── Command Palette ─────────────────────────────────────────────────

export function CommandPalette({ projectId, contextId }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const setSelectedUnit = useSelectionStore((s) => s.setSelectedUnit);
  const openPanel = usePanelStore((s) => s.openPanel);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);

  // Register global open function
  React.useEffect(() => {
    globalOpenFn = () => setOpen(true);
    return () => {
      globalOpenFn = null;
    };
  }, []);

  // Cmd+K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset state on open
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search results
  const { data: searchResults } = api.search.query.useQuery(
    {
      query: debouncedQuery,
      projectId: projectId ?? "",
      contextId,
      layers: ["text"],
      limit: 10,
    },
    {
      enabled: !!projectId && debouncedQuery.length >= 2,
    },
  );

  // Recent units (last visited)
  const { data: recentUnits } = api.unit.list.useQuery(
    {
      projectId: projectId ?? "",
      limit: 5,
      sortBy: "modifiedAt",
      sortOrder: "desc",
    },
    {
      enabled: !!projectId && !debouncedQuery,
    },
  );

  // Contexts list
  const { data: contexts } = api.context.list.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId && !debouncedQuery },
  );

  // Quick actions
  const quickActions: CommandItem[] = React.useMemo(
    () => [
      {
        id: "new-unit",
        label: "Create new thought",
        icon: Plus,
        section: "actions" as const,
        action: () => {
          // Trigger capture mode - will be wired to capture store
          setOpen(false);
        },
      },
      {
        id: "switch-canvas",
        label: "Switch to Canvas view",
        icon: LayoutGrid,
        section: "actions" as const,
        action: () => {
          setViewMode("canvas");
          setOpen(false);
        },
      },
      {
        id: "switch-graph",
        label: "Switch to Graph view",
        icon: Layers,
        section: "actions" as const,
        action: () => {
          setViewMode("graph");
          setOpen(false);
        },
      },
    ],
    [setViewMode],
  );

  // Build items list
  const items = React.useMemo(() => {
    const result: Array<{
      id: string;
      label: string;
      sublabel?: string;
      icon: React.ElementType;
      section: string;
      unitType?: UnitType;
      action: () => void;
    }> = [];

    if (debouncedQuery && searchResults?.length) {
      // Search results
      for (const r of searchResults) {
        result.push({
          id: r.unitId,
          label: r.content.slice(0, 60) + (r.content.length > 60 ? "..." : ""),
          sublabel: `Matched in ${r.matchLayer}`,
          icon: FileText,
          section: "Search Results",
          unitType: r.unitType,
          action: () => {
            setSelectedUnit(r.unitId);
            openPanel(r.unitId);
            setOpen(false);
          },
        });
      }
    } else {
      // Recent units
      if (recentUnits?.items.length) {
        for (const unit of recentUnits.items.slice(0, 5)) {
          result.push({
            id: unit.id,
            label: unit.content.slice(0, 60) + (unit.content.length > 60 ? "..." : ""),
            icon: Clock,
            section: "Recent",
            unitType: unit.unitType,
            action: () => {
              setSelectedUnit(unit.id);
              openPanel(unit.id);
              setOpen(false);
            },
          });
        }
      }

      // Contexts
      if (contexts?.length) {
        for (const ctx of contexts.slice(0, 5)) {
          result.push({
            id: ctx.id,
            label: ctx.name,
            sublabel: ctx.description ?? undefined,
            icon: Layers,
            section: "Contexts",
            action: () => {
              setActiveContext(ctx.id);
              setViewMode("canvas");
              setOpen(false);
            },
          });
        }
      }

      // Quick actions
      for (const action of quickActions) {
        result.push({
          id: action.id,
          label: action.label,
          icon: action.icon,
          section: "Quick Actions",
          action: action.action,
        });
      }
    }

    return result;
  }, [
    debouncedQuery,
    searchResults,
    recentUnits,
    contexts,
    quickActions,
    setSelectedUnit,
  ]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          items[selectedIndex]?.action();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items, selectedIndex]);

  // Scroll selected item into view
  React.useEffect(() => {
    const item = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Group items by section
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section]!.push(item);
    }
    return groups;
  }, [items]);

  let globalIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <AnimatePresence>
          {open && (
            <>
              {/* Overlay */}
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              </DialogPrimitive.Overlay>

              {/* Content */}
              <DialogPrimitive.Content asChild>
                <motion.div
                  className={cn(
                    "fixed left-1/2 top-[15%] z-50 w-full max-w-xl",
                    "bg-bg-primary border border-border rounded-xl",
                    "shadow-modal overflow-hidden",
                    "focus:outline-none",
                  )}
                  initial={{ opacity: 0, scale: 0.95, x: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%" }}
                  exit={{ opacity: 0, scale: 0.95, x: "-50%" }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Search input */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <Search className="h-5 w-5 text-text-tertiary flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedIndex(0);
                      }}
                      placeholder="Search thoughts, contexts, or actions..."
                      className={cn(
                        "flex-1 bg-transparent text-text-primary",
                        "placeholder:text-text-tertiary",
                        "focus:outline-none",
                        "text-base",
                      )}
                      aria-label="Command palette search"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary text-xs text-text-tertiary">
                      esc
                    </kbd>
                  </div>

                  {/* Results */}
                  <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto p-2"
                    role="listbox"
                  >
                    {items.length === 0 ? (
                      <div className="py-8 text-center text-text-tertiary">
                        {debouncedQuery
                          ? "No results found"
                          : "Start typing to search..."}
                      </div>
                    ) : (
                      Object.entries(groupedItems).map(([section, sectionItems]) => (
                        <div key={section} className="mb-2 last:mb-0">
                          <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                            {section}
                          </div>
                          {sectionItems.map((item) => {
                            globalIndex++;
                            const isSelected = globalIndex === selectedIndex;
                            const currentIndex = globalIndex;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                data-index={currentIndex}
                                onClick={() => item.action()}
                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                                  "text-left transition-colors duration-fast",
                                  "focus-visible:outline-none",
                                  isSelected
                                    ? "bg-accent-primary/10 text-accent-primary"
                                    : "text-text-primary hover:bg-bg-hover",
                                )}
                                role="option"
                                aria-selected={isSelected}
                              >
                                {item.unitType ? (
                                  <UnitTypeBadge unitType={item.unitType} />
                                ) : (
                                  <item.icon className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm">{item.label}</div>
                                  {item.sublabel && (
                                    <div className="truncate text-xs text-text-tertiary">
                                      {item.sublabel}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <ArrowRight className="h-4 w-4 text-text-tertiary" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-bg-secondary/50 text-xs text-text-tertiary">
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary">↑↓</kbd>
                      navigate
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary">↵</kbd>
                      select
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary">esc</kbd>
                      close
                    </span>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
