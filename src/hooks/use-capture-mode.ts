"use client";

import { useCallback, useRef } from "react";
import { useCaptureStore } from "~/stores/capture-store";
import { api } from "~/trpc/react";

interface UseCaptureOptions {
  projectId: string;
  onSubmitSuccess?: (unitId: string) => void;
}

export function useCaptureMode({ projectId, onSubmitSuccess }: UseCaptureOptions) {
  const isOpen = useCaptureStore((s) => s.isOpen);
  const mode = useCaptureStore((s) => s.mode);
  const pendingText = useCaptureStore((s) => s.pendingText);
  const open = useCaptureStore((s) => s.open);
  const close = useCaptureStore((s) => s.close);
  const toggle = useCaptureStore((s) => s.toggle);
  const toggleMode = useCaptureStore((s) => s.toggleMode);
  const setText = useCaptureStore((s) => s.setText);
  const clearText = useCaptureStore((s) => s.clearText);

  const utils = api.useUtils();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submitMutation = api.capture.submit.useMutation({
    onSuccess: async (data) => {
      clearText();
      // Invalidate unit list for optimistic refresh
      await utils.unit.list.invalidate();
      onSubmitSuccess?.(data.id);
    },
  });

  const submit = useCallback(async () => {
    const text = useCaptureStore.getState().pendingText.trim();
    if (!text) return;

    await submitMutation.mutateAsync({
      content: text,
      projectId,
      mode: useCaptureStore.getState().mode,
    });
  }, [projectId, submitMutation]);

  return {
    isOpen,
    mode,
    pendingText,
    isSubmitting: submitMutation.isPending,
    textareaRef,

    open,
    close,
    toggle,
    toggleMode,
    setText,
    submit,
  };
}
