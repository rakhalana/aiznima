import { create } from 'zustand';
import { platformStorage, syncStatusBar } from '@/platform';
import type { MediaType } from '@/shared/api/types';

const PREFS_STORAGE_KEY = 'aiznima:prefs';
const THEME_FAST_KEY = 'aiznima:theme';

export type ThemeMode = 'light' | 'dark';

interface StoredPrefs {
  theme: ThemeMode;
  guestShowAdult: boolean;
  activeMediaType: MediaType;
}

export interface PrefsState {
  theme: ThemeMode;
  guestShowAdult: boolean;
  activeMediaType: MediaType;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setGuestShowAdult: (show: boolean) => Promise<void>;
  setActiveMediaType: (type: MediaType) => Promise<void>;
}

function applyThemeToDom(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#0B1120' : '#F8FAFC');
  }

  try {
    window.localStorage.setItem(THEME_FAST_KEY, theme);
  } catch {
    // Ignore storage restrictions
  }

  void syncStatusBar(theme);
}

async function persistPrefs(state: Pick<PrefsState, 'theme' | 'guestShowAdult' | 'activeMediaType'>) {
  const payload: StoredPrefs = {
    theme: state.theme,
    guestShowAdult: state.guestShowAdult,
    activeMediaType: state.activeMediaType,
  };
  await platformStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload));
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  theme: 'light',
  guestShowAdult: false,
  activeMediaType: 'ANIME',
  isHydrated: false,

  async hydrate() {
    const raw = await platformStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      applyThemeToDom('light');
      set({ isHydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
      const theme: ThemeMode = parsed.theme === 'dark' ? 'dark' : 'light';
      const guestShowAdult = Boolean(parsed.guestShowAdult);
      const activeMediaType: MediaType = parsed.activeMediaType === 'MANGA' ? 'MANGA' : 'ANIME';

      applyThemeToDom(theme);
      set({ theme, guestShowAdult, activeMediaType, isHydrated: true });
      return;
    } catch {
      applyThemeToDom('light');
      set({ isHydrated: true });
    }
  },

  async setTheme(theme) {
    applyThemeToDom(theme);
    set({ theme });
    await persistPrefs({ ...get(), theme });
  },

  async toggleTheme() {
    const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
    await get().setTheme(next);
  },

  async setGuestShowAdult(guestShowAdult) {
    set({ guestShowAdult });
    await persistPrefs({ ...get(), guestShowAdult });
  },

  async setActiveMediaType(activeMediaType) {
    set({ activeMediaType });
    await persistPrefs({ ...get(), activeMediaType });
  },
}));
