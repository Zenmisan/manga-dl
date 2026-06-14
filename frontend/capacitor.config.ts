import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangadl.app',
  appName: 'manga-dl',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
      iosContentMode: 'scaleAspectFit',
      showSpinner: false,
    },
  },
};

export default config;
