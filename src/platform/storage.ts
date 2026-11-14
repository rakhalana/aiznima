import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const platformStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch {
        return null;
      }
    }

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
      } catch {
        // Ignore storage write errors on restricted environments
      }
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore private mode quota errors
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.remove({ key });
      } catch {
        // Ignore storage errors
      }
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};
