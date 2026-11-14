import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function openOAuthUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url,
      presentationStyle: 'popover',
    });
    return;
  }

  window.location.assign(url);
}

export async function closeOAuthBrowser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await Browser.close();
  } catch {
    // Chrome Custom Tabs on Android may auto-dismiss via singleTask intent
  }
}
