// The email link this page was opened from, if it was: a password reset, an
// address to confirm or restore, or a sign-in link. With the Firebase
// console's action URL pointed at the app, every link from every email lands
// here and the app finishes it on its own screen (AuthActionPage.jsx) —
// Firebase's hosted page never shows.
//
// Synchronous and SDK-free on purpose, so the app can ask on its first render
// without loading the auth SDK (and the demo, whose authFirebase may have no
// project configured, can import it safely).
export const EMAIL_ACTION_MODES = ['resetPassword', 'verifyEmail', 'recoverEmail', 'signIn', 'verifyAndChangeEmail'];

export function emailAction() {
  try {
    const q = new URLSearchParams(window.location.search);
    const mode = q.get('mode');
    const code = q.get('oobCode');
    if (!mode || !code || !EMAIL_ACTION_MODES.includes(mode)) return null;
    return { mode, code };
  } catch (e) { return null; }
}

// Drop the one-time code from the address bar once it has been used.
export function clearEmailAction() {
  try { window.history.replaceState({}, '', window.location.origin + window.location.pathname); } catch (e) { /* ignore */ }
}
