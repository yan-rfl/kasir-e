import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kasire.app',
  appName: 'Kasir-E',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Uncomment and set your hosted URL (e.g. 'https://kasir-e.web.app' or Vercel URL)
    // for instant live web updates without reinstalling the APK:
    // url: 'https://kasir-e.web.app',
    // cleartext: true,
  },
};

export default config;
