import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface NativeLifecycleOptions {
  onDeepLink?: (url: string) => void;
  onBackButton?: () => boolean;
}

export async function syncStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#0B1120' : '#F8FAFC',
    });
  } catch {
    // StatusBar plugin may not be available on unsupported devices
  }
}

export function registerNativeLifecycle(options: NativeLifecycleOptions): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const urlListener = CapacitorApp.addListener(
    'appUrlOpen',
    (event: URLOpenListenerEvent) => {
      if (event.url) {
        options.onDeepLink?.(event.url);
      }
    },
  );

  const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const handled = options.onBackButton?.() ?? false;
    if (handled) {
      return;
    }

    if (canGoBack) {
      window.history.back();
      return;
    }

    void CapacitorApp.exitApp();
  });

  return () => {
    void urlListener.then((handle) => handle.remove());
    void backListener.then((handle) => handle.remove());
  };
}
