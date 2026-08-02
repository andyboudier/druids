import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// A Firebase *web* config is not a secret — it identifies the project to the
// client and is safe to commit. Access is controlled by the Firestore rules
// (public read, authenticated write) plus the anonymous sign-in below.
//
// Paste the six values from Firebase console → Project settings → Your apps →
// Web app, or set the matching VITE_FIREBASE_* environment variables in Vercel
// (env vars win, so a preview deployment can point at a different project).
const env = import.meta.env || {};
export const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY             || 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN         || 'druids-lodge-polo.firebaseapp.com',
  projectId:         env.VITE_FIREBASE_PROJECT_ID          || 'druids-lodge-polo',
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET      || 'druids-lodge-polo.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId:             env.VITE_FIREBASE_APP_ID              || 'REPLACE_WITH_APP_ID',
};

export const app = initializeApp(firebaseConfig);

// Plain Firestore (no on-device persistent cache). The persistent IndexedDB
// cache was reverted: on a cold start it could briefly serve a STALE snapshot,
// and the app performs destructive actions on load (the weekly roster auto-clear
// deletes a day's roster based on the value it reads). A stale read there could
// delete a current roster on the server, losing sign-ups. Reading straight from
// the server on cold start avoids that whole class of bug. storage.js imports
// this single `db` instance.
export const db = getFirestore(app);

// ── Silent anonymous auth ────────────────────────────────────────────────
// The Firestore rules allow anyone to READ (public scoreboard, Watch app) but
// only signed-in clients to WRITE. Nobody logs in — the app signs itself in
// anonymously in the background, so a member never sees an auth screen.
//
// `authReady` resolves once a user exists. storage.js awaits it before any
// set/delete, so the first write of a session cannot race sign-in and get
// rejected. It resolves rather than rejects on failure: reads still work, and a
// failed write then surfaces through the caller's own error handling.
export const auth = getAuth(app);

export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
  });
  signInAnonymously(auth).catch((err) => {
    // Most likely cause: the Anonymous provider is not enabled in the Firebase
    // console (Authentication → Sign-in method → Anonymous → Enable).
    console.error('Anonymous sign-in failed — writes will be rejected.', err);
    resolve(null);
  });
});
