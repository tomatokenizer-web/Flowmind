"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Eye, Edit3, Plus, Download, Loader2, Layers, ArrowLeft } from "lucide-react";
import { useLayoutStore } from "~/stores/layout-store";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useAssemblyStore } from "~/stores/assemblyStore";
import { usePanelStore } from "~/stores/panel-store";
import { Button } from "~/components/ui/button";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import type { UnitType } from "@prisma/client";
import { ExportDialog } from "./ExportDialog";
import { SourceMapPanel } from "./SourceMapPanel";

// ─── Sortable Card ────────────────────────────────────────────────

interface AssemblyItemData {
  id: string;
  unitId: string;
  position: number;
  slotName?: string | null;
  bridgeText: string | null;
  unit: {
    id: string;
    content: string;
    unitType: string;
    lifecycle?: string;
  } | null;
}

function SortableUnitCard({
  item,
  assemblyId,
  onRemove,
  isDragging,
  onOpenPanel,
}: {
  item: AssemblyItemData;
  assemblyId: string;
  onRemove: (unitId: string) => void;
  isDragging: boolean;
  onOpenPanel: (unitId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const bridgeText = useAssemblyStore((s) => s.bridgeTexts[item.unitId] ?? "");
  const setBridgeText = useAssemblyStore((s) => s.setBridgeText);

  const updateBridgeText = api.assembly.updateBridgeText.useMutation();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group relative rounded-xl border border-border bg-bg-primary p-4 shadow-resting",
          "transition-shadow duration-150",
          isDragging && "border-dashed shadow-none",
        )}
      >
        {/* Position number */}
        <span className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary text-xs font-medium text-white">
          {item.position}
        </span>

        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Content */}
          <button
            type="button"
            onClick={() => onOpenPanel(item.unitId)}
            className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
            title="Open unit details"
          >
            {item.slotName && (
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent-primary">
                {item.slotName}
              </p>
            )}
            {item.unit && <UnitTypeBadge unitType={item.unit.unitType as UnitType} />}
            <p className="mt-1.5 line-clamp-3 text-sm text-text-primary">{item.unit?.content ?? ""}</p>
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.unitId)}
            className="shrink-0 rounded-lg p-1 text-text-tertiary opacity-0 transition-all group-hover:opacity-100 hover:bg-bg-hover hover:text-accent-danger"
            aria-label="Remove from assembly"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bridge text zone */}
      <div className="relative mx-8 my-1">
        {bridgeText ? (
          <textarea
            data-bridge={item.unitId}
            value={bridgeText}
            onChange={(e) => setBridgeText(item.unitId, e.target.value)}
            onBlur={(e) =>
              updateBridgeText.mutate({
                assemblyId,
                unitId: item.unitId,
                bridgeText: e.target.value || null,
              })
            }
            placeholder="Bridge text (AI-generated or type your own)..."
            rows={2}
            className="w-full resize-none rounded-lg border border-dashed border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
          />
        ) : (
          <button
            data-bridge={item.unitId}
            onClick={(e) => (e.currentTarget as HTMLElement).focus()}
            className="w-full rounded-lg border border-dashed border-transparent py-1 text-xs text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:border-border hover:text-text-secondary"
          >
            + Add bridge text
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

interface UnitBrowserProps {
  projectId: string;
  assemblyId: string;
  existingUnitIds: Set<string>;
}

function UnitBrowser({ projectId, assemblyId, existingUnitIds }: UnitBrowserProps) {
  const [search, setSearch] = React.useState("");
  const utils = api.useUtils();

  const { data: unitsData } = api.unit.list.useQuery({ projectId, limit: 50 });
  const addUnit = api.assembly.addUnit.useMutation({
    onSuccess: () => utils.assembly.getById.invalidate({ id: assemblyId }),
  });

  const filtered = (unitsData?.items ?? []).filter(
    (u) => !existingUnitIds.has(u.id) &&
      (search === "" || u.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-bg-secondary">
      <div className="p-3 border-b border-border">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">Add Units</p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units..."
          className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-tertiary">
            {search ? "No matching units" : "All units added"}
          </p>
        ) : filtered.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => addUnit.mutate({ assemblyId, unitId: u.id })}
            className="w-full rounded-lg bg-bg-primary p-2 text-left text-xs hover:bg-bg-hover transition-colors"
          >
            <span className="block capitalize text-accent-primary mb-0.5">{u.unitType}</span>
            <span className="line-clamp-2 text-text-primary">{u.content}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface AssemblyBoardProps {
  assemblyId: string;
  projectId: string;
}

export function AssemblyBoard({ assemblyId, projectId }: AssemblyBoardProps) {
  const [isPreview, setIsPreview] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [localItems, setLocalItems] = React.useState<AssemblyItemData[]>([]);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const openPanel = usePanelStore((s) => s.openPanel);

  const utils = api.useUtils();

  const { data: assembly, isLoading } = api.assembly.getById.useQuery({ id: assemblyId });

  React.useEffect(() => {
    if (assembly?.items) {
      const validItems = assembly.items
        .filter((item): item is typeof item & { unitId: string } => item.unitId !== null)
        .map((item) => item as unknown as AssemblyItemData);
      setLocalItems(validItems);
    }
  }, [assembly?.items]);

  const reorderMutation = api.assembly.reorderUnits.useMutation({
    onSuccess: () => utils.assembly.getById.invalidate({ id: assemblyId }),
  });

  const removeUnitMutation = api.assembly.removeUnit.useMutation({
    onSuccess: () => utils.assembly.getById.invalidate({ id: assemblyId }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Persist
        void reorderMutation.mutateAsync({
          assemblyId,
          orderedUnitIds: reordered.map((i) => i.unitId),
        });
        return reordered;
      });
    }
  }

  const activeItem = localItems.find((i) => i.id === activeId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-80 animate-pulse rounded-xl bg-bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!assembly) return null;

  return (
    <div className="flex h-full">
      {/* Left rail — unit browser */}
      {!isPreview && (
        <UnitBrowser
          projectId={projectId}
          assemblyId={assemblyId}
          existingUnitIds={new Set(localItems.map((i) => i.unitId))}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("canvas")}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            title="Back to units"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">{assembly.name}</h2>
          {(assembly as { description?: string }).description && (
            <p className="text-sm text-text-secondary">{(assembly as { description?: string }).description}</p>
          )}
          <p className="text-xs text-text-tertiary">{localItems.length} units</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            aria-pressed={isPreview}
          >
            {isPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto p-6">
        {localItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Layers className="h-10 w-10 text-text-tertiary" />
            <p className="font-medium text-text-secondary">No units yet</p>
            <p className="text-sm text-text-tertiary">Add units from the sidebar to build your assembly</p>
          </div>
        ) : isPreview ? (
          /* Preview mode — read-only */
          <div className="mx-auto max-w-2xl space-y-6">
            {localItems.map((item) => {
              const bridgeText = useAssemblyStore.getState().bridgeTexts[item.unitId];
              return (
                <div key={item.id}>
                  {item.slotName && (
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-primary">
                      {item.slotName}
                    </h3>
                  )}
                  <p className="text-base leading-relaxed text-text-primary">{item.unit?.content ?? ""}</p>
                  {bridgeText && (
                    <p className="mt-2 text-sm italic text-text-secondary">{bridgeText}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Edit mode — drag and drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mx-auto max-w-2xl space-y-2">
                {localItems.map((item) => (
                  <SortableUnitCard
                    key={item.id}
                    item={item}
                    assemblyId={assemblyId}
                    isDragging={activeId === item.id}
                    onOpenPanel={openPanel}
                    onRemove={(unitId) =>
                      removeUnitMutation.mutate({ assemblyId, unitId })
                    }
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeItem && (
                <div className="rounded-xl border border-accent-primary bg-bg-primary p-4 opacity-80 shadow-lg">
                  <p className="line-clamp-2 text-sm text-text-primary">{activeItem.unit?.content ?? ""}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Source Map — collapsible panel showing origin breakdown */}
      <div className="border-t border-border px-6 py-3">
        <SourceMapPanel assemblyId={assemblyId} />
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        assemblyId={assemblyId}
        assemblyName={assembly.name}
      />
      </div>
    </div>
  );
}
