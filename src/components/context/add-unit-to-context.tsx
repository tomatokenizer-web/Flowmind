"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, Search, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

interface AddUnitToContextProps {
  contextId: string;
  projectId: string;
  /** Called after a unit is successfully added */
  onAdded?: () => void;
}

/**
 * "+" button that opens a search popover showing units NOT in the current context.
 * Calls trpc.context.addUnit with optimistic UI.
 */
export function AddUnitToContext({
  contextId,
  projectId,
  onAdded,
}: AddUnitToContextProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const utils = api.useUtils();

  // All units in the project
  const { data: allUnits, isLoading: loadingAll } = api.unit.list.useQuery(
    { projectId, limit: 100 },
    { enabled: open },
  );

  // Units already in this context
  const { data: contextUnits, isLoading: loadingCtx } =
    api.context.getUnitsForContext.useQuery(
      { id: contextId },
      { enabled: open },
    );

  const contextUnitIds = React.useMemo(
    () => new Set((contextUnits ?? []).map((u: { id: string }) => u.id)),
    [contextUnits],
  );

  // Filter: not in context + matches search
  const candidates = React.useMemo(() => {
    const items = allUnits?.items ?? [];
    return items.filter(
      (u) =>
        !contextUnitIds.has(u.id) &&
        (search === "" ||
          u.content.toLowerCase().includes(search.toLowerCase())),
    );
  }, [allUnits, contextUnitIds, search]);

  const addUnit = api.context.addUnit.useMutation({
    // Optimistic: immediately refetch the context units list
    onSuccess: async () => {
      await utils.unit.list.invalidate({ projectId });
      await utils.context.getUnitsForContext.invalidate({ id: contextId });
      await utils.context.getById.invalidate({ id: contextId });
      onAdded?.();
      setOpen(false);
    },
  });

  const isLoading = loadingAll || loadingCtx;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Add unit to context"
          title="Add unit to context"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Unit</span>
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-80 rounded-xl border border-border bg-bg-surface shadow-lg",
            "p-3 outline-none",
          )}
          sideOffset={6}
          align="end"
        >
          {/* Search input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              autoFocus
              type="text"
              placeholder="Search units…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm",
                "text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-primary",
              )}
            />
          </div>

          {/* Candidate list */}
          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">
                {search ? "No matching units" : "All units are already in this context"}
              </p>
            ) : (
              <ul className="space-y-1">
                {candidates.map((unit) => (
                  <li key={unit.id}>
                    <button
                      type="button"
                      disabled={addUnit.isPending}
                      onClick={() =>
                        addUnit.mutate({ unitId: unit.id, contextId })
                      }
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        "text-text-primary hover:bg-bg-hover",
                        "focus:outline-none focus:bg-bg-hover",
                        "transition-colors duration-fast",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      <span className="line-clamp-2">{unit.content}</span>
                      <span className="mt-0.5 block text-xs text-text-tertiary capitalize">
                        {unit.unitType}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
