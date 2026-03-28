"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Leaf, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import {
  UnitTypeBadge,
  UNIT_TYPE_CONFIG,
  getUnitTypeConfig,
  type UnitType,
} from "./unit-type-badge";

/* ─── Types ─── */

interface UnitEditorProps {
  /** Initial content for the editor */
  initialContent?: string;
  /** Current unit type */
  primaryType?: string;
  /** Current tags */
  tags?: { id: string; name: string }[];
  /** Available tags for autocomplete */
  availableTags?: { id: string; name: string }[];
  /** Context dependency mode */
  contextDependency?: "free" | "anchored" | "passage";
  /** Whether the unit is evergreen */
  isEvergreen?: boolean;
  /** Called on content save (debounced) */
  onSave?: (data: {
    content: string;
    primaryType: string;
    contextDependency: string;
    isEvergreen: boolean;
  }) => void;
  /** Called when type changes */
  onTypeChange?: (type: string) => void;
  /** Called when a tag is added */
  onAddTag?: (tagName: string) => void;
  /** Called when a tag is removed */
  onRemoveTag?: (tagId: string) => void;
  /** Called when evergreen is toggled */
  onToggleEvergreen?: (value: boolean) => void;
  /** Auto-save mode (saves on blur with debounce) */
  autoSave?: boolean;
  className?: string;
}

/* ─── Debounce Hook ─── */

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

/* ─── Tag Input ─── */

