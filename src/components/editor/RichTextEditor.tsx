"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Code,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  /** HTML content string */
  content: string;
  /** Fires with updated HTML string (debounced internally by Tiptap) */
  onChange?: (html: string) => void;
  /** When false the editor is read-only */
  editable?: boolean;
  /** Additional class names on the wrapper */
  className?: string;
  /** Placeholder text shown when the editor is empty */
  placeholder?: string;
}

// ─── Toolbar button ──────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-text-secondary",
        "transition-colors duration-fast",
        "hover:bg-bg-hover hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-40",
        "motion-reduce:transition-none",
        isActive && "bg-accent-primary/10 text-accent-primary",
      )}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  if (!editor) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        label="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        label="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        label="Ordered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        label="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        label="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Undo"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Redo"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

// ─── RichTextEditor ──────────────────────────────────────────────────

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  className,
  placeholder = "Write your thought...",
}: RichTextEditorProps) {
  const handleUpdate = useCallback(
    ({ editor: e }: { editor: { getHTML: () => string } }) => {
      onChange?.(e.getHTML());
    },
    [onChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false, // keep inline code only for unit content
      }),
    ],
    content,
    editable,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: cn(
          "flowmind-editor",
          "min-h-[180px] w-full px-3 py-2 text-sm leading-relaxed text-text-primary",
          "focus:outline-none",
          "motion-reduce:transition-none",
        ),
        "aria-label": "Unit content editor",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  });

  // Sync editable prop
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Sync external content changes (e.g. when switching units)
  useEffect(() => {
    if (!editor) return;
    // Only replace if the content actually differs to avoid cursor jumps
    const currentHTML = editor.getHTML();
    if (currentHTML !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, content]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-primary overflow-hidden",
        "focus-within:ring-2 focus-within:ring-accent-primary focus-within:ring-offset-1",
        "transition-shadow duration-fast",
        "motion-reduce:transition-none",
        className,
      )}
    >
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
