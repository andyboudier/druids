// Who is using the app, and what they may do.
//
// The app reads `window.auth` the same way it reads `window.storage`: a small
// object with a fixed shape that a deployment may replace. This file installs
// the default — sign-in switched off — which is exactly the app as it has
// always been: nobody logs in, anyone may put their name on a chukka list, and
// the captain PIN unlocks everything.
//
// A deployment that wants real logins assigns its own provider to
// `window.auth` before the app renders (the PoloACT demo does this with
// Firebase Auth). Then:
//
//   role 'anon'    sees fixtures, the draw and live scores, but cannot book.
//   role 'member'  is signed in: books chukkas under their own name, and can
//                  take their own entry off a list.
//   role 'admin'   runs the club: chukka lists, the player database,
//                  tournaments, the team board, shop and payments — everything
//                  the captain PIN used to cover.
//
// The captain PIN stays, but with sign-in on it unlocks live scoring only, so
// whoever is on the boards can enter goals without being made an admin.
//
// The shape a provider must honour:
//
//   enabled   true when sign-in is on
//   ready     false until the first sign-in state is known (so the app does not
//             flash "sign in" at someone who is already signed in)
//   methods   which buttons to offer: 'password', 'link', 'google', 'facebook',
//             'apple'
//   user      null | { uid, email, displayName, providers }
//             providers are the ways this account can sign in
//             ('google.com', 'apple.com', 'emailLink', 'password'), which is
//             how the app can say which way someone used the first time
//   role      'anon' | 'member' | 'admin'
//   profile   null | { name, handicap, mobile, hpa } — what the member plays as
//
//   signInWithPassword(email, password)
//   createAccount(email, password)
//   sendPasswordReset(email)
//   sendSignInLink(email)          the link lands back on the app and signs in
//   signInWithGoogle() / signInWithFacebook() / signInWithApple()
//   linkProvider('google'|'facebook'|'apple')   adds a second way in to the
//                                  account already signed in
//   existingMethodsFor(email) → [method]        may be empty where the
//                                  project hides it; see accountLink.js
//   signOut()
//   saveProfile({ name, handicap, mobile, hpa })
//   listAdmins() → [email]         admins only
//   setAdmins([email])             admins only
//
// A provider dispatches `auth-changed` on window whenever any of user, role,
// profile or ready changes; useAuth() below re-reads the snapshot.

import { useEffect, useState } from 'react';

const notEnabled = async () => {
  throw new Error('Sign-in is not switched on for this club.');
};

export const noAuth = {
  enabled: false,
  ready: true,
  methods: [],
  user: null,
  role: 'anon',
  profile: null,
  signInWithPassword: notEnabled,
  createAccount: notEnabled,
  sendPasswordReset: notEnabled,
  sendSignInLink: notEnabled,
  signInWithGoogle: notEnabled,
  signInWithFacebook: notEnabled,
  signInWithApple: notEnabled,
  linkProvider: notEnabled,
  existingMethodsFor: async () => [],
  signOut: async () => {},
  saveProfile: notEnabled,
  listAdmins: async () => [],
  setAdmins: notEnabled,
};

if (typeof window !== 'undefined' && !window.auth) {
  window.auth = noAuth;
}

// The fields the app renders from, copied out so React sees a new object on
// every change and re-renders.
export const authSnapshot = () => {
  const a = (typeof window !== 'undefined' && window.auth) || noAuth;
  return {
    enabled: !!a.enabled,
    ready: a.ready !== false,
    methods: a.methods || [],
    user: a.user || null,
    role: a.role || 'anon',
    profile: a.profile || null,
    // Admins fixed by the deployment's configuration, never removable in-app.
    fixedAdmins: (a.fixedAdmins || []).map((e) => String(e).toLowerCase()),
  };
};

// Tell the app that something about the signed-in user changed.
export const announceAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
};

// A friendly line for an auth error. Firebase codes are the common case; a
// plain message passes through.
export const authErrorText = (err) => {
  const code = (err && err.code) || '';
  const table = {
    'auth/invalid-email': 'That email address looks off — please check it.',
    'auth/user-not-found': 'No account with that email. Create one below.',
    'auth/wrong-password': 'Wrong password — try again, or send yourself a sign-in link.',
    'auth/invalid-credential': 'Wrong email or password — try again, or send yourself a sign-in link.',
    'auth/email-already-in-use': 'There is already an account with that email. Sign in instead.',
    'auth/weak-password': 'Please choose a password of at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts — wait a minute and try again.',
    'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site, or use email.',
    'auth/network-request-failed': 'No connection — check your signal and try again.',
    'auth/operation-not-allowed': 'That sign-in method is not switched on yet.',
    // Firebase keeps one account per email. Whoever signed up first owns it,
    // so the second provider has to be linked rather than used on its own —
    // the common case being a Google account and a Facebook one sharing an
    // address.
    'auth/account-exists-with-different-credential': 'You already have an account with that email, made a different way. Sign in the way you did the first time.',
    'auth/credential-already-in-use': 'Those details already belong to another account.',
    'auth/unauthorized-domain': 'This address is not on the sign-in allow list for the club\u2019s Firebase project.',
  };
  if (table[code]) return table[code];
  const msg = err && err.message ? String(err.message) : '';
  return msg.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[a-z-]+\)\.?$/i, '') || 'Something went wrong — please try again.';
};

// React's view of window.auth: a snapshot that refreshes on `auth-changed`.
export function useAuth() {
  const [snap, setSnap] = useState(authSnapshot);
  useEffect(() => {
    const onChange = () => setSnap(authSnapshot());
    window.addEventListener('auth-changed', onChange);
    onChange();
    return () => window.removeEventListener('auth-changed', onChange);
  }, []);
  return snap;
}
