"use client";

import * as React from "react";
import { Plus, X, Tag as TagIcon, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";

interface TagData {
  id: string;
  name: string;
  color: string | null;
}

interface TagChipsProps {
  unitId: string;
  projectId?: string;
  tags: TagData[];
  compact?: boolean;
  className?: string;
}

export function TagChips({ unitId, projectId, tags, compact, className }: TagChipsProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopoverOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [popoverOpen]);

  if (compact && tags.length === 0) return null;

  return (
    <div ref={ref} className={cn("relative inline-flex items-center gap-1 flex-wrap", className)} onClick={(e) => e.stopPropagation()}>
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} unitId={unitId} />
      ))}
      {projectId && (
        <button
          type="button"
          onClick={() => setPopoverOpen((p) => !p)}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
            "border border-dashed border-border text-text-tertiary",
            "hover:border-accent-primary hover:text-accent-primary transition-colors",
          )}
          aria-label="Add tag"
        >
          <Plus className="h-2.5 w-2.5" />
          {tags.length === 0 && <span>Tag</span>}
        </button>
      )}
      {popoverOpen && projectId && (
        <TagAssignPopover
          unitId={unitId}
          projectId={projectId}
          assignedTagIds={new Set(tags.map((t) => t.id))}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </div>
  );
}

function TagChip({ tag, unitId }: { tag: TagData; unitId: string }) {
  const utils = api.useUtils();
  const removeMutation = api.tag.remove.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
      void utils.tag.getByUnit.invalidate({ unitId });
    },
    onError: () => toast.error("Failed to remove tag"),
  });

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
      style={{
        backgroundColor: tag.color ? `${tag.color}15` : undefined,
        color: tag.color ?? undefined,
        border: `1px solid ${tag.color ? `${tag.color}30` : "var(--border)"}`,
      }}
    >
      {tag.name}
      <button
        type="button"
        onClick={() => removeMutation.mutate({ unitId, tagId: tag.id })}
        className="ml-0.5 rounded-full p-0.5 opacity-50 hover:opacity-100 transition-opacity"
        aria-label={`Remove tag ${tag.name}`}
      >
        <X className="h-2 w-2" />
      </button>
    </span>
  );
}

function TagAssignPopover({
  unitId,
  projectId,
  assignedTagIds,
  onClose,
}: {
  unitId: string;
  projectId: string;
  assignedTagIds: Set<string>;
  onClose: () => void;
}) {
  const [newTagName, setNewTagName] = React.useState("");
  const utils = api.useUtils();

  const { data: allTags = [], isLoading } = api.tag.list.useQuery({ projectId });

  const assignMutation = api.tag.assign.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
      void utils.tag.getByUnit.invalidate({ unitId });
      void utils.tag.list.invalidate({ projectId });
    },
    onError: () => toast.error("Failed to assign tag"),
  });

  const createMutation = api.tag.create.useMutation({
    onSuccess: (newTag) => {
      assignMutation.mutate({ unitId, tagId: newTag.id });
      setNewTagName("");
    },
    onError: (err) => toast.error("Failed to create tag", { description: err.message }),
  });

  const unassignedTags = allTags.filter((t) => !assignedTagIds.has(t.id));

  const handleCreateAndAssign = () => {
    const name = newTagName.trim();
    if (!name) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      assignMutation.mutate({ unitId, tagId: existing.id });
      setNewTagName("");
    } else {
      createMutation.mutate({ name, projectId });
    }
  };

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary p-2 shadow-modal">
      <div className="flex items-center gap-1.5 mb-2">
        <TagIcon className="h-3 w-3 text-text-tertiary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Tags</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
        </div>
      ) : (
        <>
          {unassignedTags.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-0.5 mb-2">
              {unassignedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    assignMutation.mutate({ unitId, tagId: tag.id });
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color ?? "var(--text-tertiary)" }}
                  />
                  {tag.name}
                  <span className="ml-auto text-[10px] text-text-tertiary">{tag._count?.units ?? 0}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 border-t border-border pt-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreateAndAssign(); }
                if (e.key === "Escape") { e.preventDefault(); onClose(); }
              }}
              placeholder="New tag..."
              className="flex-1 rounded border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateAndAssign}
              disabled={!newTagName.trim()}
              className="rounded bg-accent-primary px-2 py-1 text-[10px] font-medium text-white disabled:opacity-40 hover:bg-accent-primary/90"
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}
