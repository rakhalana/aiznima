import { create } from 'zustand';
import { platformStorage } from '@/platform';
import type { UserProfile } from '@/shared/api/types';

const AUTH_STORAGE_KEY = 'aiznima:auth';
const DEFAULT_TOKEN_TTL_SECONDS = 31_536_000; // 1 year

interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  viewer: UserProfile | null;
  isHydrated: boolean;
  sessionExpiredFlag: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, expiresInSeconds?: number) => Promise<void>;
  setViewer: (viewer: UserProfile | null) => void;
  logout: () => Promise<void>;
  handleTokenExpired: () => Promise<void>;
  clearSessionExpiredFlag: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  expiresAt: null,
  viewer: null,
  isHydrated: false,
  sessionExpiredFlag: false,

  async hydrate() {
    const raw = await platformStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      set({ isHydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (
        typeof parsed.accessToken === 'string' &&
        parsed.accessToken.length > 0 &&
        typeof parsed.expiresAt === 'number' &&
        parsed.expiresAt > Date.now()
      ) {
        set({
          accessToken: parsed.accessToken,
          expiresAt: parsed.expiresAt,
          isHydrated: true,
        });
        return;
      }
    } catch {
      // Corrupt stored auth payload; reset cleanly
    }

    await platformStorage.removeItem(AUTH_STORAGE_KEY);
    set({ accessToken: null, expiresAt: null, viewer: null, isHydrated: true });
  },

  async setSession(accessToken: string, expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
    const ttlMs = (expiresInSeconds > 0 ? expiresInSeconds : DEFAULT_TOKEN_TTL_SECONDS) * 1000;
    const expiresAt = Date.now() + ttlMs;
    const payload: StoredSession = { accessToken, expiresAt };
    await platformStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    set({
      accessToken,
      expiresAt,
      sessionExpiredFlag: false,
      isHydrated: true,
    });
  },

  setViewer(viewer) {
    set({ viewer });
  },

  async logout() {
    await platformStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      accessToken: null,
      expiresAt: null,
      viewer: null,
      sessionExpiredFlag: false,
    });
  },

  async handleTokenExpired() {
    await platformStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      accessToken: null,
      expiresAt: null,
      viewer: null,
      sessionExpiredFlag: true,
    });
  },

  clearSessionExpiredFlag() {
    set({ sessionExpiredFlag: false });
  },
}));
