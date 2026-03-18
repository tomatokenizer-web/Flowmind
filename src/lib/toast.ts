import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  undoAction?: () => void;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
}));

/** Convenience functions for triggering toasts from anywhere */
export const toast = {
  success: (title: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
    useToastStore.getState().addToast({ type: "success", title, ...options }),

  error: (title: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
    useToastStore.getState().addToast({ type: "error", title, ...options }),

  info: (title: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
    useToastStore.getState().addToast({ type: "info", title, ...options }),

  warning: (title: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
    useToastStore.getState().addToast({ type: "warning", title, ...options }),
};
