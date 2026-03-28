"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Download,
  Loader2,
  Plus,
  Save,
  Search,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SimpleTooltip } from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAssemblyEditor, type RhetoricalFrame } from "~/hooks/use-assembly-editor";
import { AssemblyItemCard } from "./assembly-item";
import { AssemblySearchPanel } from "./assembly-search-panel";
import { AssemblyTemplate } from "./assembly-template";

/* ─── Frame Layout Hints ─── */

const FRAME_HINTS: Record<RhetoricalFrame, string[]> = {
  argument: ["Thesis", "Evidence", "Counterargument", "Conclusion"],
  narrative: ["Setting", "Inciting Event", "Rising Action", "Climax", "Resolution"],
  analysis: ["Introduction", "Categories", "Cross-Analysis", "Conclusion"],
  comparison: ["Subject A", "Subject B", "Criteria", "Synthesis"],
  synthesis: ["Sources", "Themes", "Integration", "New Insight"],
};

const FRAME_OPTIONS: { value: RhetoricalFrame; label: string }[] = [
  { value: "argument", label: "Argument" },
  { value: "narrative", label: "Narrative" },
  { value: "analysis", label: "Analysis" },
  { value: "comparison", label: "Comparison" },
  { value: "synthesis", label: "Synthesis" },
];

/* ─── Props ─── */

interface AssemblyEditorProps {
  assemblyId: string;
  onClickUnit?: (unitId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function AssemblyEditor({
  assemblyId,
  onClickUnit,
  className,
}: AssemblyEditorProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [showTemplate, setShowTemplate] = React.useState(false);
  const titleRef = React.useRef<HTMLInputElement>(null);

  const editor = useAssemblyEditor(assemblyId);

  /* DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      editor.moveItem(String(active.id), String(over.id));
    }
  };

  /* Existing unit IDs for search panel dedup */
  const existingUnitIds = React.useMemo(
    () => new Set(editor.items.map((item) => item.unitId)),
    [editor.items],
  );

  /* Frame hints for empty state */
  const frameHints = editor.frame ? FRAME_HINTS[editor.frame] : null;

  if (editor.isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3 space-y-2">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <input
            ref={titleRef}
            type="text"
            value={editor.name}
            onChange={(e) => editor.setName(e.target.value)}
            placeholder="Untitled Assembly"
            className={cn(
              "flex-1 bg-transparent text-lg font-semibold text-text-primary",
              "placeholder:text-text-tertiary",
              "outline-none",
              "focus-visible:underline focus-visible:underline-offset-4 focus-visible:decoration-accent-primary/40",
            )}
            aria-label="Assembly title"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Save indicator */}
            {editor.isDirty && (
              <span className="text-[10px] text-text-tertiary">Unsaved</span>
            )}

            <SimpleTooltip content="Save (auto-saves)" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={editor.save}
                aria-label="Save assembly"
              >
                <Save className="h-4 w-4" />
              </Button>
            </SimpleTooltip>

            <SimpleTooltip content="Export assembly" side="bottom">
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={editor.exportAssembly}
                aria-label="Export assembly"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export
              </Button>
            </SimpleTooltip>
          </div>
        </div>

        {/* Frame + description row */}
        <div className="flex items-start gap-3">
          {/* Frame selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                  "text-xs font-medium",
                  "border border-border",
                  "hover:bg-bg-hover transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  editor.frame
                    ? "text-accent-primary border-accent-primary/30"
                    : "text-text-secondary",
                )}
              >
                {editor.frame
                  ? FRAME_OPTIONS.find((f) => f.value === editor.frame)?.label
                  : "Select frame"}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {FRAME_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={() => editor.setFrame(opt.value)}
                  className={cn(editor.frame === opt.value && "bg-bg-hover")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
              {editor.frame && (
                <DropdownMenuItem
                  onSelect={() => editor.setFrame(null)}
                  className="text-text-tertiary"
                >
                  Clear frame
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer in place of description */}
          <div className="flex-1" />
        </div>

        {/* Frame layout hints */}
        {frameHints && (
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] text-text-tertiary mr-1">Structure:</span>
            {frameHints.map((hint, i) => (
              <React.Fragment key={hint}>
                {i > 0 && (
                  <span className="text-[10px] text-text-tertiary/50" aria-hidden="true">
                    &rarr;
                  </span>
                )}
                <span className="text-[10px] text-text-tertiary font-medium">
                  {hint}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Template toggle */}
        {editor.frame && (
          <button
            type="button"
            onClick={() => {
              if (!showTemplate) editor.applyTemplate(editor.frame!);
              setShowTemplate((prev) => !prev);
            }}
            className={cn(
              "text-[10px] font-medium",
              "text-accent-primary hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded",
            )}
          >
            {showTemplate ? "Hide template" : "Use template slots"}
          </button>
        )}
      </div>

      {/* Template section (collapsible) */}
      <AnimatePresence>
        {showTemplate && editor.template && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-4 py-3">
              <AssemblyTemplate
                currentFrame={editor.frame}
                template={editor.template}
                templateSlots={editor.templateSlots}
                items={editor.items}
                onApplyTemplate={editor.applyTemplate}
                onClearTemplate={() => {
                  editor.clearTemplate();
                  setShowTemplate(false);
                }}
                onMapSlot={editor.mapSlot}
                onUnmapSlot={editor.unmapSlot}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item list */}
      <div className="flex-1 relative">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {editor.items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className={cn(
                    "rounded-xl border-2 border-dashed border-border p-6",
                    "text-center",
                  )}
                >
                  <p className="text-sm text-text-tertiary mb-2">
                    No units in this assembly yet
                  </p>
                  <p className="text-xs text-text-tertiary/70 mb-3">
                    Add units from your collection to build a structured composition
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    Search units
                  </Button>
                </div>

                {/* Template empty slots */}
                {showTemplate && editor.templateSlots.length > 0 && (
                  <div className="w-full space-y-2 mt-4">
                    {editor.templateSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={cn(
                          "rounded-lg border-2 border-dashed border-border/60 p-3",
                          "text-center",
                        )}
                      >
                        <span className="text-xs text-text-tertiary">
                          {slot.label}
                          {slot.required && (
                            <span className="text-accent-error ml-1">*</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editor.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {editor.items.map((item, index) => (
                  <AssemblyItemCard
                    key={item.id}
                    item={item}
                    position={index}
                    onRoleChange={editor.updateRole}
                    onAnnotationChange={editor.updateAnnotation}
                    onRemove={editor.removeItem}
                    onClickUnit={onClickUnit}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>

        {/* Floating add button */}
        <div className="absolute bottom-4 right-4">
          <SimpleTooltip content="Add unit" side="left">
            <Button
              variant="primary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-elevated"
              onClick={() => setSearchOpen(true)}
              aria-label="Add unit to assembly"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Search panel */}
      <AssemblySearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddUnit={editor.addItem}
        existingUnitIds={existingUnitIds}
      />
    </div>
  );
}

AssemblyEditor.displayName = "AssemblyEditor";
