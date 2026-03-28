"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

export type RhetoricalFrame =
  | "argument"
  | "narrative"
  | "analysis"
  | "comparison"
  | "synthesis";

export type AssemblyItemRole =
  | "claim"
  | "support"
  | "example"
  | "transition"
  | "conclusion"
  | "thesis"
  | "evidence"
  | "counterargument"
  | "rebuttal"
  | "setting"
  | "inciting_event"
  | "rising_action"
  | "climax"
  | "resolution"
  | "introduction"
  | "category"
  | "cross_analysis"
  | "subject_a"
  | "subject_b"
  | "criteria"
  | "synthesis"
  | "source"
  | "theme"
  | "integration"
  | "new_insight";

export interface AssemblyItem {
  id: string;
  unitId: string;
  unit: UnitCardUnit;
  position: number;
  assemblyRole: AssemblyItemRole | string;
  bridgeText: string;
}

export interface TemplateSlot {
  id: string;
  label: string;
  role: AssemblyItemRole | string;
  required: boolean;
  /** Allow multiple units in this slot */
  multiple: boolean;
  /** Mapped item IDs */
  mappedItemIds: string[];
}

export interface AssemblyTemplate {
  frame: RhetoricalFrame;
  label: string;
  slots: Omit<TemplateSlot, "mappedItemIds">[];
}

export interface AssemblyEditorState {
  items: AssemblyItem[];
  name: string;
  frame: RhetoricalFrame | null;
  template: AssemblyTemplate | null;
  templateSlots: TemplateSlot[];
  isLoading: boolean;
  isDirty: boolean;
  moveItem: (activeId: string, overId: string) => void;
  addItem: (unit: UnitCardUnit, position?: number) => void;
  removeItem: (itemId: string) => void;
  updateRole: (itemId: string, role: string) => void;
  updateAnnotation: (itemId: string, bridgeText: string) => void;
  setName: (name: string) => void;
  setFrame: (frame: RhetoricalFrame | null) => void;
  applyTemplate: (frame: RhetoricalFrame) => void;
  clearTemplate: () => void;
  mapSlot: (slotId: string, itemId: string) => void;
  unmapSlot: (slotId: string, itemId: string) => void;
  save: () => void;
  exportAssembly: () => void;
}

/* ─── Templates ─── */

export const ASSEMBLY_TEMPLATES: AssemblyTemplate[] = [
  {
    frame: "argument",
    label: "Argument",
    slots: [
      { id: "thesis", label: "Thesis", role: "thesis", required: true, multiple: false },
      { id: "evidence", label: "Evidence", role: "evidence", required: true, multiple: true },
      { id: "counterargument", label: "Counterargument", role: "counterargument", required: false, multiple: true },
      { id: "rebuttal", label: "Rebuttal", role: "rebuttal", required: false, multiple: true },
      { id: "conclusion", label: "Conclusion", role: "conclusion", required: true, multiple: false },
    ],
  },
  {
    frame: "narrative",
    label: "Narrative",
    slots: [
      { id: "setting", label: "Setting", role: "setting", required: true, multiple: false },
      { id: "inciting_event", label: "Inciting Event", role: "inciting_event", required: true, multiple: false },
      { id: "rising_action", label: "Rising Action", role: "rising_action", required: true, multiple: true },
      { id: "climax", label: "Climax", role: "climax", required: true, multiple: false },
      { id: "resolution", label: "Resolution", role: "resolution", required: true, multiple: false },
    ],
  },
  {
    frame: "analysis",
    label: "Analysis",
    slots: [
      { id: "introduction", label: "Introduction", role: "introduction", required: true, multiple: false },
      { id: "category", label: "Categories", role: "category", required: true, multiple: true },
      { id: "cross_analysis", label: "Cross-Analysis", role: "cross_analysis", required: false, multiple: false },
      { id: "conclusion", label: "Conclusion", role: "conclusion", required: true, multiple: false },
    ],
  },
  {
    frame: "comparison",
    label: "Comparison",
    slots: [
      { id: "subject_a", label: "Subject A", role: "subject_a", required: true, multiple: false },
      { id: "subject_b", label: "Subject B", role: "subject_b", required: true, multiple: false },
      { id: "criteria", label: "Criteria", role: "criteria", required: true, multiple: true },
      { id: "synthesis", label: "Synthesis", role: "synthesis", required: true, multiple: false },
    ],
  },
  {
    frame: "synthesis",
    label: "Synthesis",
    slots: [
      { id: "source", label: "Sources", role: "source", required: true, multiple: true },
      { id: "theme", label: "Themes", role: "theme", required: true, multiple: true },
      { id: "integration", label: "Integration", role: "integration", required: true, multiple: false },
      { id: "new_insight", label: "New Insight", role: "new_insight", required: true, multiple: false },
    ],
  },
];

