// Sign-in for the club, on Firebase Auth. Implements the `window.auth`
// contract described in auth.js.
//
// DORMANT BY DEFAULT. `SIGN_IN_LIVE` below is false, which means the provider
// reports `enabled: false` and the app behaves exactly as it always has:
// nobody is asked to log in, anyone may put their name on a chukka list, and
// the captain PIN unlocks everything. Every member-facing behaviour in
// PoloChukkas.jsx is gated on `auth.enabled`, so a false here is genuinely
// inert — see the list in auth.js for what flipping it to true turns on.
//
// The provider itself is real either way: it signs people in, remembers them
// between visits, and reports who they are. That is what the Sign-in panel on
// the Lessons tab exercises — behind the captain PIN, so the club can try each
// method before any of it reaches the members.
//
// Turning it on for real is this constant plus, in the club's Firebase
// console, the providers under Authentication → Sign-in method. Until one is
// enabled there its button returns auth/operation-not-allowed, which
// authErrorText renders as "That sign-in method is not switched on yet."
//
// A build can switch it on without touching this file: VITE_SIGN_IN_LIVE=1.
// That is how TPPC-Dev runs with sign-in live while the club's own build,
// which sets nothing, stays dormant — the same pattern as VITE_FIREBASE_* in
// firebase.js, so this file stays identical in both repos.
const env = import.meta.env || {};
export const SIGN_IN_LIVE = env.VITE_SIGN_IN_LIVE === '1';

