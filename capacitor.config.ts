import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiznima.app',
  appName: 'Aiznima',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
