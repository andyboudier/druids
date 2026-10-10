import React, { useEffect, useRef, useState } from 'react';
import { authErrorText } from './auth';
import { TERMS_CLUB } from './terms';

// Links from the club's emails, finished inside the app rather than on
// Firebase's own page: choose a new password, confirm or restore an email
// address, or finish a sign-in link opened on another device. It covers the
// whole screen in the club's dark look, and hands back to Home when done.
//
// `action` is { mode, code } from the address bar (authFirebase.emailAction),
// or { mode: 'signIn', pending: true } when a sign-in link needs its address.
// `ready` is true once the sign-in provider has woken; nothing is called
// before that.

// The club's dark colours, from its own terms.js, so this file is the same in
// every app.
const C = { card2: TERMS_CLUB.colors.card, dim: TERMS_CLUB.colors.muted, ...TERMS_CLUB.colors };
const field = {
  width: '100%', minHeight: 52, padding: '0 16px', borderRadius: 14, background: C.card2,
  border: `1px solid ${C.line}`, color: C.cream, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const label = { display: 'block', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.muted, margin: '16px 0 6px' };
const primary = {
  width: '100%', minHeight: 56, borderRadius: 16, background: C.burg, border: `1px solid ${C.gold}`, color: C.cream,
  fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, cursor: 'pointer', marginTop: 20,
};

const EXPIRED = ['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found'];

export default function AuthActionPage({ action, ready, onDone, onRequestNew }) {
  const [phase, setPhase] = useState('checking'); // checking | form | done | error
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneText, setDoneText] = useState('');
  const headRef = useRef(null);
  const mode = action.mode;

  useEffect(() => { headRef.current && headRef.current.focus(); }, [phase]);

  // Work out what the link is before showing anything.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      try {
        if (mode === 'resetPassword') {
          const who = await window.auth.checkResetCode(action.code);
          if (alive) { setEmail(who || ''); setPhase('form'); }
        } else if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail') {
          await window.auth.applyEmailCode(action.code);
          if (alive) { setDoneText('Your email address is confirmed.'); setPhase('done'); }
        } else if (mode === 'recoverEmail') {
          await window.auth.applyEmailCode(action.code);
          if (alive) { setDoneText('Your email address has been put back. If you didn’t make that change, set a new password now.'); setPhase('done'); }
        } else if (mode === 'signIn') {
          if (action.error) throw Object.assign(new Error(''), { code: action.error });
          if (alive) setPhase(action.pending ? 'form' : 'checking');
        }
      } catch (e) {
        if (alive) { setError(e && e.code ? e.code : String((e && e.message) || e)); setPhase('error'); }
      }
    })();
    return () => { alive = false; };
  }, [ready, mode, action.code, action.pending, action.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveReset = async () => {
    if (pw.a.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw.a !== pw.b) { setError('The two passwords don’t match.'); return; }
    setBusy(true); setError('');
    try {
      await window.auth.finishReset(action.code, pw.a, email);
      setDoneText('Your password is changed and you’re signed in.');
      setPhase('done');
    } catch (e) {
      if (e && EXPIRED.includes(e.code)) { setError(e.code); setPhase('error'); }
      else setError(authErrorText(e) || String((e && e.message) || e));
    }
    setBusy(false);
  };

  const finishLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter the email address the link was sent to.'); return; }
    setBusy(true); setError('');
    try {
      await window.auth.finishLinkSignIn(email);
      setDoneText('You’re signed in.');
      setPhase('done');
    } catch (e) {
      if (e && EXPIRED.includes(e.code)) { setError(e.code); setPhase('error'); }
      else setError(authErrorText(e) || String((e && e.message) || e));
    }
    setBusy(false);
  };

  const title = phase === 'error' ? 'That link has expired'
    : phase === 'done' ? (mode === 'resetPassword' ? 'Password changed' : mode === 'signIn' ? 'Welcome back' : 'All done')
    : mode === 'resetPassword' ? 'Choose a new password'
    : mode === 'signIn' ? 'Confirm your email'
    : 'One moment…';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="aa-title"
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: C.bg, color: C.cream, overflowY: 'auto',
        fontFamily: "'Outfit', system-ui, sans-serif", padding: 'calc(env(safe-area-inset-top,0px) + 48px) 20px 40px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <img src={TERMS_CLUB.crest} alt={TERMS_CLUB.name} width="96" height="96"
            style={{ width: 96, height: 96, objectFit: 'contain', ...(TERMS_CLUB.crestRound ? { borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 1.5px ${C.gold}` } : {}) }} />
          <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: C.muted, marginTop: 6 }}>{TERMS_CLUB.name}</div>
          <h1 id="aa-title" ref={headRef} tabIndex={-1} style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 30, lineHeight: 1.15, margin: 0, outline: 'none' }}>{title}</h1>
        </div>

        {phase === 'checking' && (
          <div role="status" style={{ textAlign: 'center', color: C.muted, marginTop: 24, fontSize: 14 }}>Checking your link…</div>
        )}

        {phase === 'form' && mode === 'resetPassword' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReset(); }} style={{ marginTop: 18 }}>
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, lineHeight: 1.5 }}>For <strong style={{ color: C.cream }}>{email}</strong>. At least 8 characters.</div>
            <input type="email" autoComplete="username" value={email} readOnly hidden />
            <label style={label} htmlFor="aa-pw1">New password</label>
            <input id="aa-pw1" style={field} type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw((v) => ({ ...v, a: e.target.value }))} />
            <label style={label} htmlFor="aa-pw2">Again</label>
            <input id="aa-pw2" style={field} type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw((v) => ({ ...v, b: e.target.value }))} />
            {error && <div role="alert" style={{ color: '#f0b9b9', fontSize: 14, marginTop: 12 }}>{error}</div>}
            <button type="submit" style={{ ...primary, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? 'Saving…' : 'Save and sign in'}</button>
          </form>
        )}

        {phase === 'form' && mode === 'signIn' && (
          <form onSubmit={(e) => { e.preventDefault(); finishLink(); }} style={{ marginTop: 18 }}>
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, lineHeight: 1.5 }}>You opened the link on a different device from the one you asked on. Enter the email it was sent to and you&rsquo;re in.</div>
            <label style={label} htmlFor="aa-email">Email</label>
            <input id="aa-email" style={field} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div role="alert" style={{ color: '#f0b9b9', fontSize: 14, marginTop: 12 }}>{error}</div>}
            <button type="submit" style={{ ...primary, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}

        {phase === 'done' && (
          <>
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 15, lineHeight: 1.55, marginTop: 14 }}>{doneText}</div>
            <button type="button" style={primary} onClick={onDone}>Go to Home</button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 15, lineHeight: 1.55, marginTop: 14 }}>
              {EXPIRED.includes(error)
                ? 'Links from the club work once and only for a while. Ask for a fresh one and use the newest email.'
                : error}
            </div>
            <button type="button" style={primary} onClick={onRequestNew}>{mode === 'resetPassword' ? 'Send me a new link' : 'Back to sign in'}</button>
            <button type="button" onClick={onDone} style={{ background: 'none', border: 0, color: C.gold2, fontSize: 14, marginTop: 14, minHeight: 44, cursor: 'pointer', fontFamily: 'inherit' }}>Go to Home</button>
          </>
        )}
      </div>
    </div>
  );
}
