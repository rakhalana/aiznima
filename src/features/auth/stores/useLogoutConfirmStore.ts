import { create } from 'zustand';

interface LogoutConfirmState {
  isOpen: boolean;
  openLogoutConfirm: () => void;
  closeLogoutConfirm: () => void;
}

export const useLogoutConfirmStore = create<LogoutConfirmState>((set) => ({
  isOpen: false,

  openLogoutConfirm() {
    set({ isOpen: true });
  },

  closeLogoutConfirm() {
    set({ isOpen: false });
  },
}));
