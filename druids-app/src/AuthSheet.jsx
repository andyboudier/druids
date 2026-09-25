import React, { useEffect, useState } from 'react';
import { authErrorText } from './auth';
import { alreadySignedUpWith, providerUnion } from './accountLink';

// The sign-in sheet, and the admins panel. Both talk only to `window.auth`
// (see auth.js), so they render the same for every provider — Firebase in the
// demo, a browser-only stand-in when no project is configured, and never at
// all for a club with sign-in switched off.

const S = {
  p: { margin: '0 0 14px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.55, textAlign: 'center' },
  label: { display: 'block', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', margin: '10px 0 4px' },
  err: { color: 'var(--danger)', fontSize: '13px', marginTop: '10px', textAlign: 'center', lineHeight: 1.45 },
  ok: { color: 'var(--burgundy)', fontSize: '13px', marginTop: '10px', textAlign: 'center', lineHeight: 1.45 },
  provider: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '11px 14px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff',
    color: 'var(--ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  or: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 4px', color: 'var(--muted)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' },
  rule: { flex: 1, height: '1px', background: 'var(--line)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--burgundy)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', textUnderlineOffset: '3px', fontFamily: 'inherit' },
  row: { display: 'flex', gap: '10px', marginTop: '16px' },
};

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
    <path fill="#FBBC05" d="M10.5 28.5A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.5l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.2z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/>
  </svg>
);

const FacebookMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
  </svg>
);

const AppleMark = () => (
  <svg width="16" height="18" viewBox="0 0 170 210" aria-hidden="true">
    <path fill="currentColor" d="M141 111c0-27 22-40 23-41-13-19-32-21-39-21-17-2-32 10-41 10-8 0-21-10-35-9-18 0-34 10-43 26-19 32-5 80 13 106 9 13 19 27 33 26 13 0 18-8 34-8s21 8 35 8c14 0 23-13 32-26 10-15 14-29 14-30 0 0-27-10-27-41zM115 31c7-9 12-21 11-33-10 0-23 7-30 16-7 8-13 20-11 32 11 1 23-6 30-15z"/>
  </svg>
);

