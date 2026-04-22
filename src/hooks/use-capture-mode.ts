"use client";

import { useCallback, useRef } from "react";
import { useCaptureStore } from "~/stores/capture-store";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";

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
  const safetySessionIdRef = useRef<string | undefined>(undefined);

  // Standard capture submission (no AI)
  const submitMutation = api.capture.submit.useMutation({
    onSuccess: async (data) => {
      clearText();
      await utils.unit.list.invalidate();
      onSubmitSuccess?.(data.id);
    },
  });

  // Safety session creation mutation
  const createSafetySessionMutation = api.ai.createSafetySession.useMutation({
    onSuccess: (data) => {
      safetySessionIdRef.current = data.sessionId;
    },
  });

  // AI decomposition mutation
  const decomposeMutation = api.ai.decomposeText.useMutation({
    onSuccess: (result) => {
      const state = useCaptureStore.getState();
      const text = state.pendingText || result.proposals.map((p) => p.content).join(" ");
      setDecompositionData({
        originalText: text,
        purpose: result.purpose,
        proposals: result.proposals,
        relationProposals: result.relationProposals,
        isStructuredDiscourse: result.isStructuredDiscourse,
      });
      setPhase("reviewing");
      if (!state.isOpen) {
        useCaptureStore.setState({ pendingReview: true });
        toast.success("Decomposition ready", {
          description: `${result.proposals.length} units found. Open capture to review.`,
          duration: 15000,
          action: {
            label: "Review",
            onClick: () => useCaptureStore.getState().openPendingReview(),
          },
        });
      }
    },
    onError: (error) => {
      console.error("Decomposition failed:", error);
      setPhase("input");
      const msg = error.message ?? "AI decomposition failed. Please try again.";
      if (msg.includes("credit") || msg.includes("balance") || msg.includes("PRECONDITION_FAILED")) {
        setErrorMessage("AI credits exhausted. Please add credits at console.anthropic.com.");
      } else if (msg.includes("API key") || msg.includes("ANTHROPIC_API_KEY") || msg.includes("UNAUTHORIZED")) {
        setErrorMessage("AI is unavailable. Check your Anthropic API key in .env.");
      } else if (msg.includes("Rate limit") || msg.includes("TOO_MANY_REQUESTS") || msg.includes("rate limit")) {
        setErrorMessage("Too many requests. Please wait a moment and try again.");
      } else if (msg.includes("CONFLICT") || msg.includes("duplicate")) {
        setErrorMessage("A unit with identical content already exists.");
      } else {
        setErrorMessage(`AI decomposition failed: ${msg}`);
      }
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
      // Create a safety session if one doesn't exist yet for this capture session
      if (!safetySessionIdRef.current) {
        const sessionResult = await createSafetySessionMutation.mutateAsync();
        safetySessionIdRef.current = sessionResult.sessionId;
      }
      // Validate contextId is a real UUID before passing (empty string breaks Zod validation)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validContextId = contextId && uuidRegex.test(contextId) ? contextId : undefined;
      await decomposeMutation.mutateAsync({
        text,
        contextId: validContextId,
        projectId,
        sessionId: safetySessionIdRef.current,
      });
    } else {
      // In capture mode, direct submission
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCtxId = contextId && uuidRegex.test(contextId) ? contextId : undefined;
      await submitMutation.mutateAsync({
        content: text,
        projectId,
        contextId: validCtxId,
        mode: currentMode,
      });
    }
  }, [projectId, contextId, submitMutation, decomposeMutation, createSafetySessionMutation, setPhase]);

  // Handle decomposition review completion
  const handleDecompositionComplete = useCallback(
    (acceptedCount: number, rejectedCount: number) => {
      safetySessionIdRef.current = undefined;
      resetToInput();
      onDecompositionComplete?.(acceptedCount, rejectedCount);
    },
    [resetToInput, onDecompositionComplete]
  );

  // Cancel decomposition review and return to input
  const cancelDecomposition = useCallback(() => {
    safetySessionIdRef.current = undefined;
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
