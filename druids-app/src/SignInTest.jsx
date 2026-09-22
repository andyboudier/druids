// The sign-in bench: a captain-only panel for trying logins before any of it
// reaches the members.
//
// Sign-in is dormant for the club (authFirebase.js, SIGN_IN_LIVE), so the rest
// of the app still sees `auth.enabled === false` and behaves exactly as it
// always has. This panel drives the provider directly instead, which is why it
// hands AuthSheet a snapshot with `enabled: true` — the sheet renders from that
// object but calls every action on `window.auth`, so it is the real sheet
// members will eventually get, doing real sign-ins against the club's Firebase
// project.
//
// It lives on the Lessons tab, which is behind the captain PIN.
import React, { useEffect, useState } from 'react';
import AuthSheet from './AuthSheet';

const METHOD_LABEL = {
  password: 'Email & password',
  link: 'Email sign-in link',
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
};

const box = {
  border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--cream-pale)',
  padding: '14px 16px', marginBottom: '18px',
};
const dim = { fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6 };

export default function SignInTest({ auth, handicapOptions, linkedPlayer = null }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [starting, setStarting] = useState(true);
  const [installError, setInstallError] = useState('');
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);

  // authFirebase is imported here rather than at the top of the file, and for
  // two reasons. It keeps the auth SDK off every member's cold start — they
  // never open this tab. And it keeps the module's side effects out of apps
  // that do not want them: the demo ships its own authFirebase, whose
  // firebase.js initialises a project that may not be configured, and a static
  // import would run that on load and throw before anything rendered.
  useEffect(() => {
    let alive = true;
    import('./authFirebase')
      .then((m) => m.installClubAuth().then(() => {
        if (!alive) return;
        setLive(!!m.SIGN_IN_LIVE);
        setStarting(false);
      }))
      .catch((e) => { if (alive) { setStarting(false); setInstallError(String((e && e.message) || e)); } });
    return () => { alive = false; };
  }, []);

  const user = auth.user;
  const methods = auth.methods || [];

  const doSignOut = async () => {
    setBusy(true);
    try { await window.auth.signOut(); } catch (e) { /* shown by the state below */ }
    setBusy(false);
  };

  return (
    <div style={box}>
      <div className="label-eyebrow" style={{ fontSize: '11px', marginBottom: '6px' }}>Sign-in · testing</div>

      {starting ? (
        <div style={dim}>Starting sign-in…</div>
      ) : installError ? (
        <div style={{ ...dim, color: 'var(--danger)' }}>Sign-in could not start: {installError}</div>
      ) : user ? (
        <>
          <div style={{ fontSize: '14px', color: 'var(--ink)', marginBottom: '2px' }}>
            Signed in as <strong>{user.displayName || user.email || 'this account'}</strong>
          </div>
          <div style={dim}>
            {user.email || 'no email on this account'} · would be <strong>{auth.role}</strong>
            {auth.profile && auth.profile.name ? ` · profile: ${auth.profile.name}` : ' · no profile saved yet'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" disabled={busy} onClick={() => setSheetOpen(true)}>Edit profile</button>
            <button className="btn-secondary" disabled={busy} onClick={doSignOut}>{busy ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.55 }}>
            Nobody is signed in. Try each way in before it goes out to the members.
          </div>
          <button className="btn-primary" onClick={() => setSheetOpen(true)}>Open the sign-in sheet</button>
        </>
      )}

      {!starting && !installError && (
        <div style={{ ...dim, marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
          Offered: {methods.map((m) => METHOD_LABEL[m] || m).join(' · ') || 'none'}.
          {' '}A method still switched off in the club’s Firebase project says so when you tap it.
          {!live && <> Signing in here changes nothing for members — booking stays open to everyone until sign-in goes live.</>}
        </div>
      )}

      {/* enabled: true is what makes the sheet usable while the app at large
          still has sign-in switched off. See the note at the top. */}
      <AuthSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        auth={{ ...auth, enabled: true }}
        handicapOptions={handicapOptions}
        linkedPlayer={linkedPlayer}
      />
    </div>
  );
}
