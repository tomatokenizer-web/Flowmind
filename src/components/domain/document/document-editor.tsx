"use client";

import * as React from "react";
import { EditorContent } from "@tiptap/react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { useDocumentEditor } from "~/hooks/use-document-editor";
import { DocumentHeader } from "./document-header";
import { DocumentToolbar } from "./document-toolbar";

/* ─── Props ─── */

interface DocumentEditorProps {
  documentId: string;
  onNavigateToUnit?: (unitId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function DocumentEditor({
  documentId,
  onNavigateToUnit,
  className,
}: DocumentEditorProps) {
  const doc = useDocumentEditor(documentId);

  if (!doc.editor) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" aria-label="Loading editor" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-bg-primary", className)}>
      {/* Document header */}
      <DocumentHeader
        title={doc.title}
        onTitleChange={doc.setTitle}
        shadowUnitId={doc.shadowUnitId}
        createdAt={doc.createdAt}
        updatedAt={doc.updatedAt}
        onNavigateToUnit={onNavigateToUnit}
      />

      {/* Toolbar */}
      <DocumentToolbar editor={doc.editor} />

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={doc.editor} />
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex items-center justify-between border-t border-border",
          "px-6 py-2",
        )}
      >
        {/* Left: word count + save state */}
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>{doc.wordCount.toLocaleString()} word{doc.wordCount !== 1 ? "s" : ""}</span>
          {doc.isDirty && (
            <span className="text-accent-warning">Unsaved changes</span>
          )}
          {doc.isSaving && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Saving...
            </span>
          )}
          {!doc.isDirty && !doc.isSaving && (
            <span className="text-accent-success">Saved</span>
          )}
        </div>

        {/* Right: extract units button */}
        <SimpleTooltip
          content="Extract units from this document using AI"
          side="top"
        >
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={doc.extractUnits}
            disabled={doc.isExtracting}
            aria-label="Extract units from document"
          >
            {doc.isExtracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {doc.isExtracting ? "Extracting..." : "Extract Units"}
          </Button>
        </SimpleTooltip>
      </div>
    </div>
  );
}

DocumentEditor.displayName = "DocumentEditor";
