import { create } from 'zustand';

interface LoginPromptState {
  isOpen: boolean;
  reason: string | null;
  returnTo: string | null;
  openLoginPrompt: (reason?: string, returnTo?: string) => void;
  closeLoginPrompt: () => void;
}

export const useLoginPromptStore = create<LoginPromptState>((set) => ({
  isOpen: false,
  reason: null,
  returnTo: null,

  openLoginPrompt(reason, returnTo) {
    const fallbackPath =
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
    set({
      isOpen: true,
      reason: reason ?? null,
      returnTo: returnTo ?? fallbackPath,
    });
  },

  closeLoginPrompt() {
    set({ isOpen: false, reason: null, returnTo: null });
  },
}));
