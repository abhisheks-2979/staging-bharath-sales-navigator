import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kvp.salesnavigator',
  appName: 'SalesNavigator',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    // Enable WebView for better storage persistence
    webContentsDebuggingEnabled: true
  },
  // Ensure proper data persistence
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;