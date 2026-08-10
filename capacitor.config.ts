import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.dhbw.raplaplan',
  appName: 'DHBW Planner',
  webDir: 'dist',
  // Plugin-Aufrufe koennen Zugangsdaten enthalten. Auch Debug-Builds duerfen
  // diese deshalb nicht im nativen Android-/iOS-Protokoll ausgeben.
  loggingBehavior: 'none',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#E2001A',
    },
    CapacitorCookies: {
      // DualisClient verwaltet Session-Cookies bewusst nur im Speicher und
      // meldet sich nach einem Neustart mit dem Secure-Storage-Secret neu an.
      // Der Mail-Tab nutzt dagegen seine eigene native WebView-Datenbank.
      enabled: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
