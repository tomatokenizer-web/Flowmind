"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, ArrowRight, ExternalLink, Clock, Pencil, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UnitTypeBadge } from "./unit-type-badge";
import { usePanelStore } from "~/stores/panel-store";
import { formatDistanceToNow } from "date-fns";

/**
 * UnitSpotlight — full-screen centered card overlay for a single unit.
 * Renders on top of everything when `spotlightUnitId` is set in panel-store.
 * Esc or backdrop click closes it.
 */
export function UnitSpotlight() {
  const spotlightUnitId = usePanelStore((s) => s.spotlightUnitId);
  const closeSpotlight = usePanelStore((s) => s.closeSpotlight);
  const openPanel = usePanelStore((s) => s.openPanel);

  const [editing, setEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState("");
  const utils = api.useUtils();

  const { data: unit, isLoading } = api.unit.getById.useQuery(
    { id: spotlightUnitId! },
    { enabled: !!spotlightUnitId },
  );

  const { data: relations = [] } = api.relation.listByUnit.useQuery(
    { unitId: spotlightUnitId! },
    { enabled: !!spotlightUnitId },
  );

  const updateMutation = api.unit.update.useMutation({
    onSuccess: () => {
      void utils.unit.getById.invalidate({ id: spotlightUnitId! });
      void utils.unit.list.invalidate();
      setEditing(false);
    },
  });

  // Keyboard: Esc to close
  React.useEffect(() => {
    if (!spotlightUnitId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) {
        e.preventDefault();
        closeSpotlight();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [spotlightUnitId, closeSpotlight, editing]);

  // Reset editing when unit changes
  React.useEffect(() => {
    setEditing(false);
  }, [spotlightUnitId]);

  const outgoing = relations.filter((r) => r.sourceUnitId === spotlightUnitId);
  const incoming = relations.filter((r) => r.targetUnitId === spotlightUnitId);

  return (
    <AnimatePresence>
      {spotlightUnitId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={closeSpotlight}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-xl mx-4 max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-bg-surface shadow-2xl"
          >
            {isLoading || !unit ? (
              <div className="p-8 space-y-4">
                <div className="h-6 w-24 animate-pulse rounded bg-bg-secondary" />
                <div className="h-4 w-full animate-pulse rounded bg-bg-secondary" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-bg-secondary" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UnitTypeBadge unitType={unit.unitType} />
                    <span className="text-xs text-text-tertiary capitalize">
                      {unit.lifecycle}
                    </span>
                    <span className="text-xs text-text-tertiary flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(unit.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        openPanel(spotlightUnitId!);
                        closeSpotlight();
                      }}
                      title="Open in detail panel"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={closeSpotlight}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4">
                  {editing ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg-primary p-3 text-base leading-relaxed text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        rows={Math.max(4, editContent.split("\n").length + 1)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditing(false);
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={updateMutation.isPending || !editContent.trim()}
                          onClick={() => {
                            updateMutation.mutate({
                              id: spotlightUnitId!,
                              content: editContent.trim(),
                            });
                          }}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {updateMutation.isPending ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="group relative cursor-pointer rounded-lg p-1 -m-1 hover:bg-bg-hover/50 transition-colors"
                      onClick={() => {
                        setEditContent(unit.content);
                        setEditing(true);
                      }}
                    >
                      <p className="text-base leading-relaxed text-text-primary whitespace-pre-wrap">
                        {unit.content}
                      </p>
                      <Pencil className="absolute top-1 right-1 h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* Relations */}
                {relations.length > 0 && (
                  <div className="border-t border-border px-6 py-4 space-y-2">
                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Relations ({relations.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {outgoing.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            usePanelStore.getState().openSpotlight(r.targetUnitId);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer",
                            "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20",
                          )}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {r.type.replace(/_/g, " ")}
                        </button>
                      ))}
                      {incoming.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            usePanelStore.getState().openSpotlight(r.sourceUnitId);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer",
                            "bg-bg-secondary text-text-secondary hover:bg-bg-hover",
                          )}
                        >
                          <Link2 className="h-3 w-3" />
                          {r.type.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer hint */}
                <div className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-tertiary">
                  <span>Click content to edit</span>
                  <span>Esc to close</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
