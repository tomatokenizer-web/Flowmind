"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { BASE_UNIT_TYPES, UNIT_TYPE_COLORS } from "~/lib/unit-types";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

interface UnitTypeSelectorProps {
  unitId: string;
  currentType: UnitType;
  onTypeChange?: (newType: UnitType) => void;
  className?: string;
}

export function UnitTypeSelector({
  unitId,
  currentType,
  onTypeChange,
  className,
}: UnitTypeSelectorProps) {
  const utils = api.useUtils();

  const updateMutation = api.unit.update.useMutation({
    onMutate: async ({ unitType }) => {
      // Cancel outgoing refetches
      await utils.unit.list.cancel();

      // Optimistic update — notify parent immediately
      if (unitType) {
        onTypeChange?.(unitType);
      }
    },
    onSettled: () => {
      void utils.unit.list.invalidate();
    },
  });

  const handleSelect = (type: UnitType) => {
    if (type === currentType) return;
    updateMutation.mutate({ id: unitId, unitType: type });
  };

  const current = UNIT_TYPE_COLORS[currentType];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
          "border border-border bg-bg-primary hover:bg-bg-hover",
          "transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          className,
        )}
        aria-label={`Unit type: ${currentType}. Click to change.`}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: current.accent }}
          aria-hidden="true"
        />
        <span className="capitalize">{currentType}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        {BASE_UNIT_TYPES.map((t) => {
          const isSelected = t.id === currentType;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => handleSelect(t.id)}
              className={cn(isSelected && "bg-bg-hover")}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: t.colors.accent }}
                aria-hidden="true"
              />
              <span className="flex-1 capitalize">{t.label}</span>
              {isSelected && (
                <Check className="h-4 w-4 text-accent-primary shrink-0" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