// Emails that are admins whatever the config/admins document says — the way
// back in if the document is ever emptied by accident. The club fills this in
// when sign-in goes live; a build may name them in VITE_FIXED_ADMIN_EMAILS,
// comma-separated, so the addresses live in the deployment and not the code.
export const FIXED_ADMIN_EMAILS = String(env.VITE_FIXED_ADMIN_EMAILS || '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Which buttons the sheet offers, and it should name only what is switched on
// in the club's Firebase console — a button for a method that is off is a dead
// end that reports auth/operation-not-allowed when tapped.
//
// The clubs run Google, Apple, and email either way — a password for those who
// want one, an emailed link for those who would rather not keep one. Both are
// the same provider in the Firebase console (Email/Password, with "Email link"
// as a second switch beneath it), so enabling one does not enable the other.
// 'facebook' is supported by everything here and is one entry away.
export const SIGN_IN_METHODS = ['google', 'apple', 'password', 'link'];

// The one Firestore instance the app already has — never a second one; see
// the note in firebase.js about why that matters here.
import { app, db } from './firebase';
// Named imports, not a namespace one: `import * as` (or an unnarrowed dynamic
// import) keeps every export of firebase/firestore alive, which put ~36 kB
// gzipped back into the chunk every visitor loads on cold start. Deferring it
// would buy nothing anyway — storage.js has already loaded this module.
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { announceAuthChange } from './auth';
import { emailAction, clearEmailAction } from './emailAction';

const LINK_EMAIL_KEY = 'polo-signin-link-email';
const ADMINS_DOC = ['config', 'admins'];

const lower = (s) => String(s || '').trim().toLowerCase();

// firebase/auth is pulled in by install() rather than at the top of this file,
// so a member who never opens the Lessons tab never downloads the auth SDK.
// Captured here once loaded.
let FA = null;          // the firebase/auth module
let fbAuth = null;

let adminEmails = [];   // from config/admins, kept live
let stopAdminsWatch = null;
let stopProfileWatch = null;
let installed = null;   // the in-flight or finished install, so it runs once

const needAuth = () => {
  if (!fbAuth) throw new Error('Sign-in is still starting up — try again in a moment.');
};

const provider = {
  // False keeps the whole app on its old behaviour; the Lessons panel drives
  // the provider directly and does not consult this.
  enabled: SIGN_IN_LIVE,
  ready: false,
  methods: SIGN_IN_METHODS,
  fixedAdmins: FIXED_ADMIN_EMAILS,
  user: null,
  role: 'anon',
  profile: null,

  async signInWithPassword(email, password) {
    needAuth();
    await FA.signInWithEmailAndPassword(fbAuth, email, password);
  },
  async createAccount(email, password) {
    needAuth();
    await FA.createUserWithEmailAndPassword(fbAuth, email, password);
  },
  // The link comes back to the app, which sets the new password on its own
  // screen (see emailAction and AuthActionPage.jsx). Where the Firebase
  // console's action URL still points at Firebase's page, `url` is where its
  // "Continue" button returns.
  async sendPasswordReset(email) {
    needAuth();
    await FA.sendPasswordResetEmail(fbAuth, email, { url: window.location.origin + '/' });
  },

  // ── Links from emails, finished inside the app ───────────────────────────
  // A reset link: who it is for (and whether it is still good).
  async checkResetCode(code) {
    needAuth();
    return FA.verifyPasswordResetCode(fbAuth, code);
  },
  // Set the new password, then sign straight in with it — the member asked to
  // get back in, not to be sent to a sign-in screen to type it again.
  async finishReset(code, newPassword, email) {
    needAuth();
    await FA.confirmPasswordReset(fbAuth, code, newPassword);
    if (email) await FA.signInWithEmailAndPassword(fbAuth, email, newPassword);
  },
  // Confirm or restore an email address.
  async applyEmailCode(code) {
    needAuth();
    await FA.applyActionCode(fbAuth, code);
    if (fbAuth.currentUser) await fbAuth.currentUser.reload().catch(() => {});
  },
  // A sign-in link opened on a different device from the one that asked for
  // it: the address was not remembered here, so the app asks for it on its
  // own screen and finishes the sign-in with it.
  async finishLinkSignIn(email) {
    needAuth();
    await FA.signInWithEmailLink(fbAuth, String(email || '').trim(), window.location.href);
    try { localStorage.removeItem(LINK_EMAIL_KEY); } catch (e) { /* ignore */ }
    provider.pendingLink = false;
    clearEmailAction();
    announceAuthChange();
  },
  // The link brings the visitor back to this same page; completeLinkSignIn()
  // finishes the job on the way back in. The email is kept on the device so
  // the link can be completed without asking for it again.
  async sendSignInLink(email) {
    needAuth();
    await FA.sendSignInLinkToEmail(fbAuth, email, {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    });
    try { localStorage.setItem(LINK_EMAIL_KEY, email); } catch (e) { /* ignore */ }
  },
  async signInWithGoogle() {
    needAuth();
    const p = new FA.GoogleAuthProvider();
    // Always offer the account chooser: people share iPads at the club.
    p.setCustomParameters({ prompt: 'select_account' });
    await popupOrRedirect(p);
  },
  async signInWithFacebook() {
    needAuth();
    const p = new FA.FacebookAuthProvider();
    p.addScope('email');
    await popupOrRedirect(p);
  },
  async signInWithApple() {
    needAuth();
    const p = new FA.OAuthProvider('apple.com');
    p.addScope('email'); p.addScope('name');
    p.setCustomParameters({ locale: 'en_GB' });
    await popupOrRedirect(p);
  },
  async signOut() {
    needAuth();
    await FA.signOut(fbAuth);
  },
  // Firebase keeps one account per email address, so a member who signed up
  // with Google and later taps Apple is refused. This is the way through:
  // signed in already, they attach the second provider to the same account,
  // and from then on either works. Linking is the only correct fix — a second
  // account would split their bookings in two.
  async linkProvider(which) {
    needAuth();
    if (!fbAuth.currentUser) throw new Error('Sign in first, then add another way in.');
    const p = which === 'google' ? new FA.GoogleAuthProvider()
      : which === 'facebook' ? new FA.FacebookAuthProvider()
      : which === 'apple' ? new FA.OAuthProvider('apple.com')
      : null;
    if (!p) throw new Error('That sign-in method cannot be added.');
    await FA.linkWithPopup(fbAuth.currentUser, p);
    provider.user = snapshotUser(fbAuth.currentUser);
    announceAuthChange();
  },
  // A fresh ID token for the signed-in user, for the app's own endpoints
  // (/api/booking-email) to check who is asking. '' when nobody is.
  async idToken() {
    const u = fbAuth && fbAuth.currentUser;
    return u ? u.getIdToken() : '';
  },
  // Set a new password, or add one to an account that began with Google or
  // Apple so the member can also sign in with their email. Firebase asks for
  // a recent sign-in before either; the caller shows authErrorText for
  // auth/requires-recent-login and offers the reset email instead.
  async changePassword(newPassword) {
    needAuth();
    const u = fbAuth.currentUser;
    if (!u) throw new Error('Sign in first.');
    const pw = String(newPassword || '');
    if (pw.length < 8) throw new Error('Use at least 8 characters.');
    const hasPassword = (u.providerData || []).some((d) => d && d.providerId === 'password');
    if (hasPassword) await FA.updatePassword(u, pw);
    else {
      if (!u.email) throw new Error('This account has no email address to set a password on.');
      await FA.linkWithCredential(u, FA.EmailAuthProvider.credential(u.email, pw));
    }
    provider.user = snapshotUser(fbAuth.currentUser);
    announceAuthChange();
  },
  // Which ways in this account already has. Firebase's own answer is the
  // authoritative one; it is empty when the project has email-enumeration
  // protection on, which is why the club's player record keeps its own copy
  // (see accountLink.js) and the sheet prefers that when this comes back bare.
  async existingMethodsFor(email) {
    needAuth();
    try { return await FA.fetchSignInMethodsForEmail(fbAuth, String(email || '').trim()); }
    catch (e) { return []; }
  },
  async saveProfile(profile) {
    needAuth();
    if (!provider.user) throw new Error('Sign in first.');
    const clean = {
      name: String(profile.name || '').trim(),
      handicap: Number.isFinite(Number(profile.handicap)) ? Number(profile.handicap) : null,
      mobile: String(profile.mobile || '').trim(),
      hpa: String(profile.hpa || '').trim(),
      email: provider.user.email || '',
      // Normally now, but the caller may pass the timestamp it is copying
      // from. That is what lets the app seed a profile from the club's player
      // record and leave the two stamps equal — without it the seed would look
      // like a fresh edit and be pushed straight back, forever.
      updated: Number(profile.updated) || Date.now(),
    };
    await setDoc(doc(db, 'users', provider.user.uid), clean, { merge: true });
    provider.profile = clean;
    announceAuthChange();
  },
  // The member's acceptance of the club's booking terms (terms.js): the
  // version and when. On the private profile, and like savePhoto it leaves
  // `updated` alone — it is not part of the profile ↔ record reconcile.
  async acceptTerms(version) {
    needAuth();
    if (!provider.user) throw new Error('Sign in first.');
    const v = { termsVersion: String(version || ''), termsAcceptedAt: Date.now() };
    await setDoc(doc(db, 'users', provider.user.uid), v, { merge: true });
    provider.profile = { ...(provider.profile || {}), ...v };
    announceAuthChange();
  },
  // The member's own picture, on their private profile: a small data URL
  // (the app shrinks it first), or 'none' to show initials instead of the
  // sign-in's photo, or '' to go back to the sign-in's photo. Kept apart from
  // saveProfile on purpose — it must not move `updated`, which is what the
  // profile ↔ player-record reconcile compares.
  async savePhoto(photo) {
    needAuth();
    if (!provider.user) throw new Error('Sign in first.');
    const value = String(photo || '');
    if (value && value !== 'none' && !/^data:image\/(jpeg|png|webp);base64,/.test(value)) throw new Error('That is not a picture.');
    if (value.length > 300000) throw new Error('That picture is too large.');
    await setDoc(doc(db, 'users', provider.user.uid), { photo: value }, { merge: true });
    provider.profile = { ...(provider.profile || {}), photo: value };
    announceAuthChange();
  },
  async listAdmins() {
    needAuth();
    const snap = await getDoc(doc(db, ...ADMINS_DOC));
    return snap.exists() ? (snap.data().emails || []).map(lower) : [];
  },
  async setAdmins(emails) {
    needAuth();
    if (provider.role !== 'admin') throw new Error('Only an admin can change the admins.');
    await setDoc(doc(db, ...ADMINS_DOC), { emails: emails.map(lower).filter(Boolean) });
  },
};

// Pop-ups are the quicker path and work on desktop and most phones; where the
// browser refuses one (in-app browsers, some iOS setups) fall back to a full
// redirect, which getRedirectResult() completes on the way back.
async function popupOrRedirect(p) {
  // An installed PWA on iOS has no pop-up to open; go straight to redirect.
  const standalone = (window.navigator && window.navigator.standalone)
    || window.matchMedia('(display-mode: standalone)').matches;
  if (standalone) { markRedirect(); await FA.signInWithRedirect(fbAuth, p); return; }
  try {
    await FA.signInWithPopup(fbAuth, p);
  } catch (e) {
    const code = e && e.code;
    if (code === 'auth/popup-blocked'
      || code === 'auth/operation-not-supported-in-this-environment'
      || code === 'auth/cancelled-popup-request') {
      markRedirect();
      await FA.signInWithRedirect(fbAuth, p);
      return;
    }
    throw e;
  }
}

// A redirect sign-in leaves the app entirely and comes back to a cold start,
// by which time nothing has asked for the provider. This flag is what tells
// the next load to install it anyway and collect the result — see
// signInReturning() below, which main.jsx checks without loading the auth SDK.
const REDIRECT_KEY = 'polo-signin-redirect';
const markRedirect = () => { try { sessionStorage.setItem(REDIRECT_KEY, '1'); } catch (e) { /* ignore */ } };
const clearRedirect = () => { try { sessionStorage.removeItem(REDIRECT_KEY); } catch (e) { /* ignore */ } };

// True when this page load is the tail end of a sign-in: back from a
// provider's redirect, or opened from an emailed sign-in link. Deliberately
// synchronous and SDK-free so the entry point can ask before importing
// anything.
export function signInReturning() {
  try { if (sessionStorage.getItem(REDIRECT_KEY)) return true; } catch (e) { /* ignore */ }
  return !!emailAction();
}

// The fields the app renders from, plus the providers this account can sign
// in with — that last one is what lets the app tell someone which way they
// used the first time.
const snapshotUser = (u) => (u ? {
  uid: u.uid,
  email: u.email || '',
  displayName: u.displayName || '',
  // The picture the sign-in brought with it — Google gives one, Apple and a
  // password never do. A photo the member sets is kept on their profile and
  // wins over this; see savePhoto.
  photoURL: u.photoURL || ((u.providerData || []).find((d) => d && d.photoURL) || {}).photoURL || '',
  providers: (u.providerData || []).map((d) => d && d.providerId).filter(Boolean),
} : null);

const computeRole = () => {
  if (!provider.user) return 'anon';
  const e = lower(provider.user.email);
  if (e && (FIXED_ADMIN_EMAILS.includes(e) || adminEmails.includes(e))) return 'admin';
  return 'member';
};

const refreshRole = () => {
  const next = computeRole();
  if (next !== provider.role) { provider.role = next; announceAuthChange(); }
};

const watchAdmins = () => {
  if (stopAdminsWatch) return;
  stopAdminsWatch = onSnapshot(doc(db, ...ADMINS_DOC), (snap) => {
    adminEmails = snap.exists() ? (snap.data().emails || []).map(lower) : [];
    refreshRole();
  }, () => { /* rules may deny the read; role stays as computed */ });
};

const watchProfile = (uid) => {
  if (stopProfileWatch) { stopProfileWatch(); stopProfileWatch = null; }
  // profileReady says the first read has come back, so "no profile" means
  // none rather than "not loaded yet" (the terms prompt waits on it).
  provider.profileReady = false;
  if (!uid) { provider.profile = null; return; }
  stopProfileWatch = onSnapshot(doc(db, 'users', uid), (snap) => {
    provider.profile = snap.exists() ? snap.data() : null;
    provider.profileReady = true;
    announceAuthChange();
  }, () => { provider.profile = null; provider.profileReady = true; announceAuthChange(); });
};

// Finish an email-link sign-in if this page load is one.
async function completeLinkSignIn() {
  if (!FA.isSignInWithEmailLink(fbAuth, window.location.href)) return;
  let email = '';
  try { email = localStorage.getItem(LINK_EMAIL_KEY) || ''; } catch (e) { /* ignore */ }
  // Opened on another device: no address was kept here. The app asks for it
  // on its own screen (AuthActionPage.jsx) rather than a browser prompt.
  if (!email) { provider.pendingLink = true; announceAuthChange(); return; }
  try {
    await FA.signInWithEmailLink(fbAuth, email, window.location.href);
    try { localStorage.removeItem(LINK_EMAIL_KEY); } catch (e) { /* ignore */ }
    // Drop the one-time code from the address bar.
    clearEmailAction();
  } catch (e) {
    console.error('Sign-in link failed', e);
    provider.linkError = (e && e.code) || 'auth/invalid-action-code';
    announceAuthChange();
  }
}

// Load the auth SDK, put the provider on window.auth and start listening.
// Safe to call repeatedly: the first call is the one that does the work and
// every later one waits on the same promise.
export function installClubAuth() {
  if (installed) return installed;
  installed = (async () => {
    FA = await import('firebase/auth');
    fbAuth = FA.getAuth(app);
    window.auth = provider;
    await FA.setPersistence(fbAuth, FA.browserLocalPersistence).catch(() => {});
    watchAdmins();
    FA.getRedirectResult(fbAuth)
      .catch((e) => console.error('Redirect sign-in failed', e))
      .finally(clearRedirect);
    completeLinkSignIn();
    FA.onAuthStateChanged(fbAuth, (u) => {
      provider.user = snapshotUser(u);
      provider.role = computeRole();
      provider.ready = true;
      watchProfile(u ? u.uid : null);
      announceAuthChange();
    });
    return provider;
  })();
  return installed;
}

export default provider;
