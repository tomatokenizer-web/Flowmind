import { create } from "zustand";
import { devtools } from "zustand/middleware";

type PassStatus = "pending" | "running" | "complete" | "error";

interface ReviewItem {
  id: string;
  unitId: string;
  type: "type_suggestion" | "relation_suggestion" | "split_suggestion" | "quality_flag";
  description: string;
  suggestion: string;
  confidence: number;
  createdAt: Date;
}

interface PipelineState {
  isProcessing: boolean;
  currentPass: number | null;
  passProgress: Record<number, PassStatus>;
  pendingReviews: ReviewItem[];

  startProcessing: () => void;
  setPassStatus: (pass: number, status: PassStatus) => void;
  finishProcessing: () => void;
  addReviewItem: (item: ReviewItem) => void;
  resolveReviewItem: (id: string, action: "accept" | "reject" | "edit") => void;
  clearReviews: () => void;
}

const INITIAL_PASS_PROGRESS: Record<number, PassStatus> = {
  1: "pending",
  2: "pending",
  3: "pending",
  4: "pending",
  5: "pending",
  6: "pending",
  7: "pending",
};

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set) => ({
      isProcessing: false,
      currentPass: null,
      passProgress: { ...INITIAL_PASS_PROGRESS },
      pendingReviews: [],

      startProcessing: () =>
        set(
          {
            isProcessing: true,
            currentPass: 1,
            passProgress: { ...INITIAL_PASS_PROGRESS, 1: "running" },
          },
          false,
          "startProcessing",
        ),

      setPassStatus: (pass, status) =>
        set(
          (state) => {
            const nextProgress = { ...state.passProgress, [pass]: status };
            let nextPass = state.currentPass;

            // Auto-advance to next pass when current completes
            if (status === "complete" && pass === state.currentPass && pass < 7) {
              nextPass = pass + 1;
              nextProgress[pass + 1] = "running";
            }

            return { passProgress: nextProgress, currentPass: nextPass };
          },
          false,
          "setPassStatus",
        ),

      finishProcessing: () =>
        set(
          { isProcessing: false, currentPass: null },
          false,
          "finishProcessing",
        ),

      addReviewItem: (item) =>
        set(
          (state) => ({
            pendingReviews: [...state.pendingReviews, item],
          }),
          false,
          "addReviewItem",
        ),

      resolveReviewItem: (id, _action) =>
        set(
          (state) => ({
            pendingReviews: state.pendingReviews.filter((r) => r.id !== id),
          }),
          false,
          "resolveReviewItem",
        ),

      clearReviews: () =>
        set({ pendingReviews: [] }, false, "clearReviews"),
    }),
    { name: "PipelineStore" },
  ),
);

export type { PipelineState, ReviewItem, PassStatus };
