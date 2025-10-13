import type { CapacitorConfig } from '@capacitor/cli';

// Optional live-reload: set DEV_SERVER_URL (e.g., http://192.168.1.10:5173)
// When defined, iOS will load the app from that URL instead of bundled files.
const devServerUrl = process.env.DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.natuition.navx',
  appName: 'NavX',
  webDir: 'dist',
  ...(devServerUrl
    ? {
      server: {
        url: devServerUrl,
        cleartext: true, // allow http for dev server
      },
    }
    : {}),
};

export default config;
