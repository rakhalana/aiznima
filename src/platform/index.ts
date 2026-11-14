import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

export { platformStorage } from './storage';
export { closeOAuthBrowser, openExternalUrl, openOAuthUrl } from './browser';
export { registerNativeLifecycle, syncStatusBar } from './nativeHooks';
