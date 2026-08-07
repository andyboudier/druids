import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.druidspolo.poloact',
  appName: 'Druids PoloACT',
  webDir: 'dist', // Vite's default build output
  ios: {
    contentInset: 'always',
    backgroundColor: '#231F20',
    // Allow Firestore + FCM long-lived connections through the WebView
    limitsNavigationsToAppBoundDomains: false,
    // Prevent gesture-based navigation overriding our React Router
    handleApplicationNotifications: true,
  },
  server: {
    // Remote-load mode: the app loads the live web app (the club's own
    // poloact.co.uk domain, served by Vercel), so web changes appear instantly
    // without re-archiving. Native/Watch changes still need an archive. To
    // revert to local-bundle (friendlier for App Store submission review),
    // comment out the url + cleartext lines below.
    // NOTE: changing this URL points the app at a different origin, so each
    // device re-downloads the shell once before caches warm up again.
    url: 'https://druids.poloact.co.uk',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // src/main.jsx calls SplashScreen.hide() as soon as React paints, so on a
      // normal launch the splash clears well before this duration — it is not a
      // fixed wait. launchAutoHide stays true as the failsafe for the case where
      // that code never runs (bundle fails to load, offline cold start), so the
      // splash can never strand the app on a static image.
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#231F20', // club ink
      showSpinner: false,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK', // light text/icons on the black header
      backgroundColor: '#231F20',
      overlaysWebView: false,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
