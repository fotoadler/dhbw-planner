import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.dhbw.raplaplan',
  appName: 'DHBW Planner',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#E2001A',
    },
    CapacitorCookies: {
      // DualisClient verwaltet Session-Cookies bewusst nur im Speicher.
      // Die automatische native/WebView-Persistenz darf keine Session über
      // Logout, App-Neustart oder Geräte-Backups hinweg aufbewahren.
      enabled: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
