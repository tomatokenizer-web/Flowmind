"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Layout,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import {
  ASSEMBLY_TEMPLATES,
  type AssemblyTemplate as AssemblyTemplateType,
  type RhetoricalFrame,
  type TemplateSlot,
  type AssemblyItem,
} from "~/hooks/use-assembly-editor";

/* ─── Frame Config ─── */

const FRAME_CONFIG: Record<
  RhetoricalFrame,
  { label: string; description: string; color: string }
> = {
  argument: {
    label: "Argument",
    description: "Build a structured argument with thesis, evidence, and conclusion",
    color: "text-unit-claim-accent",
  },
  narrative: {
    label: "Narrative",
    description: "Tell a story with setting, conflict, climax, and resolution",
    color: "text-unit-observation-accent",
  },
  analysis: {
    label: "Analysis",
    description: "Break down a topic into categories with cross-analysis",
    color: "text-unit-evidence-accent",
  },
  comparison: {
    label: "Comparison",
    description: "Compare subjects across criteria and synthesize findings",
    color: "text-unit-question-accent",
  },
  synthesis: {
    label: "Synthesis",
    description: "Combine multiple sources into new insights",
    color: "text-unit-idea-accent",
  },
};

/* ─── Props ─── */

interface AssemblyTemplateProps {
  currentFrame: RhetoricalFrame | null;
  template: AssemblyTemplateType | null;
  templateSlots: TemplateSlot[];
  items: AssemblyItem[];
  onApplyTemplate: (frame: RhetoricalFrame) => void;
  onClearTemplate: () => void;
  onMapSlot: (slotId: string, itemId: string) => void;
  onUnmapSlot: (slotId: string, itemId: string) => void;
}

/* ─── Slot Component ─── */

function TemplateSlotCard({
  slot,
  items,
  onMap,
  onUnmap,
}: {
  slot: TemplateSlot;
  items: AssemblyItem[];
  onMap: (slotId: string, itemId: string) => void;
  onUnmap: (slotId: string, itemId: string) => void;
}) {
  const mappedItems = items.filter((item) =>
    slot.mappedItemIds.includes(item.id),
  );
  const unmappedItems = items.filter(
    (item) => !slot.mappedItemIds.includes(item.id),
  );
  const isEmpty = mappedItems.length === 0;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-3",
        "transition-colors duration-fast",
        isEmpty
          ? "border-border bg-bg-surface/50"
          : "border-accent-primary/30 bg-accent-primary/5",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">
            {slot.label}
          </span>
          {slot.required && (
            <span
              className="text-[10px] text-accent-error font-medium"
              aria-label="Required slot"
            >
              Required
            </span>
          )}
          {slot.multiple && (
            <span className="text-[10px] text-text-tertiary">
              (multiple)
            </span>
          )}
        </div>

        {/* Add mapping dropdown */}
        {(slot.multiple || isEmpty) && unmappedItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-text-tertiary hover:text-accent-primary"
                aria-label={`Map unit to ${slot.label}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-48 overflow-y-auto max-w-64">
              {unmappedItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => onMap(slot.id, item.id)}
                  className="text-xs"
                >
                  <span className="truncate">{item.unit.content.slice(0, 60)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mapped items */}
      {mappedItems.length > 0 ? (
        <div className="space-y-1">
          {mappedItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5",
                "bg-bg-primary border border-border",
              )}
            >
              <Check
                className="h-3.5 w-3.5 text-accent-success shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs text-text-primary truncate flex-1">
                {item.unit.content.slice(0, 80)}
              </span>
              <button
                type="button"
                onClick={() => onUnmap(slot.id, item.id)}
                className={cn(
                  "shrink-0 text-text-tertiary hover:text-accent-error",
                  "transition-colors duration-fast",
                )}
                aria-label={`Remove mapping for ${item.unit.content.slice(0, 30)}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-tertiary italic">
          Drag a unit here or click + to map
        </p>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function AssemblyTemplate({
  currentFrame,
  template,
  templateSlots,
  items,
  onApplyTemplate,
  onClearTemplate,
  onMapSlot,
  onUnmapSlot,
}: AssemblyTemplateProps) {
  return (
    <div className="space-y-3">
      {/* Frame selector */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-tertiary">
          Rhetorical Frame
        </label>

        {template && (
          <SimpleTooltip content="Clear template" side="left">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-tertiary hover:text-accent-error"
              onClick={onClearTemplate}
              aria-label="Clear template"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </SimpleTooltip>
        )}
      </div>

      {/* Frame choices */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ASSEMBLY_TEMPLATES.map((tmpl) => {
          const config = FRAME_CONFIG[tmpl.frame];
          const isActive = currentFrame === tmpl.frame;

          return (
            <button
              key={tmpl.frame}
              type="button"
              onClick={() => onApplyTemplate(tmpl.frame)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-2.5",
                "text-left",
                "transition-all duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                isActive
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:border-border-focus/30 hover:bg-bg-hover",
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-1.5">
                <Layout className={cn("h-3.5 w-3.5", config.color)} aria-hidden="true" />
                <span className={cn("text-xs font-semibold", isActive ? "text-accent-primary" : "text-text-primary")}>
                  {config.label}
                </span>
              </div>
              <span className="text-[10px] text-text-tertiary leading-tight">
                {config.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Template slots */}
      {template && templateSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-2 pt-2 border-t border-border/50"
        >
          <h4 className="text-xs font-semibold text-text-secondary">
            Template Slots
          </h4>
          {templateSlots.map((slot) => (
            <TemplateSlotCard
              key={slot.id}
              slot={slot}
              items={items}
              onMap={onMapSlot}
              onUnmap={onUnmapSlot}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

AssemblyTemplate.displayName = "AssemblyTemplate";
