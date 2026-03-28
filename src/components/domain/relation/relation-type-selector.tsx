"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Link2,
  Minus,
  Package,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { ScrollArea } from "~/components/ui/scroll-area";
import { LAYER_COLORS } from "./relation-badge";

/* ─── Tier 1 core types ─── */

const TIER_1_TYPES: {
  type: string;
  label: string;
  icon: React.ElementType;
  description: string;
  layer: string;
}[] = [
  {
    type: "supports",
    label: "Supports",
    icon: ArrowUpRight,
    description: "This unit provides evidence or backing for the target",
    layer: "L1",
  },
  {
    type: "contradicts",
    label: "Contradicts",
    icon: ShieldAlert,
    description: "This unit opposes or conflicts with the target",
    layer: "L1",
  },
  {
    type: "derives_from",
    label: "Derives from",
    icon: Link2,
    description: "This unit is derived or follows from the target",
    layer: "L1",
  },
  {
    type: "questions",
    label: "Questions",
    icon: HelpCircle,
    description: "This unit raises a question about the target",
    layer: "L2",
  },
  {
    type: "inspires",
    label: "Inspires",
    icon: Lightbulb,
    description: "This unit sparked or inspired the target",
    layer: "L3",
  },
  {
    type: "contains",
    label: "Contains",
    icon: Package,
    description: "This unit contains or encompasses the target",
    layer: "L4",
  },
];

/* ─── Types ─── */

interface RelationTypeSelectorProps {
  /** Currently selected type */
  value?: string;
  /** Callback when a type is selected */
  onChange?: (type: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function RelationTypeSelector({
  value,
  onChange,
  className,
}: RelationTypeSelectorProps) {
  const [showTier2, setShowTier2] = React.useState(false);
  const [showTier3, setShowTier3] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const systemTypesQuery = api.relation.getSystemTypes.useQuery();
  const allTypes = systemTypesQuery.data ?? [];

  /* ─── Derived type lists ─── */

  const tier1TypeNames = new Set(TIER_1_TYPES.map((t) => t.type));

  const tier2Types = React.useMemo(
    () => allTypes.filter((t) => !tier1TypeNames.has(t.name) && t.uiTier === 2),
    [allTypes],
  );

  const tier3Types = React.useMemo(() => {
    const t3 = allTypes.filter(
      (t) => !tier1TypeNames.has(t.name) && t.uiTier !== 2,
    );
    if (!searchQuery.trim()) return t3;
    const q = searchQuery.toLowerCase();
    return t3.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [allTypes, searchQuery]);

  function selectType(type: string) {
    onChange?.(type);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Tier 1: Always visible icon buttons */}
      <div>
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
          Core relations
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TIER_1_TYPES.map(({ type, label, icon: Icon, description, layer }) => {
            const colors =
              LAYER_COLORS[layer] ?? { bg: "var(--bg-secondary)", text: "var(--text-secondary)" };
            const isSelected = value === type;

            return (
              <SimpleTooltip key={type} content={description}>
                <button
                  onClick={() => selectType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5",
                    "border text-xs font-medium",
                    "transition-all duration-fast",
                    isSelected
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                  )}
                  aria-label={label}
                  aria-pressed={isSelected}
                >
                  <Icon
                    className="h-4 w-4"
                    style={!isSelected ? { color: colors.text } : undefined}
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-full">{label}</span>
                </button>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>

      {/* Tier 2: Expandable domain-relevant types */}
      {tier2Types.length > 0 && (
        <div>
          <button
            onClick={() => setShowTier2(!showTier2)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide",
              "hover:text-text-secondary transition-colors duration-fast",
            )}
            aria-expanded={showTier2}
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-fast",
                !showTier2 && "-rotate-90",
              )}
              aria-hidden="true"
            />
            Domain relations ({tier2Types.length})
          </button>

          <AnimatePresence>
            {showTier2 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {tier2Types.map((t) => {
                    const isSelected = value === t.name;
                    const layerKey = `L${t.layer}`;
                    const colors =
                      LAYER_COLORS[layerKey] ?? { bg: "var(--bg-secondary)", text: "var(--text-secondary)" };

                    return (
                      <SimpleTooltip
                        key={t.name}
                        content={t.description ?? t.name}
                      >
                        <button
                          onClick={() => selectType(t.name)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2",
                            "border text-xs font-medium text-left",
                            "transition-all duration-fast",
                            isSelected
                              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                              : "border-border bg-bg-surface text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                          )}
                          aria-pressed={isSelected}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: colors.text }}
                            aria-hidden="true"
                          />
                          <span className="truncate capitalize">
                            {t.name.replace(/_/g, " ")}
                          </span>
                        </button>
                      </SimpleTooltip>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tier 3: Full searchable list */}
      <div>
        <button
          onClick={() => setShowTier3(!showTier3)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide",
            "hover:text-text-secondary transition-colors duration-fast",
          )}
          aria-expanded={showTier3}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-fast",
              !showTier3 && "-rotate-90",
            )}
            aria-hidden="true"
          />
          Search all types
        </button>

        <AnimatePresence>
          {showTier3 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-col gap-2">
                {/* Search input */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-1.5",
                    "focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary",
                    "transition-all duration-fast",
                  )}
                >
                  <Search className="h-3.5 w-3.5 text-text-tertiary shrink-0" aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search relation types..."
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none"
                    aria-label="Search relation types"
                  />
                </div>

                {/* Results */}
                <ScrollArea className="max-h-40">
                  {tier3Types.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-3">
                      No matching types found
                    </p>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {tier3Types.map((t) => {
                        const isSelected = value === t.name;
                        const layerKey = `L${t.layer}`;
                        const colors =
                          LAYER_COLORS[layerKey] ?? {
                            bg: "var(--bg-secondary)",
                            text: "var(--text-secondary)",
                          };

                        return (
                          <button
                            key={t.name}
                            onClick={() => selectType(t.name)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left",
                              "transition-colors duration-fast",
                              isSelected
                                ? "bg-accent-primary/10 text-accent-primary"
                                : "text-text-primary hover:bg-bg-hover",
                            )}
                            aria-pressed={isSelected}
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: colors.text }}
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium capitalize flex-1 truncate">
                              {t.name.replace(/_/g, " ")}
                            </span>
                            {t.description && (
                              <Sparkles className="h-3 w-3 text-text-tertiary shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
