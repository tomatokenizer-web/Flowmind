"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

interface DocumentToolbarProps {
  editor: Editor | null;
  className?: string;
}

interface ToolbarButtonConfig {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

/* ─── Button Groups ─── */

const FORMATTING_BUTTONS: ToolbarButtonConfig[] = [
  {
    icon: Bold,
    label: "Bold",
    shortcut: "Ctrl+B",
    action: (e) => e.chain().focus().toggleBold().run(),
    isActive: (e) => e.isActive("bold"),
  },
  {
    icon: Italic,
    label: "Italic",
    shortcut: "Ctrl+I",
    action: (e) => e.chain().focus().toggleItalic().run(),
    isActive: (e) => e.isActive("italic"),
  },
  {
    icon: Strikethrough,
    label: "Strikethrough",
    shortcut: "Ctrl+Shift+X",
    action: (e) => e.chain().focus().toggleStrike().run(),
    isActive: (e) => e.isActive("strike"),
  },
  {
    icon: Code,
    label: "Code",
    shortcut: "Ctrl+E",
    action: (e) => e.chain().focus().toggleCode().run(),
    isActive: (e) => e.isActive("code"),
  },
];

const HEADING_BUTTONS: ToolbarButtonConfig[] = [
  {
    icon: Heading1,
    label: "Heading 1",
    shortcut: "Ctrl+Alt+1",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive("heading", { level: 1 }),
  },
  {
    icon: Heading2,
    label: "Heading 2",
    shortcut: "Ctrl+Alt+2",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    icon: Heading3,
    label: "Heading 3",
    shortcut: "Ctrl+Alt+3",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive("heading", { level: 3 }),
  },
];

const BLOCK_BUTTONS: ToolbarButtonConfig[] = [
  {
    icon: List,
    label: "Bullet List",
    shortcut: "Ctrl+Shift+8",
    action: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive("bulletList"),
  },
  {
    icon: ListOrdered,
    label: "Numbered List",
    shortcut: "Ctrl+Shift+7",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive("orderedList"),
  },
  {
    icon: Quote,
    label: "Blockquote",
    shortcut: "Ctrl+Shift+B",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive("blockquote"),
  },
  {
    icon: Minus,
    label: "Horizontal Rule",
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

const HISTORY_BUTTONS: ToolbarButtonConfig[] = [
  {
    icon: Undo,
    label: "Undo",
    shortcut: "Ctrl+Z",
    action: (e) => e.chain().focus().undo().run(),
  },
  {
    icon: Redo,
    label: "Redo",
    shortcut: "Ctrl+Y",
    action: (e) => e.chain().focus().redo().run(),
  },
];

/* ─── Toolbar Button ─── */

function ToolbarButton({
  config,
  editor,
}: {
  config: ToolbarButtonConfig;
  editor: Editor;
}) {
  const Icon = config.icon;
  const isActive = config.isActive?.(editor) ?? false;
  const tooltipContent = config.shortcut
    ? `${config.label} (${config.shortcut})`
    : config.label;

  return (
    <SimpleTooltip content={tooltipContent} side="bottom">
      <button
        type="button"
        onClick={() => config.action(editor)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "text-sm transition-all duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          isActive
            ? "bg-accent-primary/10 text-accent-primary"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
        )}
        aria-label={config.label}
        aria-pressed={isActive}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </SimpleTooltip>
  );
}

/* ─── Separator ─── */

function ToolbarSeparator() {
  return (
    <div
      className="mx-1 h-5 w-px bg-border"
      role="separator"
      aria-orientation="vertical"
    />
  );
}

/* ─── Main Component ─── */

export function DocumentToolbar({ editor, className }: DocumentToolbarProps) {
  if (!editor) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-0.5 flex-wrap",
        "border-b border-border bg-bg-primary/95 backdrop-blur-sm",
        "px-4 py-2",
        className,
      )}
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Formatting */}
      {FORMATTING_BUTTONS.map((config) => (
        <ToolbarButton key={config.label} config={config} editor={editor} />
      ))}

      <ToolbarSeparator />

      {/* Headings */}
      {HEADING_BUTTONS.map((config) => (
        <ToolbarButton key={config.label} config={config} editor={editor} />
      ))}

      <ToolbarSeparator />

      {/* Blocks */}
      {BLOCK_BUTTONS.map((config) => (
        <ToolbarButton key={config.label} config={config} editor={editor} />
      ))}

      <ToolbarSeparator />

      {/* History */}
      {HISTORY_BUTTONS.map((config) => (
        <ToolbarButton key={config.label} config={config} editor={editor} />
      ))}
    </div>
  );
}

DocumentToolbar.displayName = "DocumentToolbar";