// `auth` is the React snapshot (state only — user, role, profile, methods);
// the actions are called on window.auth itself. `linkedPlayer` is the
// signed-in member's record in the club's player database, when their email
// is on one: the profile then starts from it, and a first sign-in is not
// asked for details the club already has.
// `providerHintFor(email)` is the club's own record of how that member has
// signed in before — see accountLink.js. It is asked only when Firebase
// refuses a second way in, and it matters because Firebase's own answer comes
// back empty on any project with email-enumeration protection switched on.
export default function AuthSheet({ open, onClose, auth, handicapOptions = [-2, -1, 0, 1, 2, 3, 4], startAt, linkedPlayer = null, providerHintFor = null }) {
  // 'signin' | 'create' | 'link' | 'reset' | 'profile'
  const [step, setStep] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [prof, setProf] = useState({ name: '', handicap: '', mobile: '', hpa: '' });

  const signedIn = auth.enabled && !!auth.user;
  const profileIncomplete = signedIn && !(auth.profile && auth.profile.name);

  // Open on the right step: a signed-in member with no name yet goes straight
  // to the profile; otherwise to sign-in (or wherever the caller asked).
  useEffect(() => {
    if (!open) return;
    setError(''); setNotice(''); setBusy(false);
    if (profileIncomplete || startAt === 'profile') {
      const p = auth.profile || {};
      const src = (profileIncomplete && linkedPlayer) ? linkedPlayer : p;
      setProf({
        name: src.name || (auth.user && auth.user.displayName) || '',
        handicap: src.handicap == null ? '' : String(src.handicap),
        mobile: src.mobile || '',
        hpa: p.hpa || '',
      });
      setStep('profile');
    } else {
      setStep(startAt || 'signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Signing in from the sign-in step lands on the profile if it is empty,
  // otherwise closes the sheet.
  useEffect(() => {
    if (!open || !signedIn) return;
    if (step === 'signin' || step === 'create' || step === 'link') {
      // Known to the club already: the app fills the profile in from the
      // player database, so there is nothing to ask.
      if (profileIncomplete && !linkedPlayer) {
        setProf({ name: (auth.user && auth.user.displayName) || '', handicap: '', mobile: '', hpa: '' });
        setStep('profile');
      } else {
        onClose();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, auth.profile]);

  if (!open) return null;

  const run = async (fn, okText) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      if (okText) setNotice(okText);
    } catch (e) {
      // "You already have an account with that email." Left at that it is a
      // dead end, so find out which way they used the first time and say so.
      if (e && e.code === 'auth/account-exists-with-different-credential') {
        const em = (e.customData && e.customData.email) || '';
        let known = [];
        try { known = await window.auth.existingMethodsFor(em); } catch (err) { /* may be hidden */ }
        const fromClub = providerHintFor ? (providerHintFor(em) || []) : [];
        setError(alreadySignedUpWith(providerUnion(known, fromClub)));
      } else {
        setError(authErrorText(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const has = (m) => (auth.methods || []).includes(m);

  const title = step === 'create' ? 'Create your account'
    : step === 'link' ? 'Email me a sign-in link'
    : step === 'reset' ? 'Reset your password'
    : step === 'profile' ? 'How you play'
    : 'Sign in';

  return (
    <div className="share-backdrop" onClick={busy ? undefined : onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
        <div className="share-head">
          <h3>{title}</h3>
          <button className="share-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="share-body">

          {step === 'signin' && (
            <>
              <p style={S.p}>Sign in to put your name down for chukkas. Your name, handicap and mobile are remembered for next time.</p>
              {(has('google') || has('facebook') || has('apple')) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {has('google') && (
                    <button type="button" style={S.provider} disabled={busy} onClick={() => run(() => window.auth.signInWithGoogle())}>
                      <GoogleMark /> Continue with Google
                    </button>
                  )}
                  {has('facebook') && (
                    <button type="button" style={{ ...S.provider, background: '#1877F2', color: '#fff', borderColor: '#1877F2' }} disabled={busy} onClick={() => run(() => window.auth.signInWithFacebook())}>
                      <FacebookMark /> Continue with Facebook
                    </button>
                  )}
                  {has('apple') && (
                    <button type="button" style={{ ...S.provider, background: '#000', color: '#fff', borderColor: '#000' }} disabled={busy} onClick={() => run(() => window.auth.signInWithApple())}>
                      <AppleMark /> Continue with Apple
                    </button>
                  )}
                </div>
              )}
              {(has('google') || has('facebook') || has('apple')) && (has('password') || has('link')) && (
                <div style={S.or}><span style={S.rule} />or<span style={S.rule} /></div>
              )}
              {(has('password') || has('link')) && (
                <>
                  <label style={S.label} htmlFor="auth-email">Email</label>
                  <input id="auth-email" className="input-field" type="email" autoComplete="email" inputMode="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </>
              )}
              {has('password') && (
                <>
                  <label style={S.label} htmlFor="auth-password">Password</label>
                  <input id="auth-password" className="input-field" type="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && validEmail && password) run(() => window.auth.signInWithPassword(email.trim(), password)); }} />
                  <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }} disabled={busy || !validEmail || !password}
                    onClick={() => run(() => window.auth.signInWithPassword(email.trim(), password))}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </button>
                </>
              )}
              {has('link') && (
                <button className={has('password') ? 'btn-secondary' : 'btn-primary'} style={{ marginTop: '10px', width: '100%' }} disabled={busy || !validEmail}
                  onClick={() => run(() => window.auth.sendSignInLink(email.trim()).then(() => setStep('link')))}>
                  Email me a sign-in link
                </button>
              )}
              {error && <div style={S.err}>{error}</div>}
              {notice && <div style={S.ok}>{notice}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
                {has('password') && (
                  <button type="button" style={S.link} onClick={() => { setError(''); setStep('create'); }}>New here? Create an account</button>
                )}
                {has('password') && (
                  <button type="button" style={S.link} onClick={() => { setError(''); setStep('reset'); }}>Forgotten password</button>
                )}
              </div>
            </>
          )}

          {step === 'create' && (
            <>
              <p style={S.p}>One account for the season. You’ll add your handicap and mobile next.</p>
              <label style={S.label} htmlFor="auth-email2">Email</label>
              <input id="auth-email2" className="input-field" type="email" autoComplete="email" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <label style={S.label} htmlFor="auth-password2">Choose a password</label>
              <input id="auth-password2" className="input-field" type="password" autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }} disabled={busy || !validEmail || password.length < 6}
                onClick={() => run(() => window.auth.createAccount(email.trim(), password))}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
              {error && <div style={S.err}>{error}</div>}
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button type="button" style={S.link} onClick={() => { setError(''); setStep('signin'); }}>Already have an account? Sign in</button>
              </div>
            </>
          )}

          {step === 'link' && (
            <>
              <p style={S.p}>
                We’ve emailed a sign-in link to <strong style={{ color: 'var(--ink)' }}>{email.trim()}</strong>.
                Open it on this device and you’ll be signed in — no password needed.
              </p>
              <p style={{ ...S.p, fontSize: '12px' }}>Nothing arrived? Check your junk folder, or go back and try again.</p>
              {notice && <div style={S.ok}>{notice}</div>}
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button type="button" style={S.link} onClick={() => { setNotice(''); setStep('signin'); }}>Back</button>
              </div>
            </>
          )}

          {step === 'reset' && (
            <>
              <p style={S.p}>We’ll email you a link to choose a new password.</p>
              <label style={S.label} htmlFor="auth-email3">Email</label>
              <input id="auth-email3" className="input-field" type="email" autoComplete="email" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }} disabled={busy || !validEmail}
                onClick={() => run(() => window.auth.sendPasswordReset(email.trim()), 'Sent — check your email.')}>
                Send reset link
              </button>
              {error && <div style={S.err}>{error}</div>}
              {notice && <div style={S.ok}>{notice}</div>}
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button type="button" style={S.link} onClick={() => { setError(''); setNotice(''); setStep('signin'); }}>Back to sign in</button>
              </div>
            </>
          )}

          {step === 'profile' && (
            <>
              <p style={S.p}>This is what goes on the chukka list when you book. You can change it any time.</p>
              {linkedPlayer && (
                <p style={S.p}>
                  Your account is linked to the club&rsquo;s record for <strong>{linkedPlayer.name}</strong>{linkedPlayer.team ? <> ({linkedPlayer.team})</> : null}, so you book as that player{linkedPlayer.team ? ' and can book your teammates in' : ''}.
                </p>
              )}
              <label style={S.label} htmlFor="prof-name">Name</label>
              <input id="prof-name" className="input-field" type="text" autoComplete="name" value={prof.name}
                onChange={(e) => setProf({ ...prof, name: e.target.value })} placeholder="As it should appear on the list" />
              <label style={S.label} htmlFor="prof-hcp">Handicap</label>
              <select id="prof-hcp" className="input-field select-field" value={prof.handicap}
                onChange={(e) => setProf({ ...prof, handicap: e.target.value })}>
                <option value="">Handicap…</option>
                {handicapOptions.map((h) => <option key={h} value={h}>{h > 0 ? `+${h}` : h}</option>)}
              </select>
              <label style={S.label} htmlFor="prof-mobile">Mobile <span style={{ textTransform: 'none', letterSpacing: 0 }}>(captain only, optional)</span></label>
              <input id="prof-mobile" className="input-field" type="tel" autoComplete="tel" value={prof.mobile}
                onChange={(e) => setProf({ ...prof, mobile: e.target.value })} placeholder="07…" />
              <label style={S.label} htmlFor="prof-hpa">HPA membership no. <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input id="prof-hpa" className="input-field" type="text" value={prof.hpa}
                onChange={(e) => setProf({ ...prof, hpa: e.target.value })} />
              <div style={S.row}>
                {!profileIncomplete && (
                  <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Cancel</button>
                )}
                <button className="btn-primary" style={{ flex: 1 }} disabled={busy || !prof.name.trim() || prof.handicap === ''}
                  onClick={() => run(async () => {
                    await window.auth.saveProfile({
                      name: prof.name.trim().replace(/\s+/g, ' '),
                      handicap: parseInt(prof.handicap, 10),
                      mobile: prof.mobile.trim(),
                      hpa: prof.hpa.trim(),
                    });
                    onClose();
                  })}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
              {error && <div style={S.err}>{error}</div>}
              {signedIn && (
                <div style={{ textAlign: 'center', marginTop: '14px' }}>
                  <button type="button" style={S.link} onClick={() => run(() => window.auth.signOut().then(onClose))}>Sign out</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Who runs the club. A plain list of emails; anyone on it who signs in is an
// admin. Admins named in the deployment's own configuration are always on the
// list and cannot be removed here — that is the safety net against locking
// everyone out.
export function AdminsPanel({ auth }) {
  const [admins, setAdmins] = useState(null); // null = loading
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fixed = (auth.fixedAdmins || []).map((e) => e.toLowerCase());

  const load = async () => {
    try { setAdmins((await window.auth.listAdmins()).map((e) => e.toLowerCase())); }
    catch (e) { setError(authErrorText(e)); setAdmins([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next) => {
    setBusy(true); setError('');
    try { await window.auth.setAdmins(next); setAdmins(next); }
    catch (e) { setError(authErrorText(e)); }
    finally { setBusy(false); }
  };
  const add = () => {
    const e = draft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError('That email address looks off — please check it.');
    if ((admins || []).includes(e) || fixed.includes(e)) return setError('Already an admin.');
    setDraft('');
    save([...(admins || []), e]);
  };

  const all = [...fixed, ...(admins || []).filter((e) => !fixed.includes(e))];
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '0.5px', color: 'var(--burgundy)', textTransform: 'uppercase', marginBottom: '4px' }}>Admins</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Admins run the club in the app: chukka lists, the player database, tournaments, the team board, shop and payments.
        Add someone by the email they sign in with. The captain PIN unlocks live scoring only.
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input className="input-field" type="email" inputMode="email" placeholder="email@example.com" value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }} style={{ flex: 1, minWidth: 0 }} />
        {/* .btn-primary is full-width by default; in this row that squeezed
            the email box to nothing, so the button takes only what it needs. */}
        <button className="btn-primary" onClick={add} disabled={busy || !draft.trim()} style={{ width: 'auto', flex: '0 0 auto', padding: '0 22px' }}>Add</button>
      </div>
      {error && <div style={{ ...S.err, textAlign: 'left', marginTop: 0, marginBottom: '10px' }}>{error}</div>}
      {admins === null ? (
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Loading…</div>
      ) : all.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No admins yet.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
          {all.map((e) => {
            const isFixed = fixed.includes(e);
            const isMe = auth.user && auth.user.email && auth.user.email.toLowerCase() === e;
            return (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid var(--line)', background: '#fff' }}>
                <span style={{ flex: 1, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e}{isMe ? <span style={{ color: 'var(--muted)', fontSize: '12px' }}> · you</span> : null}
                </span>
                {isFixed ? (
                  <span style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)' }} title="Set in the deployment configuration">always</span>
                ) : (
                  <button className="remove-btn" disabled={busy} aria-label={`Remove ${e}`}
                    onClick={() => save(admins.filter((x) => x !== e))}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
