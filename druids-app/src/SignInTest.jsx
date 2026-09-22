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
import { MATCH_LABEL, providerSentence, providerLabel } from './accountLink';

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

export default function SignInTest({ auth, handicapOptions, linkedPlayer = null, match = null, providerHintFor = null }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which step the sheet opens on. Without this, 'Edit profile' fell through
  // to AuthSheet's default and asked an already signed-in captain to sign in
  // again — it only jumps to the profile by itself when there is no name yet.
  const [sheetStart, setSheetStart] = useState('signin');
  const openSheet = (at) => { setSheetStart(at); setSheetOpen(true); };
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

  const [note, setNote] = useState('');

  const doSignOut = async () => {
    setBusy(true); setNote('');
    try { await window.auth.signOut(); } catch (e) { /* shown by the state below */ }
    setBusy(false);
  };

  // Adding a second way in to the account already signed in. This is the only
  // correct answer to "I signed up with Google and now I want Apple" —
  // Firebase keeps one account per email, and a second account would split
  // the member's bookings in two.
  const addWayIn = async (which) => {
    setBusy(true); setNote('');
    try {
      await window.auth.linkProvider(which);
      setNote(`${providerLabel(which === 'google' ? 'google.com' : which === 'apple' ? 'apple.com' : 'facebook.com')} added — either will sign you in from now on.`);
    } catch (e) {
      setNote(String((e && e.message) || e).replace(/^Firebase:\s*/i, ''));
    }
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
            {' · in via '}<strong>{providerSentence(user.providers) || 'unknown'}</strong>
          </div>
          {/* Whether the club recognises this account as someone on its list,
              and on what. This is the whole point of the bench. */}
          <div style={{ ...dim, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
            {linkedPlayer
              ? <>Matched to <strong>{linkedPlayer.name}</strong> on {MATCH_LABEL[(match && match.how) === 'uid' && linkedPlayer.linkedBy ? linkedPlayer.linkedBy : (match && match.how)] || 'the player list'}.{linkedPlayer.uid ? ' Written down, so it holds even if their details change.' : ''}</>
              : match && match.candidates && match.candidates.length > 1
                ? <span style={{ color: 'var(--danger)' }}>
                    {match.candidates.length} players share that {MATCH_LABEL[match.how]} ({match.candidates.map(c => c.name).join(', ')}), so nobody is picked. Link the right one from Players.
                  </span>
                : <>Not matched to anyone on the player list. Add their email to their record in Players, or link this account there.</>}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" disabled={busy} onClick={() => openSheet('profile')}>Edit profile</button>
            <button className="btn-secondary" disabled={busy} onClick={doSignOut}>{busy ? 'Signing out…' : 'Sign out'}</button>
            {['google', 'apple'].filter(w => !(user.providers || []).includes(w === 'google' ? 'google.com' : 'apple.com')).map(w => (
              <button key={w} className="btn-secondary" disabled={busy} onClick={() => addWayIn(w)}>
                Add {providerLabel(w === 'google' ? 'google.com' : 'apple.com')}
              </button>
            ))}
          </div>
          {note && <div style={{ ...dim, marginTop: '10px', color: 'var(--burgundy)' }}>{note}</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.55 }}>
            Nobody is signed in. Try each way in before it goes out to the members.
          </div>
          <button className="btn-primary" onClick={() => openSheet('signin')}>Open the sign-in sheet</button>
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
        startAt={sheetStart}
        handicapOptions={handicapOptions}
        linkedPlayer={linkedPlayer}
        providerHintFor={providerHintFor}
      />
    </div>
  );
}
