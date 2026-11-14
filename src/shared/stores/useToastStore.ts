import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  rateLimitUntil: number | null;
  isOffline: boolean;
  addToast: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismissToast: (id: string) => void;
  setRateLimitUntil: (timestamp: number | null) => void;
  setIsOffline: (offline: boolean) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  rateLimitUntil: null,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,

  addToast({ variant, message, action, durationMs = 4000 }) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, variant, message, action, durationMs }],
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, durationMs);
    }

    return id;
  },

  dismissToast(id) {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setRateLimitUntil(rateLimitUntil) {
    set({ rateLimitUntil });
  },

  setIsOffline(isOffline) {
    set({ isOffline });
  },
}));
