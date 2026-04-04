"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

interface ActionCompletionSheetProps {
  unitId: string;
  unitContent: string;
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function ActionCompletionSheet({
  unitId,
  unitContent,
  open,
  onClose,
  projectId,
}: ActionCompletionSheetProps) {
  const [resultContent, setResultContent] = React.useState(
    `Completed: ${unitContent.slice(0, 100)}`,
  );

  const utils = api.useUtils();

  const completeMutation = api.feedback.completeAction.useMutation({
    onSuccess: async (data) => {
      // Create result record unit
      await createResult({ relatedUnits: data.relatedUnits });
    },
  });

  const submitMutation = api.capture.submit.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
      onClose();
    },
  });

  const [_relatedUnits, setRelatedUnits] = React.useState<{ id: string; content: string }[]>([]);

  const createResult = async ({ relatedUnits }: { relatedUnits: { id: string; content: string }[] }) => {
    setRelatedUnits(relatedUnits);
  };

  const handleComplete = () => {
    completeMutation.mutate({ unitId });
  };

  const handleSaveResult = () => {
    submitMutation.mutate({
      content: resultContent,
      projectId,
      mode: "capture",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-bg-surface p-6 shadow-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent-success" />
                <h3 className="font-heading font-semibold text-text-primary">Action Completed!</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mb-4 text-sm text-text-secondary">
              Create a result record to preserve the outcome of this action in your knowledge graph.
            </p>

            {!completeMutation.isSuccess ? (
              <div className="flex gap-2">
                <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? "Completing..." : "Mark Complete & Create Record"}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Skip
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={resultContent}
                  onChange={(e) => setResultContent(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-bg-primary p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="What was the outcome?"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveResult} disabled={submitMutation.isPending}>
                    Save Result Record
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
