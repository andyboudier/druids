import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './storage'; // attaches window.storage backed by Firestore
import DruidsApp from './DruidsApp.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DruidsApp />
  </React.StrictMode>
);

// Dismiss the native splash as soon as React has actually painted, instead of
// letting it sit for the full launchShowDuration on every launch. Once it goes
// the app's own loading screen (crest + spinner) takes over, so the user sees
// progress rather than a static image.
//
// launchAutoHide deliberately stays TRUE in capacitor.config.ts: it is the
// failsafe. If this code never runs — the bundle fails to load, or the device
// is offline on a cold start — the splash still clears on its own rather than
// leaving the app looking frozen. Hiding early here and auto-hiding late there
// are complementary, not alternatives.
if (Capacitor.isNativePlatform()) {
  // Two frames: the first is scheduled before paint, the second after it, so we
  // only hide once there is something on screen to replace the splash with.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {}); // best-effort; the auto-hide failsafe still applies
  }));
}

// App-shell caching: registering the service worker lets cold starts serve the
// content-hashed JS/CSS from the on-device cache instead of re-downloading them.
// index.html stays network-first inside the worker, so the ~90s web-update path
// is preserved (see public/sw.js). Registration is best-effort — any failure
// (e.g. a WebView without service-worker support) is ignored and the app runs as
// before.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
