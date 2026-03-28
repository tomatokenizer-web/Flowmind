import { useCallback } from "react";
import { api } from "~/trpc/react";
import { usePipelineStore } from "@/stores/pipeline-store";
import type { ReviewItem } from "@/stores/pipeline-store";

/**
 * AI pipeline integration hook.
 * Wraps pipeline store state with tRPC mutations for lifecycle transitions.
 */
export function usePipeline() {
  const store = usePipelineStore();
  const utils = api.useUtils();

  const transitionMutation = api.pipeline.transition.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
    },
  });

  const batchTransitionMutation = api.pipeline.batchTransition.useMutation({
    onSuccess: () => {
      void utils.unit.list.invalidate();
    },
  });

  const processInput = useCallback(
    async (text: string) => {
      store.startProcessing();

      try {
        // Pass 1-7 would be orchestrated here by the AI pipeline service.
        // For now, we expose the state management hooks and let the
        // pipeline service drive the passes via store actions.
        //
        // The actual AI processing will be handled by Trigger.dev jobs
        // invoked through a dedicated tRPC endpoint (future).
        void text; // consumed by pipeline service
      } catch {
        store.finishProcessing();
      }
    },
    [store],
  );

  const reviewDraft = useCallback(
    async (unitId: string, action: "accept" | "reject" | "edit") => {
      if (action === "accept") {
        await transitionMutation.mutateAsync({
          unitId,
          to: "confirmed",
        });
      } else if (action === "reject") {
        await transitionMutation.mutateAsync({
          unitId,
          to: "discarded",
        });
      }
      // "edit" action is handled by the UI — no transition needed

      // Find and resolve the matching review item
      const review = store.pendingReviews.find((r) => r.unitId === unitId);
      if (review) {
        store.resolveReviewItem(review.id, action);
      }
    },
    [transitionMutation, store],
  );

  const batchTransition = useCallback(
    async (
      unitIds: string[],
      to: "draft" | "pending" | "confirmed" | "deferred" | "complete" | "archived" | "discarded",
    ) => {
      return batchTransitionMutation.mutateAsync({ unitIds, to });
    },
    [batchTransitionMutation],
  );

  return {
    // State
    isProcessing: store.isProcessing,
    currentPass: store.currentPass,
    passProgress: store.passProgress,
    pendingReviews: store.pendingReviews,
    reviewCount: store.pendingReviews.length,

    // Actions
    processInput,
    reviewDraft,
    batchTransition,
    addReviewItem: store.addReviewItem as (item: ReviewItem) => void,
    clearReviews: store.clearReviews,

    // Pass control (for pipeline service)
    setPassStatus: store.setPassStatus,
    finishProcessing: store.finishProcessing,

    // Loading
    isTransitioning: transitionMutation.isPending,
    isBatchTransitioning: batchTransitionMutation.isPending,
  };
}