/* ─── Debounce Helper ─── */

function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  ) as T;
}

/* ─── Hook ─── */

export function useAssemblyEditor(assemblyId: string | null): AssemblyEditorState {
  const [items, setItems] = React.useState<AssemblyItem[]>([]);
  const [name, setNameState] = React.useState("");
  const [frame, setFrameState] = React.useState<RhetoricalFrame | null>(null);
  const [template, setTemplate] = React.useState<AssemblyTemplate | null>(null);
  const [templateSlots, setTemplateSlots] = React.useState<TemplateSlot[]>([]);
  const [isDirty, setIsDirty] = React.useState(false);

  /* Queries */
  const assemblyQuery = api.assembly.getById.useQuery(
    { id: assemblyId! },
    { enabled: !!assemblyId },
  );

  const updateMutation = api.assembly.update.useMutation();
  const addItemMutation = api.assembly.addItem.useMutation();
  const removeItemMutation = api.assembly.removeItem.useMutation();
  const reorderMutation = api.assembly.reorderItems.useMutation();
  const updateItemMutation = api.assembly.updateItem.useMutation();
  const exportMutation = api.assembly.export.useMutation();

  /* Sync from server */
  React.useEffect(() => {
    if (!assemblyQuery.data) return;
    const data = assemblyQuery.data;
    setNameState(data.name ?? "");
    setFrameState((data.rhetoricalShape as RhetoricalFrame | null) ?? null);
    setItems(
      (data.items ?? [])
        .filter((item) => item.unitId != null)
        .map((item, index) => ({
          id: item.id,
          unitId: item.unitId!,
          unit: item.unit as unknown as UnitCardUnit,
          position: item.position ?? index,
          assemblyRole: item.assemblyRole ?? "support",
          bridgeText: item.bridgeText ?? "",
        })),
    );
    setIsDirty(false);
  }, [assemblyQuery.data]);

  /* Debounced auto-save */
  const debouncedSave = useDebouncedCallback(() => {
    if (!assemblyId || !isDirty) return;
    updateMutation.mutate({
      id: assemblyId,
      name,
      rhetoricalShape: frame ?? undefined,
    });
    setIsDirty(false);
  }, 1000);

  React.useEffect(() => {
    if (isDirty) debouncedSave();
  }, [isDirty, debouncedSave]);

  /* Item operations */
  const moveItem = React.useCallback(
    (activeId: string, overId: string) => {
      setItems((prev) => {
        const activeIndex = prev.findIndex((i) => i.id === activeId);
        const overIndex = prev.findIndex((i) => i.id === overId);
        if (activeIndex === -1 || overIndex === -1) return prev;

        const next = [...prev];
        const [moved] = next.splice(activeIndex, 1);
        if (!moved) return prev;
        next.splice(overIndex, 0, moved);

        // Update positions
        const reordered = next.map((item, idx) => ({ ...item, position: idx }));

        // Persist reorder
        if (assemblyId) {
          reorderMutation.mutate({
            assemblyId,
            items: reordered.map((i) => ({ itemId: i.id, position: i.position })),
          });
        }

        return reordered;
      });
      setIsDirty(true);
    },
    [assemblyId, reorderMutation],
  );

  const addItem = React.useCallback(
    (unit: UnitCardUnit, position?: number) => {
      const newPosition = position ?? items.length;
      const tempId = `temp-${Date.now()}`;

      const newItem: AssemblyItem = {
        id: tempId,
        unitId: unit.id,
        unit,
        position: newPosition,
        assemblyRole: "support",
        bridgeText: "",
      };

      setItems((prev) => {
        const next = [...prev];
        next.splice(newPosition, 0, newItem);
        return next.map((item, idx) => ({ ...item, position: idx }));
      });

      if (assemblyId) {
        addItemMutation.mutate(
          {
            assemblyId,
            unitId: unit.id,
            position: newPosition,
            assemblyRole: "support",
          },
          {
            onSuccess: () => {
              void assemblyQuery.refetch();
            },
          },
        );
      }
      setIsDirty(true);
    },
    [assemblyId, items.length, addItemMutation, assemblyQuery],
  );

  const removeItem = React.useCallback(
    (itemId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== itemId);
        return next.map((item, idx) => ({ ...item, position: idx }));
      });

      removeItemMutation.mutate({ itemId });
      setIsDirty(true);
    },
    [removeItemMutation],
  );

  const updateRole = React.useCallback(
    (itemId: string, role: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, assemblyRole: role } : item)),
      );

      updateItemMutation.mutate({ itemId, assemblyRole: role });
      setIsDirty(true);
    },
    [updateItemMutation],
  );

  const updateAnnotation = React.useCallback(
    (itemId: string, bridgeText: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, bridgeText } : item,
        ),
      );

      updateItemMutation.mutate({ itemId, bridgeText });
      setIsDirty(true);
    },
    [updateItemMutation],
  );

  /* Frame and template */
  const setFrame = React.useCallback((newFrame: RhetoricalFrame | null) => {
    setFrameState(newFrame);
    setIsDirty(true);
  }, []);

  const setName = React.useCallback((newName: string) => {
    setNameState(newName);
    setIsDirty(true);
  }, []);

  const applyTemplate = React.useCallback(
    (templateFrame: RhetoricalFrame) => {
      const tmpl = ASSEMBLY_TEMPLATES.find((t) => t.frame === templateFrame);
      if (!tmpl) return;

      setTemplate(tmpl);
      setFrameState(templateFrame);

      // Build slots with auto-mapping
      const slots: TemplateSlot[] = tmpl.slots.map((slot) => {
        // Auto-map: match items whose assemblyRole matches the slot role
        const matched = items
          .filter((item) => item.assemblyRole === slot.role)
          .map((item) => item.id);

        return {
          ...slot,
          mappedItemIds: slot.multiple ? matched : matched.slice(0, 1),
        };
      });

      setTemplateSlots(slots);
      setIsDirty(true);
    },
    [items],
  );

  const clearTemplate = React.useCallback(() => {
    setTemplate(null);
    setTemplateSlots([]);
  }, []);

  const mapSlot = React.useCallback(
    (slotId: string, itemId: string) => {
      setTemplateSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== slotId) return slot;
          if (slot.multiple) {
            return {
              ...slot,
              mappedItemIds: [...slot.mappedItemIds, itemId],
            };
          }
          return { ...slot, mappedItemIds: [itemId] };
        }),
      );
    },
    [],
  );

  const unmapSlot = React.useCallback(
    (slotId: string, itemId: string) => {
      setTemplateSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== slotId) return slot;
          return {
            ...slot,
            mappedItemIds: slot.mappedItemIds.filter((id) => id !== itemId),
          };
        }),
      );
    },
    [],
  );

  const save = React.useCallback(() => {
    if (!assemblyId) return;
    updateMutation.mutate({
      id: assemblyId,
      name,
      rhetoricalShape: frame ?? undefined,
    });
    setIsDirty(false);
  }, [assemblyId, name, frame, updateMutation]);

  const exportAssembly = React.useCallback(() => {
    if (!assemblyId) return;
    exportMutation.mutate({
      assemblyId,
      format: "markdown",
      unitIds: items.map((i) => i.unitId),
      contentHash: btoa(items.map((i) => i.unitId).join(",")),
    });
  }, [assemblyId, items, exportMutation]);

  return {
    items,
    name,
    frame,
    template,
    templateSlots,
    isLoading: assemblyQuery.isLoading,
    isDirty,
    moveItem,
    addItem,
    removeItem,
    updateRole,
    updateAnnotation,
    setName,
    setFrame,
    applyTemplate,
    clearTemplate,
    mapSlot,
    unmapSlot,
    save,
    exportAssembly,
  };
}