function TagInput({
  tags,
  availableTags,
  onAdd,
  onRemove,
}: {
  tags: { id: string; name: string }[];
  availableTags: { id: string; name: string }[];
  onAdd?: (name: string) => void;
  onRemove?: (id: string) => void;
}) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) return [];
    const lower = inputValue.toLowerCase();
    const existingIds = new Set(tags.map((t) => t.id));
    return availableTags
      .filter(
        (t) =>
          t.name.toLowerCase().includes(lower) && !existingIds.has(t.id),
      )
      .slice(0, 5);
  }, [inputValue, tags, availableTags]);

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    onAdd?.(name.trim());
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      const lastTag = tags[tags.length - 1];
      if (lastTag) {
        onRemove?.(lastTag.id);
      }
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-tertiary">Tags</label>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 rounded-lg border border-border",
          "bg-bg-surface px-2 py-1.5",
          "focus-within:border-border-focus focus-within:ring-1 focus-within:ring-accent-primary/20",
          "transition-colors duration-fast",
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
              "text-xs font-medium",
              "bg-bg-secondary text-text-secondary",
            )}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onRemove?.(tag.id)}
              className="hover:text-accent-error transition-colors duration-fast"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[80px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            className={cn(
              "w-full bg-transparent text-xs text-text-primary",
              "placeholder:text-text-tertiary",
              "outline-none",
            )}
            aria-label="Add tag"
          />
          {/* Autocomplete dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              className={cn(
                "absolute left-0 top-full z-50 mt-1 w-48",
                "rounded-lg border border-border bg-bg-primary p-1",
                "shadow-elevated",
              )}
            >
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5",
                    "text-xs text-text-primary",
                    "hover:bg-bg-hover transition-colors duration-fast",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAdd(suggestion.name);
                  }}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Context Dependency Selector ─── */

const CONTEXT_DEPS = [
  { value: "free", label: "Free", description: "Independent of any context" },
  { value: "anchored", label: "Anchored", description: "Tied to a specific context" },
  { value: "passage", label: "Passage", description: "Bound to a text passage" },
] as const;

function ContextDependencySelector({
  value,
  onChange,
}: {
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-tertiary">
        Context Dependency
      </label>
      <div className="flex gap-1">
        {CONTEXT_DEPS.map((dep) => (
          <SimpleTooltip key={dep.value} content={dep.description} side="bottom">
            <button
              type="button"
              onClick={() => onChange?.(dep.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                "transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                value === dep.value
                  ? "bg-accent-primary text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
              )}
            >
              {dep.label}
            </button>
          </SimpleTooltip>
        ))}
      </div>
    </div>
  );
}

/* ─── UnitEditor Component ─── */

export function UnitEditor({
  initialContent = "",
  primaryType = "claim",
  tags = [],
  availableTags = [],
  contextDependency = "free",
  isEvergreen = false,
  onSave,
  onTypeChange,
  onAddTag,
  onRemoveTag,
  onToggleEvergreen,
  autoSave = true,
  className,
}: UnitEditorProps) {
  const [currentType, setCurrentType] = React.useState(primaryType);
  const [currentContextDep, setCurrentContextDep] = React.useState(contextDependency);
  const [currentEvergreen, setCurrentEvergreen] = React.useState(isEvergreen);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none",
          "text-text-primary",
          "focus:outline-none",
          "min-h-[80px] px-3 py-2",
          "[&_p]:my-1 [&_p]:leading-relaxed",
          "[&_ul]:my-1 [&_ol]:my-1",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-accent-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic",
          "[&_code]:rounded [&_code]:bg-bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
        ),
      },
    },
  });

  const debouncedSave = useDebouncedCallback(() => {
    if (!editor || !onSave) return;
    onSave({
      content: editor.getText(),
      primaryType: currentType,
      contextDependency: currentContextDep,
      isEvergreen: currentEvergreen,
    });
  }, 300);

  /* Auto-save on blur */
  React.useEffect(() => {
    if (!editor || !autoSave) return;
    const handleBlur = () => debouncedSave();
    editor.on("blur", handleBlur);
    return () => {
      editor.off("blur", handleBlur);
    };
  }, [editor, autoSave, debouncedSave]);

  const handleTypeChange = (type: string) => {
    setCurrentType(type);
    onTypeChange?.(type);
  };

  const handleContextDepChange = (value: string) => {
    setCurrentContextDep(value as "free" | "anchored" | "passage");
  };

  const handleEvergreenToggle = () => {
    const next = !currentEvergreen;
    setCurrentEvergreen(next);
    onToggleEvergreen?.(next);
  };

  const typeConfig = getUnitTypeConfig(currentType);

  return (
    <div
      className={cn(
        "rounded-card border border-border bg-bg-primary",
        "transition-colors duration-fast",
        "focus-within:border-border-focus",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        {/* Type selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
                "text-xs font-medium",
                "hover:bg-bg-hover transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                typeConfig.bgClass,
                typeConfig.accentClass,
              )}
            >
              <typeConfig.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {typeConfig.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {Object.entries(UNIT_TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => handleTypeChange(key)}
                  className={cn(
                    key === currentType && "bg-bg-hover",
                  )}
                >
                  <Icon className={cn("mr-2 h-4 w-4", config.accentClass)} />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Evergreen toggle */}
        <SimpleTooltip content="Toggle evergreen status" side="bottom">
          <Toggle
            size="sm"
            pressed={currentEvergreen}
            onPressedChange={handleEvergreenToggle}
            aria-label="Toggle evergreen"
            className="h-7 w-7 p-0"
          >
            <Leaf className="h-3.5 w-3.5" />
          </Toggle>
        </SimpleTooltip>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Bottom metadata section */}
      <div className="space-y-3 border-t border-border/50 px-3 py-3">
        <TagInput
          tags={tags}
          availableTags={availableTags}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
        />
        <ContextDependencySelector
          value={currentContextDep}
          onChange={handleContextDepChange}
        />
      </div>

      {/* Save indicator */}
      {onSave && (
        <div className="flex justify-end px-3 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!editor) return;
              onSave({
                content: editor.getText(),
                primaryType: currentType,
                contextDependency: currentContextDep,
                isEvergreen: currentEvergreen,
              });
            }}
            className="text-xs text-text-tertiary"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

UnitEditor.displayName = "UnitEditor";
