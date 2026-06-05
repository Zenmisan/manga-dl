import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangadl.app',
  appName: 'manga-dl',
  webDir: 'dist',
  server: {
    // Allow overriding backend URL via localStorage on the web layer
    androidScheme: 'https',
  },
};

export default config;
