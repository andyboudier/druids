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
export const SIGN_IN_LIVE = false;

// Emails that are admins whatever the config/admins document says — the way
// back in if the document is ever emptied by accident. The club fills this in
// when sign-in goes live.
export const FIXED_ADMIN_EMAILS = [];

// Which buttons the sheet offers. Listing one here does not switch it on:
// Firebase decides that, and a method not enabled in the console simply
// errors when tapped. Facebook and Apple each need an account with the
// provider (a Facebook app; an Apple Services ID and key) before they work.
export const SIGN_IN_METHODS = ['password', 'link', 'google', 'facebook', 'apple'];

// The one Firestore instance the app already has — never a second one; see
// the note in firebase.js about why that matters here.
import { app, db } from './firebase';
// Named imports, not a namespace one: `import * as` (or an unnarrowed dynamic
// import) keeps every export of firebase/firestore alive, which put ~36 kB
// gzipped back into the chunk every visitor loads on cold start. Deferring it
// would buy nothing anyway — storage.js has already loaded this module.
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { announceAuthChange } from './auth';

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
  async sendPasswordReset(email) {
    needAuth();
    await FA.sendPasswordResetEmail(fbAuth, email);
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
  async saveProfile(profile) {
    needAuth();
    if (!provider.user) throw new Error('Sign in first.');
    const clean = {
      name: String(profile.name || '').trim(),
      handicap: Number.isFinite(Number(profile.handicap)) ? Number(profile.handicap) : null,
      mobile: String(profile.mobile || '').trim(),
      hpa: String(profile.hpa || '').trim(),
      email: provider.user.email || '',
      updated: Date.now(),
    };
    await setDoc(doc(db, 'users', provider.user.uid), clean, { merge: true });
    provider.profile = clean;
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
  const s = String(window.location.href || '');
  return s.includes('mode=signIn') && s.includes('oobCode=');
}

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
  if (!uid) { provider.profile = null; return; }
  stopProfileWatch = onSnapshot(doc(db, 'users', uid), (snap) => {
    provider.profile = snap.exists() ? snap.data() : null;
    announceAuthChange();
  }, () => { provider.profile = null; announceAuthChange(); });
};

// Finish an email-link sign-in if this page load is one.
async function completeLinkSignIn() {
  if (!FA.isSignInWithEmailLink(fbAuth, window.location.href)) return;
  let email = '';
  try { email = localStorage.getItem(LINK_EMAIL_KEY) || ''; } catch (e) { /* ignore */ }
  if (!email) email = window.prompt('Confirm the email address the sign-in link was sent to') || '';
  if (!email) return;
  try {
    await FA.signInWithEmailLink(fbAuth, email, window.location.href);
    try { localStorage.removeItem(LINK_EMAIL_KEY); } catch (e) { /* ignore */ }
    // Drop the one-time code from the address bar.
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  } catch (e) {
    console.error('Sign-in link failed', e);
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
      provider.user = u
        ? { uid: u.uid, email: u.email || '', displayName: u.displayName || '' }
        : null;
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
