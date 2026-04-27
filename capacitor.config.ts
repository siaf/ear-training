import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.fifths.app',
  appName: 'Fifths',
  webDir: 'dist',
  backgroundColor: '#fff8ef',
  ios: {
    // We handle safe-area insets in CSS via env(). Letting the WebView also
    // auto-adjust causes double-counting — extra margins top and bottom.
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#fff8ef',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#fff8ef',
      // Overlay on top of the WebView so env(safe-area-inset-top) covers the
      // status-bar height without it also stealing WebView space.
      overlaysWebView: true,
    },
  },
};

export default config;
