import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.druidspolo.poloact',
  appName: 'Druids PoloACT',
  webDir: 'dist', // Vite's default build output
  ios: {
    contentInset: 'always',
    backgroundColor: '#1B1919',
    // Allow Firestore + FCM long-lived connections through the WebView
    limitsNavigationsToAppBoundDomains: false,
    // Prevent gesture-based navigation overriding our React Router
    handleApplicationNotifications: true,
  },
  server: {
    // Remote-load mode: the app loads the live web app from Vercel, so web
    // changes appear instantly without re-archiving. Native/Watch changes still
    // need an archive. To revert to local-bundle (friendlier for App Store
    // submission review), comment out the url + cleartext lines below.
    url: 'https://druids-poloact.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1B1919', // club ink
      showSpinner: false,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK', // light text/icons on the black header
      backgroundColor: '#1B1919',
      overlaysWebView: false,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
