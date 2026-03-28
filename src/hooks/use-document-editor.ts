"use client";

import * as React from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api } from "~/trpc/react";

/* ─── Types ─── */

export interface DocumentEditorState {
  editor: ReturnType<typeof useEditor>;
  title: string;
  setTitle: (title: string) => void;
  wordCount: number;
  isDirty: boolean;
  shadowUnitId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  save: () => void;
  extractUnits: () => void;
  isExtracting: boolean;
  isSaving: boolean;
}

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

/* ─── Word Count Utility ─── */

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/* ─── Hook ─── */

export function useDocumentEditor(documentId: string | null): DocumentEditorState {
  const [title, setTitleState] = React.useState("");
  const [wordCount, setWordCount] = React.useState(0);
  const [isDirty, setIsDirty] = React.useState(false);
  const [shadowUnitId, setShadowUnitId] = React.useState<string | null>(null);
  const [createdAt, setCreatedAt] = React.useState<Date | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const initialContentRef = React.useRef<string | null>(null);

  /* Queries */
  const documentQuery = api.document.getById.useQuery(
    { id: documentId! },
    { enabled: !!documentId },
  );

  const updateMutation = api.document.update.useMutation();

  /* TipTap Editor */
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: [
          "prose prose-sm max-w-none",
          "text-text-primary",
          "focus:outline-none",
          "min-h-[400px] px-6 py-4",
          "[&_p]:my-2 [&_p]:leading-relaxed",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-accent-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary",
          "[&_code]:rounded [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
          "[&_pre]:rounded-lg [&_pre]:bg-bg-secondary [&_pre]:p-4 [&_pre]:overflow-x-auto",
          "[&_hr]:border-border [&_hr]:my-4",
        ].join(" "),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      setWordCount(countWords(text));
      setIsDirty(true);

      // Content has changed from initial load
    },
  });

  /* Sync from server */
  React.useEffect(() => {
    if (!documentQuery.data || !editor) return;
    const data = documentQuery.data;

    setTitleState(data.title ?? "");
    setShadowUnitId(data.shadowUnitId ?? null);
    setCreatedAt(data.createdAt ? new Date(data.createdAt as unknown as string) : null);
    setUpdatedAt(data.updatedAt ? new Date(data.updatedAt as unknown as string) : null);

    const content = (data.content as string) ?? "";
    editor.commands.setContent(content);
    initialContentRef.current = content;
    setWordCount(countWords(editor.getText()));
    setIsDirty(false);
  }, [documentQuery.data, editor]);

  /* Debounced auto-save (1s) */
  const debouncedSave = useDebouncedCallback(() => {
    if (!documentId || !editor || !isDirty) return;
    const html = editor.getHTML();
    updateMutation.mutate({
      id: documentId,
      title,
      content: html,
    });
    setIsDirty(false);
  }, 1000);

  React.useEffect(() => {
    if (isDirty) debouncedSave();
  }, [isDirty, debouncedSave]);

  /* Public API */
  const setTitle = React.useCallback((newTitle: string) => {
    setTitleState(newTitle);
    setIsDirty(true);
  }, []);

  const save = React.useCallback(() => {
    if (!documentId || !editor) return;
    const html = editor.getHTML();
    updateMutation.mutate({
      id: documentId,
      title,
      content: html,
    });
    setIsDirty(false);
  }, [documentId, editor, title, updateMutation]);

  const extractUnits = React.useCallback(() => {
    if (!documentId || !editor) return;
    setIsExtracting(true);

    // Save first, then trigger extraction pipeline
    const html = editor.getHTML();
    updateMutation.mutate(
      {
        id: documentId,
        title,
        content: html,
      },
      {
        onSuccess: () => {
          // After save, the extraction would be handled by a pipeline
          initialContentRef.current = html;
          setIsExtracting(false);
          void documentQuery.refetch();
        },
        onError: () => {
          setIsExtracting(false);
        },
      },
    );
  }, [documentId, editor, title, updateMutation, documentQuery]);

  return {
    editor,
    title,
    setTitle,
    wordCount,
    isDirty,
    shadowUnitId,
    createdAt,
    updatedAt,
    save,
    extractUnits,
    isExtracting,
    isSaving: updateMutation.isPending,
  };
}
