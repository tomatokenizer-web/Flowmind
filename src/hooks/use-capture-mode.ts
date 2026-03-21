"use client";

import { useCallback, useRef } from "react";
import { useCaptureStore } from "~/stores/capture-store";
import { api } from "~/trpc/react";

interface UseCaptureOptions {
  projectId: string;
  contextId: string;
  onSubmitSuccess?: (unitId: string) => void;
  onDecompositionComplete?: (acceptedCount: number, rejectedCount: number) => void;
}

export function useCaptureMode({
  projectId,
  contextId,
  onSubmitSuccess,
  onDecompositionComplete,
}: UseCaptureOptions) {
  const isOpen = useCaptureStore((s) => s.isOpen);
  const mode = useCaptureStore((s) => s.mode);
  const phase = useCaptureStore((s) => s.phase);
  const pendingText = useCaptureStore((s) => s.pendingText);
  const decompositionData = useCaptureStore((s) => s.decompositionData);
  const open = useCaptureStore((s) => s.open);
  const close = useCaptureStore((s) => s.close);
  const toggle = useCaptureStore((s) => s.toggle);
  const toggleMode = useCaptureStore((s) => s.toggleMode);
  const setText = useCaptureStore((s) => s.setText);
  const clearText = useCaptureStore((s) => s.clearText);
  const setPhase = useCaptureStore((s) => s.setPhase);
  const setDecompositionData = useCaptureStore((s) => s.setDecompositionData);
  const resetToInput = useCaptureStore((s) => s.resetToInput);
  const setErrorMessage = useCaptureStore((s) => s.setErrorMessage);

  const utils = api.useUtils();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Standard capture submission (no AI)
  const submitMutation = api.capture.submit.useMutation({
    onSuccess: async (data) => {
      clearText();
      await utils.unit.list.invalidate();
      onSubmitSuccess?.(data.id);
    },
  });

  // AI decomposition mutation
  const decomposeMutation = api.ai.decomposeText.useMutation({
    onSuccess: (result) => {
      const text = useCaptureStore.getState().pendingText;
      setDecompositionData({
        originalText: text,
        purpose: result.purpose,
        proposals: result.proposals,
        relationProposals: result.relationProposals,
      });
      setPhase("reviewing");
    },
    onError: (error) => {
      console.error("Decomposition failed:", error);
      // Fall back to input phase and show error to user
      setPhase("input");
      const msg = error instanceof Error ? error.message : "AI decomposition failed. Please try again.";
      setErrorMessage(msg.includes("ANTHROPIC_API_KEY") || msg.includes("API") 
        ? "AI is unavailable. Check your Anthropic API key in .env." 
        : "AI decomposition failed. Please try again or use Capture mode.");
    },
  });

  // Submit handler - branches based on mode
  const submit = useCallback(async () => {
    const text = useCaptureStore.getState().pendingText.trim();
    if (!text) return;

    const currentMode = useCaptureStore.getState().mode;

    if (currentMode === "organize") {
      // In organize mode, trigger AI decomposition
      setPhase("decomposing");
      // Validate contextId is a real UUID before passing (empty string breaks Zod validation)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validContextId = contextId && uuidRegex.test(contextId) ? contextId : undefined;
      await decomposeMutation.mutateAsync({
        text,
        contextId: validContextId,
        projectId,
      });
    } else {
      // In capture mode, direct submission
      await submitMutation.mutateAsync({
        content: text,
        projectId,
        mode: currentMode,
      });
    }
  }, [projectId, contextId, submitMutation, decomposeMutation, setPhase]);

  // Handle decomposition review completion
  const handleDecompositionComplete = useCallback(
    (acceptedCount: number, rejectedCount: number) => {
      resetToInput();
      onDecompositionComplete?.(acceptedCount, rejectedCount);
    },
    [resetToInput, onDecompositionComplete]
  );

  // Cancel decomposition review and return to input
  const cancelDecomposition = useCallback(() => {
    resetToInput();
  }, [resetToInput]);

  const errorMessage = useCaptureStore((s) => s.errorMessage);

  return {
    isOpen,
    mode,
    phase,
    pendingText,
    decompositionData,
    errorMessage,
    isSubmitting: submitMutation.isPending,
    isDecomposing: decomposeMutation.isPending,
    textareaRef,

    open,
    close,
    toggle,
    toggleMode,
    setText,
    submit,
    handleDecompositionComplete,
    cancelDecomposition,
  };
}
