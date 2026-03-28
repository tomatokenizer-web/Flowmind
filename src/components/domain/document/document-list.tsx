"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { DestructiveDialog } from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";

/* ─── Types ─── */

interface DocumentListItem {
  id: string;
  title: string;
  content: string;
  updatedAt: Date | string;
  createdAt: Date | string;
  projectId: string;
  shadowUnitId: string | null;
}

interface DocumentListProps {
  onSelect: (id: string) => void;
  selectedId?: string | null;
  className?: string;
}

/* ─── Helpers ─── */

function getPreview(content: string | null, maxLength = 100): string {
  if (!content) return "Empty document";
  // Strip HTML tags for preview
  const text = content.replace(/<[^>]*>/g, "").trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estimateWordCount(content: string | null): number {
  if (!content) return 0;
  const text = content.replace(/<[^>]*>/g, "").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/* ─── Component ─── */

export function DocumentList({
  onSelect,
  selectedId,
  className,
}: DocumentListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const documentsQuery = api.document.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const createMutation = api.document.create.useMutation({
    onSuccess: (data) => {
      documentsQuery.refetch();
      if (data?.id) onSelect(data.id);
    },
  });
  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => {
      documentsQuery.refetch();
    },
  });

  const documents = (documentsQuery.data ?? []) as unknown as DocumentListItem[];

  const handleCreate = () => {
    if (!activeProjectId) return;
    createMutation.mutate({ title: "Untitled Document", content: "", projectId: activeProjectId });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget });
    setDeleteTarget(null);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">
          Documents
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="text-xs gap-1.5"
          aria-label="Create new document"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {documentsQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-text-tertiary">Loading...</span>
            </div>
          )}

          {!documentsQuery.isLoading && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <FileText
                className="h-8 w-8 text-text-tertiary/50"
                aria-hidden="true"
              />
              <p className="text-sm text-text-tertiary">No documents yet</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreate}
                className="text-xs"
              >
                Create your first document
              </Button>
            </div>
          )}

          {documents.map((doc) => {
            const isSelected = selectedId === doc.id;
            const wordCount = estimateWordCount(doc.content);

            return (
              <motion.div
                key={doc.id}
                className="group/doc relative"
                whileHover={{ y: -1 }}
                transition={{ duration: 0.1 }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg border p-2.5",
                    "text-left",
                    "transition-all duration-fast",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    isSelected
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border hover:border-border-focus/30 hover:bg-bg-hover",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      isSelected
                        ? "text-accent-primary"
                        : "text-text-primary",
                    )}
                  >
                    {doc.title || "Untitled Document"}
                  </span>

                  <span className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
                    {getPreview(doc.content)}
                  </span>

                  <div className="flex items-center gap-3 text-[10px] text-text-tertiary mt-0.5">
                    <span>
                      {wordCount.toLocaleString()} word
                      {wordCount !== 1 ? "s" : ""}
                    </span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </button>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(doc.id);
                  }}
                  className={cn(
                    "absolute right-2 top-2 rounded p-1",
                    "text-text-tertiary hover:text-accent-error hover:bg-accent-error/10",
                    "opacity-0 group-hover/doc:opacity-100",
                    "focus-visible:opacity-100",
                    "transition-all duration-fast",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  )}
                  aria-label={`Delete ${doc.title || "Untitled Document"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete confirmation */}
      <DestructiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Document"
        description="This will permanently delete this document and its shadow unit. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

DocumentList.displayName = "DocumentList";
