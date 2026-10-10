import React, { useEffect, useRef, useState } from 'react';
import { TermsLine } from './TermsSheet';
import { greeting, firstName, readUsual, writeUsual, icsFor, initialsOf } from './home';
import { authErrorText } from './auth';
import { TERMS_CLUB } from './terms';

// The Home tab: who you are to the club at a glance, your next chukka, and
// booking in two taps — Book, then Confirm. The model is in home.js and every
// number on it comes from data the app already holds, priced by the same
// priceBooking the Chukkas tab uses; Home adds a way in, not a second system.
//
// It is drawn dark on purpose, in the club's own burgundy, gold and cream:
// the one screen a member opens every time gets the premium treatment, and
// the working tabs behind it stay as they are. The motion — a travelling
// border on your next chukka, a shimmer on Book, a soft blur-in — is there to
// point at something, and stops for anyone who has asked their phone for
// less motion.

// The palette is the club's own (TERMS_CLUB.colors in terms.js), so this file
// is the same in every app.
const K = TERMS_CLUB.colors;
const CSS = `
.hd { --hd-bg:${K.bg}; --hd-card:${K.card}; --hd-card2:${K.card2 || K.card}; --hd-line:${K.line}; --hd-burg:${K.burg};
  --hd-gold:${K.gold}; --hd-gold2:${K.gold2}; --hd-cream:${K.cream}; --hd-muted:${K.muted}; --hd-dim:${K.dim || K.muted};
  color:var(--hd-cream); font-family:'Outfit',system-ui,sans-serif; position:relative; }
.hd * { box-sizing:border-box; }
.hd a { color:var(--hd-gold2); }
.hd-dots { position:absolute; left:-16px; right:-16px; top:-24px; height:260px; pointer-events:none;
  background-image:radial-gradient(color-mix(in srgb, var(--hd-gold2) 16%, transparent) 1px,transparent 1px); background-size:14px 14px;
  -webkit-mask-image:linear-gradient(#000,transparent); mask-image:linear-gradient(#000,transparent); }
.hd-serif { font-family:'Fraunces',Georgia,serif; }
.hd-eyebrow { font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:var(--hd-muted); }
.hd-card { background:var(--hd-card); border:1px solid var(--hd-line); border-radius:20px; }
.hd-btn { font-family:inherit; cursor:pointer; color:var(--hd-cream); background:var(--hd-card); border:1px solid var(--hd-line);
  border-radius:14px; min-height:48px; padding:0 14px; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; }
.hd-btn:hover { border-color:var(--hd-gold); }
.hd-btn:focus-visible, .hd-choice:focus-visible, .hd-link:focus-visible { outline:2px solid var(--hd-gold2); outline-offset:2px; }
.hd-link { background:none; border:0; padding:0; font:inherit; color:var(--hd-gold2); cursor:pointer; text-decoration:none; }
.hd-link:hover { color:var(--hd-cream); }
.hd-primary { position:relative; overflow:hidden; width:100%; min-height:56px; border-radius:16px; background:var(--hd-burg);
  border:1px solid var(--hd-gold); color:var(--hd-cream); font-family:'Fraunces',Georgia,serif; font-size:20px; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 30px -12px color-mix(in srgb, var(--hd-burg) 90%, transparent); }
.hd-primary:disabled { opacity:.55; cursor:default; }
.hd-primary > span { position:relative; }
.hd-shimmer::before { content:''; position:absolute; inset:0; background-image:linear-gradient(105deg,transparent 35%,rgba(244,236,216,.28) 50%,transparent 65%);
  background-size:220% 100%; background-repeat:no-repeat; animation:hd-shimmer 3.2s ease-in-out infinite; }
@keyframes hd-shimmer { from { background-position:180% 0 } to { background-position:-80% 0 } }
@property --hd-a { syntax:'<angle>'; inherits:false; initial-value:0deg; }
.hd-beam { border:1.5px solid transparent; border-radius:20px;
  background:linear-gradient(var(--hd-card),var(--hd-card)) padding-box,
    conic-gradient(from var(--hd-a),var(--hd-line) 0deg,var(--hd-line) 270deg,var(--hd-gold2) 320deg,var(--hd-cream) 340deg,var(--hd-line) 360deg) border-box;
  animation:hd-spin 6s linear infinite; }
@keyframes hd-spin { to { --hd-a:360deg } }
.hd-in { animation:hd-blur .7s cubic-bezier(.2,.7,.2,1) both; animation-delay:var(--d,0s); }
@keyframes hd-blur { from { opacity:0; filter:blur(8px); transform:translateY(8px) } to { opacity:1; filter:blur(0); transform:none } }
.hd-pill { font-size:11px; padding:4px 10px; border-radius:999px; white-space:nowrap; }
.hd-pill-ok { background:#2d3b24; color:#cfe3b8; }
.hd-pill-gold { background:#3a2a1a; color:#e8c47e; }
.hd-pill-red { background:#4a1c20; color:#f0b9b9; }
.hd-pill-muted { background:var(--hd-card2); color:var(--hd-muted); }
.hd-stat { padding:12px 10px; border-radius:14px; background:var(--hd-card2); text-align:center; }
.hd-stat b { display:block; font-family:'Fraunces',Georgia,serif; font-weight:500; font-size:22px; line-height:1.1; }
.hd-stat span { display:block; font-size:11px; color:var(--hd-muted); margin-top:3px; }
.hd-row { display:flex; align-items:center; gap:12px; }
.hd-input { width:100%; min-height:52px; padding:0 16px; border-radius:14px; background:var(--hd-card); border:1.5px solid var(--hd-gold2);
  color:var(--hd-cream); font-size:16px; font-family:inherit; outline:none; }
.hd-input::placeholder { color:var(--hd-dim); }
.hd-choice { font-family:inherit; width:100%; cursor:pointer; color:var(--hd-cream); text-align:left; border-radius:14px;
  background:var(--hd-card); border:1px solid var(--hd-line); }
.hd-choice[aria-pressed="true"] { background:#2a1a17; border:1.5px solid var(--hd-gold2); }
.hd-choice:disabled { opacity:.5; cursor:default; }
.hd-choice.hd-stat { text-align:center; }
.hd-sheet { position:fixed; inset:0; z-index:90; background:var(--hd-bg); display:flex; flex-direction:column;
  padding-top:env(safe-area-inset-top,0px); animation:hd-up .4s cubic-bezier(.2,.7,.2,1) both; }
@keyframes hd-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
.hd-sheet-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:4px 20px 20px; }
.hd-sheet-foot { padding:14px 20px calc(18px + env(safe-area-inset-bottom,0px)); background:#1a1311; border-top:1px solid var(--hd-line); }
.hd-sheet-inner { max-width:540px; margin:0 auto; width:100%; }
.hd-pop { animation:hd-pop .6s cubic-bezier(.2,.7,.2,1) both; }
@keyframes hd-pop { 0% { opacity:0; transform:scale(.6) } 70% { transform:scale(1.06) } 100% { opacity:1; transform:none } }
.hd-ring { animation:hd-ring 1.6s ease-out .3s 2 both; }
@keyframes hd-ring { from { opacity:.6; transform:scale(1) } to { opacity:0; transform:scale(1.9) } }
.hd-skel { background:linear-gradient(90deg,var(--hd-card) 0%,var(--hd-card2) 50%,var(--hd-card) 100%); background-size:200% 100%;
  animation:hd-skel 1.4s ease-in-out infinite; border-radius:20px; }
@keyframes hd-skel { from { background-position:200% 0 } to { background-position:-200% 0 } }
@media (prefers-reduced-motion:reduce) {
  .hd-in,.hd-sheet,.hd-pop,.hd-ring,.hd-skel,.hd-beam,.hd-shimmer::before { animation:none !important; }
  .hd-ring { opacity:0; }
}
`;

const Icon = ({ d, size = 18, stroke = 'currentColor', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const I = {
  back: 'M15 6l-6 6 6 6',
  chev: 'M9 6l6 6-6 6',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z',
  cal: 'M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  share: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v12M8 7l4-4 4 4',
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M8 10V7a4 4 0 018 0v3M6 10h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z',
  live: 'M20 13a8 8 0 11-16 0 8 8 0 0116 0zM12 9v4l2.5 2.5M10 2h4',
  cap: 'M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5',
  cup: 'M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
};

// The club's own badge (TERMS_CLUB.crest). TPPC's is cut from the app icon as
// a round and set in a thin gold ring so it sits on the dark ground like a
// medal; a club whose crest is not a round shows it as it is.
const Crest = ({ size = 44 }) => (
  <img src={TERMS_CLUB.crest} alt={TERMS_CLUB.name} width={size} height={size}
    style={{ width: size, height: size, flexShrink: 0, display: 'block', objectFit: 'contain',
      ...(TERMS_CLUB.crestRound ? { borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 1.5px var(--hd-gold), 0 6px 18px -6px rgba(0,0,0,.6)' } : {}) }} />
);

// ── Profile picture ─────────────────────────────────────────────────────────
// Google's photo loads from googleusercontent, which refuses some referrers,
// hence no-referrer. A broken picture falls back to initials.
function Avatar({ src, name, size = 56, onClick }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const inner = src && !broken
    ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
    : <span className="hd-serif" style={{ fontSize: size * 0.38, color: 'var(--hd-gold2)' }}>{initialsOf(name) || '?'}</span>;
  const ring = { width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--hd-card2)',
    boxShadow: '0 0 0 1.5px var(--hd-gold), 0 6px 18px -6px rgba(0,0,0,.6)' };
  if (!onClick) return <div style={ring} aria-hidden="true">{inner}</div>;
  return (
    <button type="button" onClick={onClick} aria-label="Change your picture" style={{ ...ring, border: 0, padding: 0, cursor: 'pointer' }}>
      {inner}
      <span aria-hidden="true" style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%',
        background: 'var(--hd-burg)', border: '1.5px solid var(--hd-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={I.camera} size={12} stroke="var(--hd-cream)" />
      </span>
    </button>
  );
}

// Shrink a chosen picture to a 256px square, centre-cropped, as a JPEG data
// URL — small enough (~20–40 kB) to keep on the member's own profile document.
const shrinkPicture = (file) => new Promise((resolve, reject) => {
  if (!file || !/^image\//.test(file.type)) { reject(new Error('Choose a picture.')); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    URL.revokeObjectURL(url);
    resolve(c.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture could not be read.')); };
  img.src = url;
});

function PhotoSheet({ account, name, onSave, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const own = account.ownPhoto;              // '' | 'none' | data URL
  const provider = account.providerPhoto;    // Google's, if any
  const shown = own === 'none' ? '' : own || provider;
  const run = async (value) => {
    setBusy(true); setError('');
    try { await onSave(value); onClose(); } catch (e) { setError(String((e && e.message) || e)); }
    setBusy(false);
  };
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { await run(await shrinkPicture(f)); } catch (err) { setError(String((err && err.message) || err)); }
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="hd" role="dialog" aria-modal="true" aria-labelledby="hd-photo-title"
      style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,.66)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={busy ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="hd-card"
        style={{ width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '22px 20px calc(22px + env(safe-area-inset-bottom,0px))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', animation: 'hd-up .35s cubic-bezier(.2,.7,.2,1) both' }}>
        <Avatar src={shown} name={name} size={96} />
        <h2 id="hd-photo-title" className="hd-serif" style={{ fontSize: '22px', fontWeight: 500, margin: '6px 0 0' }}>Your picture</h2>
        <div style={{ fontSize: '13px', color: 'var(--hd-muted)', textAlign: 'center', lineHeight: 1.5 }}>Shown on your Home screen. Kept on your own profile.</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
        <button type="button" className="hd-primary" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
          <span>{busy ? 'Saving\u2026' : shown ? 'Change picture' : 'Add a picture'}</span>
        </button>
        {provider && own && (
          <button type="button" className="hd-btn" disabled={busy} onClick={() => run('')} style={{ width: '100%' }}>Use my Google picture</button>
        )}
        {shown && (
          <button type="button" className="hd-btn" disabled={busy} onClick={() => run('none')} style={{ width: '100%' }}>Remove picture</button>
        )}
        {error && <div role="alert" style={{ fontSize: '13px', color: '#f0b9b9' }}>{error}</div>}
        <button type="button" className="hd-link" onClick={onClose} disabled={busy} style={{ minHeight: '40px', fontSize: '14px' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Your profile ────────────────────────────────────────────────────────────
// Everything a member keeps about themselves, in one place: picture, name,
// handicap, mobile and HPA number (these travel to the club's record through
// the profile ↔ record reconcile), the email they sign in with (read-only —
// the club matches on it), their password, and the ways they sign in.
const PROVIDER_NAMES = { 'google.com': 'Google', 'apple.com': 'Apple', password: 'Email and password', emailLink: 'Email link' };
const fld = { width: '100%', minHeight: 48, padding: '0 14px', borderRadius: 12, background: 'var(--hd-card2)', border: '1px solid var(--hd-line)', color: 'var(--hd-cream)', fontSize: 16, fontFamily: 'inherit', outline: 'none' };
const lbl = { display: 'block', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--hd-muted)', margin: '14px 0 6px' };

// ── Your booking: amend or cancel ───────────────────────────────────────────
// Where an email's "Amend or cancel" button lands. `m` is worked out by the
// app from the link (see manageRequest in bookingEmail.js): the booking as it
// stands, whether this member may change it, and what may be changed. A chukka
// can change its chukkas, pony, times and no-consecutive; a lesson only its
// pony, since its time is the slot's — to move a lesson, cancel and rebook.
function ManageSheet({ m, onAmend, onCancel, onClose, onOpenTerms }) {
  const isLesson = m.kind === 'lesson';
  const [draft, setDraft] = useState(() => ({
    chukkas: m.chukkas || 2, pony: !!m.pony, from: m.from || '', to: m.to || '', noConsecutive: !!m.noConsecutive,
  }));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { cancelled, note }
  const [confirming, setConfirming] = useState(false);
  const headRef = useRef(null);

  useEffect(() => {
    headRef.current && headRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hd-sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.body.classList.remove('hd-sheet-open'); window.removeEventListener('keydown', onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { headRef.current && headRef.current.focus(); }, [done]);

  const changed = isLesson
    ? draft.pony !== !!m.pony
    : draft.chukkas !== m.chukkas || draft.pony !== !!m.pony || draft.from !== (m.from || '') || draft.to !== (m.to || '') || draft.noConsecutive !== !!m.noConsecutive;
  const set = (k, v) => { setDraft(d => ({ ...d, [k]: v })); setError(''); };

  const save = async () => {
    setBusy('save'); setError('');
    const r = await onAmend(draft);
    setBusy('');
    if (!r || r.error) { setError((r && r.error) || 'That didn’t go through — please try again.'); return; }
    setDone({ cancelled: false, note: r.note || '' });
  };
  const cancel = async () => {
    setBusy('cancel'); setError('');
    const r = await onCancel();
    setBusy('');
    if (!r || r.error) { setError((r && r.error) || 'That didn’t go through — please try again.'); setConfirming(false); return; }
    setDone({ cancelled: true, note: r.note || '' });
  };

  const title = done ? (done.cancelled ? 'Booking cancelled' : 'Booking updated') : 'Your booking';
  const countOptions = Array.from({ length: Math.min(m.max || 4, 8) }, (_, i) => i + 1);
  const row = (label, value) => (
    <div style={{ display: 'flex', gap: 12, fontSize: 14, padding: '3px 0' }}>
      <span style={{ color: 'var(--hd-muted)', flex: 1 }}>{label}</span><span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-labelledby="hd-manage-title">
      <div className="hd-sheet-inner hd-row" style={{ padding: '18px 20px 8px' }}>
        <button type="button" onClick={onClose} aria-label="Back to Home" className="hd-btn" style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: '50%', background: 'var(--hd-card2)' }}>
          <Icon d={I.back} size={20} />
        </button>
        <div>
          <div className="hd-eyebrow">{m.personName || ''}</div>
          <h2 id="hd-manage-title" ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: 24, fontWeight: 500, margin: 0, outline: 'none' }}>{title}</h2>
        </div>
      </div>
      <div className="hd-sheet-body">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="hd-card" style={{ padding: '16px 18px' }}>
            <div className="hd-serif" style={{ fontSize: 21, textDecoration: done && done.cancelled ? 'line-through' : 'none', color: done && done.cancelled ? 'var(--hd-muted)' : undefined }}>{m.title}</div>
            <div style={{ fontSize: 14, color: 'var(--hd-muted)', marginTop: 4 }}>{m.dateText} &middot; {m.time}{m.ground ? ` · ${m.ground}` : ''}</div>
            {m.coach ? <div style={{ fontSize: 13, color: 'var(--hd-muted)', marginTop: 2 }}>with {m.coach}</div> : null}
            {m.waitPlace ? <div style={{ fontSize: 13, color: 'var(--hd-gold2)', marginTop: 6 }}>Number {m.waitPlace} on the waiting list</div> : null}
          </div>

          {m.missing && !done && (
            <div style={{ fontSize: 14, color: 'var(--hd-muted)', lineHeight: 1.55 }}>
              This booking is no longer on the list &mdash; it may already have been cancelled, or the session has been played.
            </div>
          )}
          {!m.missing && !m.allowed && !done && (
            <div style={{ fontSize: 14, color: 'var(--hd-muted)', lineHeight: 1.55 }}>
              You&rsquo;re signed in as someone who can&rsquo;t change this booking. Sign in as the member it&rsquo;s for, someone on their team, or an admin.
            </div>
          )}

          {done && (
            <div style={{ fontSize: 15, color: 'var(--hd-muted)', lineHeight: 1.55 }}>
              {done.cancelled ? 'You’re off the list, and an email is on its way to confirm it.' : 'Saved, and an email is on its way with the new details.'}
              {done.note ? <div style={{ marginTop: 8 }}>{done.note}</div> : null}
            </div>
          )}

          {!done && !m.missing && m.allowed && !isLesson && (
            <>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>
                  Chukkas{m.fixed ? <span style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '8px' }}>&middot; fixed at {m.fixed} for this session</span> : null}
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${countOptions.length > 6 ? 4 : countOptions.length}, minmax(0,1fr))`, gap: '8px' }}>
                  {countOptions.map(k => (
                    <button key={k} type="button" className="hd-choice" aria-pressed={k === draft.chukkas} disabled={!!m.fixed && k !== m.fixed} onClick={() => set('chukkas', k)}
                      style={{ minHeight: '48px', textAlign: 'center', fontSize: '18px', background: k === draft.chukkas ? 'var(--hd-burg)' : undefined }}>{k}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Pony</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[[true, 'Club pony'], [false, 'My own pony']].map(([v, label]) => (
                    <button key={String(v)} type="button" className="hd-choice" aria-pressed={draft.pony === v} onClick={() => set('pony', v)} style={{ minHeight: '52px', padding: '10px 12px', fontSize: 14 }}>{label}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Available</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>
                    From
                    <select style={{ ...fld, marginTop: '4px', background: 'var(--hd-card)' }} value={draft.from || (m.fromTimes || [])[0] || ''}
                      onChange={(e) => set('from', e.target.value === (m.fromTimes || [])[0] ? '' : e.target.value)} aria-label="Earliest chukka you can play">
                      {(m.fromTimes || []).map((t, i) => <option key={t} value={t}>{t}{i === 0 ? ' (throw-in)' : ''}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>
                    To
                    <select style={{ ...fld, marginTop: '4px', background: 'var(--hd-card)' }} value={draft.to} onChange={(e) => set('to', e.target.value)} aria-label="Latest chukka you can play">
                      <option value="">Stay to the end</option>
                      {(m.toTimes || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
              {!m.instructional && (
                <button type="button" className="hd-choice hd-row" role="switch" aria-checked={draft.noConsecutive} onClick={() => set('noConsecutive', !draft.noConsecutive)}
                  style={{ minHeight: '56px', padding: '10px 14px', borderColor: draft.noConsecutive ? 'var(--hd-gold2)' : undefined }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>No consecutive chukkas</span>
                  <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, position: 'relative', background: draft.noConsecutive ? 'var(--hd-burg)' : 'var(--hd-card2)', border: `1px solid ${draft.noConsecutive ? 'var(--hd-gold2)' : 'var(--hd-line)'}` }}>
                    <span style={{ position: 'absolute', top: 2, left: draft.noConsecutive ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: draft.noConsecutive ? 'var(--hd-gold2)' : 'var(--hd-muted)' }} />
                  </span>
                </button>
              )}
            </>
          )}

          {!done && !m.missing && m.allowed && isLesson && (
            <>
              <div>
                {row('Lesson', m.lessonText)}
                {m.bookedBy ? row('Booked by', m.bookedBy) : null}
              </div>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Pony</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[[true, 'Club pony', m.ponyPrices ? `£${m.ponyPrices.club}` : (m.ponyIncluded ? 'Included in the price' : '')],
                    [false, 'My own pony', m.ponyPrices ? `£${m.ponyPrices.own}` : 'I’ll bring my own']].map(([v, label, sub]) => (
                    <button key={String(v)} type="button" className="hd-choice" aria-pressed={draft.pony === v} onClick={() => set('pony', v)} style={{ minHeight: '58px', padding: '10px 12px' }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{label}</span>
                      {sub ? <span style={{ display: 'block', fontSize: 12, color: 'var(--hd-muted)', marginTop: 2 }}>{sub}</span> : null}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div style={{ fontSize: 12, color: 'var(--hd-dim)', lineHeight: 1.5 }}>To move to another time, cancel this one and book the new time in Lessons.</div>
            </>
          )}
        </div>
      </div>
      <div className="hd-sheet-foot">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && <div role="alert" style={{ fontSize: '13px', color: '#f0b9b9', lineHeight: 1.45 }}>{error}</div>}
          {done || m.missing || !m.allowed ? (
            <button type="button" className="hd-primary" onClick={onClose}><span>Back to Home</span></button>
          ) : confirming ? (
            <>
              <div style={{ fontSize: 14, color: 'var(--hd-cream)', textAlign: 'center' }}>Cancel this booking{m.personIsMe ? '' : ` for ${m.personName}`}?</div>
              <button type="button" className="hd-primary" disabled={!!busy} onClick={cancel} style={{ background: '#7a1f1f' }}>
                <span>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel it'}</span>
              </button>
              <button type="button" className="hd-btn" disabled={!!busy} onClick={() => setConfirming(false)} style={{ minHeight: 48, justifyContent: 'center' }}>Keep my booking</button>
            </>
          ) : (
            <>
              <button type="button" className="hd-primary" disabled={!changed || !!busy} onClick={save}>
                <span>{busy === 'save' ? 'Saving…' : changed ? 'Save changes' : 'No changes yet'}</span>
              </button>
              <button type="button" className="hd-btn" disabled={!!busy} onClick={() => setConfirming(true)}
                style={{ minHeight: 48, justifyContent: 'center', color: '#f0b9b9', borderColor: '#7a3b3b' }}>Cancel this booking</button>
              <TermsLine onOpen={onOpenTerms} style={{ textAlign: 'center', color: 'var(--hd-muted)' }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSheet({ account, profile, me, handicapOptions, onSave, onChangePassword, onResetEmail, onLinkProvider, onSignOut, onPhoto, onClose }) {
  const p = profile || {};
  const [draft, setDraft] = useState({
    name: p.name || (me && me.name) || account.name || '',
    handicap: p.handicap != null && p.handicap !== '' ? String(p.handicap) : (me && me.handicapRaw != null ? String(me.handicapRaw) : ''),
    mobile: p.mobile || (me && me.mobile) || '',
    hpa: p.hpa || '',
  });
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const headRef = useRef(null);
  const providers = account.providers || [];
  const hasPassword = providers.includes('password');
  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  useEffect(() => {
    headRef.current && headRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hd-sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.body.classList.remove('hd-sheet-open'); window.removeEventListener('keydown', onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (what, fn, ok) => {
    setBusy(what); setMsg({ kind: '', text: '' });
    try { await fn(); setMsg({ kind: 'ok', text: ok }); return true; }
    catch (e) { setMsg({ kind: 'err', text: authErrorText(e) || String((e && e.message) || e) }); return false; }
    finally { setBusy(''); }
  };
  const save = () => {
    if (!draft.name.trim()) { setMsg({ kind: 'err', text: 'Please give your name.' }); return; }
    run('save', () => onSave({ name: draft.name.trim(), handicap: draft.handicap === '' ? null : Number(draft.handicap), mobile: draft.mobile.trim(), hpa: draft.hpa.trim() }),
      'Saved. The club\u2019s list is updated too.');
  };
  const changePw = async () => {
    if (pw.a.length < 8) { setMsg({ kind: 'err', text: 'Use at least 8 characters.' }); return; }
    if (pw.a !== pw.b) { setMsg({ kind: 'err', text: 'The two passwords don\u2019t match.' }); return; }
    if (await run('pw', () => onChangePassword(pw.a), hasPassword ? 'Password changed.' : 'Password added \u2014 you can now sign in with your email too.')) setPw({ a: '', b: '' });
  };

  return (
    <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-labelledby="hd-prof-title">
      <div className="hd-sheet-inner hd-row" style={{ padding: '18px 20px 8px' }}>
        <button type="button" onClick={onClose} aria-label="Back to Home" className="hd-btn" style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: '50%', background: 'var(--hd-card2)' }}>
          <Icon d={I.back} size={20} />
        </button>
        <h2 id="hd-prof-title" ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: 24, fontWeight: 500, margin: 0, outline: 'none' }}>Your profile</h2>
      </div>
      <div className="hd-sheet-body">
        <div className="hd-sheet-inner">
          <div className="hd-row" style={{ gap: 16, padding: '8px 0 6px' }}>
            <Avatar src={account.photo} name={draft.name} size={72} onClick={onPhoto} />
            <div style={{ minWidth: 0 }}>
              <div className="hd-serif" style={{ fontSize: 20 }}>{draft.name || 'Your name'}</div>
              <div style={{ fontSize: 13, color: 'var(--hd-muted)' }}>{account.email}</div>
              {account.team ? <div style={{ fontSize: 13, color: 'var(--hd-muted)' }}>Team: {account.team}</div> : null}
            </div>
          </div>

          <label style={lbl} htmlFor="pf-name">Name</label>
          <input id="pf-name" style={fld} value={draft.name} onChange={set('name')} autoComplete="name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl} htmlFor="pf-hcp">Handicap</label>
              <select id="pf-hcp" style={fld} value={draft.handicap} onChange={set('handicap')}>
                <option value="">Not set</option>
                {handicapOptions.map(h => <option key={h} value={String(h)}>{h < 0 ? `\u2212${Math.abs(h)}` : h}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl} htmlFor="pf-hpa">HPA number</label>
              <input id="pf-hpa" style={fld} value={draft.hpa} onChange={set('hpa')} placeholder="Optional" />
            </div>
          </div>
          <label style={lbl} htmlFor="pf-mob">Mobile</label>
          <input id="pf-mob" style={fld} type="tel" value={draft.mobile} onChange={set('mobile')} autoComplete="tel" placeholder="07…" />
          <label style={lbl} htmlFor="pf-email">Email</label>
          <input id="pf-email" style={{ ...fld, opacity: .7 }} value={account.email} readOnly />
          <div style={{ fontSize: 12, color: 'var(--hd-dim)', marginTop: 6 }}>Your email is how you sign in and how the club finds your record, so it can only be changed by the club.</div>
          <button type="button" className="hd-primary" style={{ marginTop: 18 }} disabled={!!busy} onClick={save}><span>{busy === 'save' ? 'Saving\u2026' : 'Save details'}</span></button>

          <div style={{ borderTop: '1px solid var(--hd-line)', margin: '26px 0 4px' }} />
          <div className="hd-serif" style={{ fontSize: 19, marginTop: 14 }}>{hasPassword ? 'Change password' : 'Add a password'}</div>
          <div style={{ fontSize: 13, color: 'var(--hd-muted)', marginTop: 4, lineHeight: 1.5 }}>
            {hasPassword ? 'At least 8 characters.' : 'You sign in with ' + (providers.map(x => PROVIDER_NAMES[x] || x).join(' and ') || 'another method') + '. Add a password to sign in with your email as well.'}
          </div>
          <label style={lbl} htmlFor="pf-pw1">New password</label>
          <input id="pf-pw1" style={fld} type="password" autoComplete="new-password" value={pw.a} onChange={e => setPw(v => ({ ...v, a: e.target.value }))} />
          <label style={lbl} htmlFor="pf-pw2">Again</label>
          <input id="pf-pw2" style={fld} type="password" autoComplete="new-password" value={pw.b} onChange={e => setPw(v => ({ ...v, b: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: hasPassword ? '1fr 1fr' : '1fr', gap: 10, marginTop: 14 }}>
            <button type="button" className="hd-btn" disabled={!!busy || !pw.a} onClick={changePw} style={{ borderColor: 'var(--hd-gold)' }}>{busy === 'pw' ? 'Saving\u2026' : hasPassword ? 'Change password' : 'Add password'}</button>
            {hasPassword && <button type="button" className="hd-btn" disabled={!!busy} onClick={() => run('reset', onResetEmail, `We\u2019ve emailed a reset link to ${account.email}.`)}>Email me a reset link</button>}
          </div>

          <div style={{ borderTop: '1px solid var(--hd-line)', margin: '26px 0 4px' }} />
          <div className="hd-serif" style={{ fontSize: 19, marginTop: 14 }}>How you sign in</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {providers.map(x => <span key={x} className="hd-pill hd-pill-ok" style={{ fontSize: 12, padding: '6px 12px' }}>{PROVIDER_NAMES[x] || x}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {!providers.includes('google.com') && <button type="button" className="hd-btn" disabled={!!busy} onClick={() => run('google', () => onLinkProvider('google'), 'Google added \u2014 either will sign you in.')}>Add Google</button>}
            {!providers.includes('apple.com') && <button type="button" className="hd-btn" disabled={!!busy} onClick={() => run('apple', () => onLinkProvider('apple'), 'Apple added \u2014 either will sign you in.')}>Add Apple</button>}
          </div>

          {msg.text && <div role={msg.kind === 'err' ? 'alert' : 'status'} style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5, color: msg.kind === 'err' ? '#f0b9b9' : '#cfe3b8' }}>{msg.text}</div>}

          <div style={{ borderTop: '1px solid var(--hd-line)', margin: '26px 0 12px' }} />
          <button type="button" className="hd-btn" style={{ width: '100%', marginBottom: 24 }} onClick={() => { onClose(); onSignOut(); }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ── Logged out: the sign-in screen ──────────────────────────────────────────
// Home is the way in. Booking chukkas and lessons, your draw and what you owe
// need you signed in; the fixtures and the live scores are open to anyone, and
// their tabs stay in the bar for exactly that.
function Logon({ onSignIn, openFixtures, openLive }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '6px' }}>
      <div className="hd-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
        <Crest size={120} />
        <div className="hd-eyebrow" style={{ marginTop: '8px' }}>{TERMS_CLUB.name}</div>
        <h2 className="hd-serif" style={{ fontSize: '32px', fontWeight: 500, lineHeight: 1.12, margin: 0 }}>Welcome back</h2>
        <p style={{ fontSize: '14px', color: 'var(--hd-muted)', maxWidth: '320px', lineHeight: 1.55, margin: 0 }}>
          Sign in to book chukkas and lessons, see your team when the draw is out, and keep track of what you owe.
        </p>
      </div>
      <div className="hd-in" style={{ '--d': '.12s', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        <button type="button" className="hd-primary hd-shimmer" onClick={() => onSignIn('signin')}><span>Sign in</span></button>
        <button type="button" className="hd-btn" onClick={() => onSignIn('create')} style={{ minHeight: '52px', fontSize: '15px' }}>
          <Icon d={I.lock} stroke="var(--hd-gold2)" />New here? Create an account
        </button>
        <div style={{ fontSize: '12px', color: 'var(--hd-dim)', textAlign: 'center', lineHeight: 1.5 }}>
          Google, Apple or your email. Use the email the club has for you and we&rsquo;ll find your record.
        </div>
      </div>
      <div className="hd-in" style={{ '--d': '.24s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
        <button type="button" className="hd-btn" onClick={openFixtures}><Icon d={I.cal} stroke="var(--hd-gold2)" />Fixtures</button>
        <button type="button" className="hd-btn" onClick={openLive}><Icon d={I.live} stroke="var(--hd-gold2)" />Live scores</button>
      </div>
    </div>
  );
}

// ── The booking sheet ───────────────────────────────────────────────────────
function BookSheet({ me, sessions: mySessions, people = [], sessionsFor, initialKey, quote, book, undo, onClose, directions, onOpenTerms }) {
  const usual = readUsual(me.id);
  // Who is being booked: 'me', or a teammate's player id. Each person has
  // their own standing — booked, blocked by handicap — so the list follows.
  const [who, setWho] = useState('me');
  const sessions = who === 'me' || !sessionsFor ? mySessions : sessionsFor(who);
  const person = people.find(p => p.id === who) || { id: 'me', name: me.name, me: true };
  const first = firstName(person.name);
  const [dayKey, setDayKey] = useState(initialKey);
  const [n, setN] = useState(usual.chukkas);
  const [pony, setPony] = useState(usual.pony);
  // The rest of the Chukkas form. Times are per day, so they reset when the
  // day changes; empty means from the throw-in and to the end.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [noCon, setNoCon] = useState(!!usual.noConsecutive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // the booking result, once confirmed
  const headRef = useRef(null);

  useEffect(() => {
    headRef.current && headRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hd-sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('hd-sheet-open');
      window.removeEventListener('keydown', onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to the heading as the view changes, so a screen reader hears
  // the confirmation rather than silence.
  useEffect(() => { headRef.current && headRef.current.focus(); }, [done]);

  // Only chukka days this person can book: Ladies Only and Instructional are
  // booked in Lessons, and a day they are already on, waiting for, closed or
  // barred from by handicap is nothing to choose. A full day stays, because
  // it can still be joined on the waiting list.
  const choices = sessions.filter(s => !s.viaLessons && (s.status === 'open' || s.status === 'full'));
  // Switching to a teammate can take the chosen day out of the list.
  useEffect(() => {
    if (!done && !choices.some(s => s.key === dayKey)) setDayKey(choices.length ? choices[0].key : null);
  }, [who]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setFrom(''); setTo(''); }, [dayKey]);
  const cur = sessions.find(s => s.key === dayKey && !s.viaLessons) || null;
  const fixed = cur && cur.fixed ? cur.fixed : null;
  const max = cur ? cur.max : 4;
  const chukkas = fixed || Math.min(n, max);
  const ponyOn = cur && cur.instructional ? true : pony;
  const q = cur ? quote(cur.key, chukkas, ponyOn, who) : null;
  const waitlist = cur && cur.status === 'full';
  const canConfirm = cur && (cur.status === 'open' || waitlist) && !busy;

  const confirm = async () => {
    if (!canConfirm) return;
    setBusy(true); setError('');
    const noConsecutive = !cur.instructional && noCon;
    const r = await book(cur.key, chukkas, ponyOn, waitlist, who, { availableFrom: from, availableTo: to, noConsecutive });
    setBusy(false);
    if (!r || r.error) { setError((r && r.error) || 'That didn’t go through — please try again.'); return; }
    if (!cur.fixed && who === 'me') writeUsual(me.id, { chukkas, pony: ponyOn, noConsecutive: noCon });
    setDone({ ...r, session: cur, chukkas, pony: ponyOn, price: q, person, from, to, noConsecutive });
  };

  const doUndo = async () => {
    if (!done) return;
    setBusy(true);
    await undo(done);
    setBusy(false);
    setDone(null);
  };

  // Called as a function, not mounted as a component, so a re-render does not
  // remount the heading and lose focus.
  const head = ({ title, sub, onBack, backLabel }) => (
    <div className="hd-sheet-inner hd-row" style={{ padding: '18px 20px 12px' }}>
      <button type="button" onClick={onBack} aria-label={backLabel} className="hd-btn" style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: '50%', background: 'var(--hd-card2)' }}>
        <Icon d={I.back} size={20} />
      </button>
      <div>
        <div className="hd-eyebrow">{sub}</div>
        <h2 ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: '24px', fontWeight: 500, lineHeight: 1.2, margin: 0, outline: 'none' }}>{title}</h2>
      </div>
    </div>
  );

  if (done) {
    const s = done.session;
    const where = s.ground ? ` · ${s.ground}` : '';
    const addToCalendar = () => {
      const blob = new Blob([icsFor({ title: `${s.name} · ${TERMS_CLUB.short}`, start: s.start, minutes: 60 + 15 * Math.max(0, done.chukkas - 2), location: s.ground || TERMS_CLUB.name, note: `${done.chukkas} chukka${done.chukkas === 1 ? '' : 's'}` })], { type: 'text/calendar' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${TERMS_CLUB.slug}-${s.key}.ics`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    const booked = done.person || { name: me.name, me: true };
    const shareText = `${booked.name} is on for ${s.name}, ${s.dateLabel} at ${s.time}${where}.`;
    const share = async () => {
      if (navigator.share) { try { await navigator.share({ text: shareText }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    };
    return (
      <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-labelledby="hd-done-title">
        <div className="hd-sheet-body">
          <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '56px' }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <div className="hd-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--hd-gold2)' }} />
              <div className="hd-pop" style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', background: 'var(--hd-burg)', border: '1.5px solid var(--hd-gold2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={I.tick} size={44} stroke="var(--hd-cream)" />
              </div>
            </div>
            <div className="hd-in" style={{ '--d': '.25s', textAlign: 'center', marginTop: '26px' }}>
              <h2 id="hd-done-title" ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: '30px', fontWeight: 500, lineHeight: 1.15, margin: 0, outline: 'none' }}>
                {done.waitlisted
                  ? `${booked.me ? 'Number' : `${firstName(booked.name)} is number`} ${done.place} on the waiting list`
                  : booked.me ? `You\u2019re on ${s.fullDay}\u2019s list` : `${firstName(booked.name)}\u2019s on ${s.fullDay}\u2019s list`}
              </h2>
              <div style={{ fontSize: '14px', color: 'var(--hd-muted)', marginTop: '8px' }}>{s.dateLabel} &middot; {s.time}{where}</div>
            </div>
            <div className="hd-card hd-in" style={{ '--d': '.4s', width: '100%', marginTop: '26px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', borderRadius: '18px' }}>
              <div style={{ display: 'flex' }}><span style={{ color: 'var(--hd-muted)', flex: 1 }}>Chukkas</span><span>{done.chukkas}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: 'var(--hd-muted)', flex: 1 }}>Pony</span><span>{done.pony ? 'Club pony' : 'My own pony'}</span></div>
              {(done.from || done.to) && (
                <div style={{ display: 'flex' }}><span style={{ color: 'var(--hd-muted)', flex: 1 }}>Available</span><span>{done.from || done.session.time}&ndash;{done.to || 'the end'}</span></div>
              )}
              {done.noConsecutive && (
                <div style={{ display: 'flex' }}><span style={{ color: 'var(--hd-muted)', flex: 1 }}>Chukkas in a row</span><span>No &mdash; a gap between each</span></div>
              )}
              <div style={{ display: 'flex' }}><span style={{ color: 'var(--hd-muted)', flex: 1 }}>Price</span><span style={{ color: 'var(--hd-gold2)' }}>{done.waitlisted ? 'Only if a place comes up' : done.priceText || 'No charge'}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--hd-muted)', borderTop: '1px solid var(--hd-line)', paddingTop: '10px', lineHeight: 1.5 }}>
                {done.waitlisted ? 'The captain will be in touch if a place comes up.'
                  : booked.me ? 'Your team and chukkas show on Home as soon as the captain publishes the draw.'
                  : `${firstName(booked.name)}\u2019s team and chukkas show on their Home once the captain publishes the draw. You can take them off the list if plans change.`}
              </div>
            </div>
            {!done.waitlisted && (
              <div className="hd-in" style={{ '--d': '.4s', width: '100%', marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className="hd-btn" onClick={addToCalendar}><Icon d={I.cal} stroke="var(--hd-gold2)" />Add to calendar</button>
                <button type="button" className="hd-btn" onClick={share}><Icon d={I.share} stroke="var(--hd-gold2)" />Share</button>
              </div>
            )}
          </div>
        </div>
        <div className="hd-sheet-foot">
          <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button type="button" className="hd-primary" onClick={onClose}><span>Back to Home</span></button>
            <button type="button" className="hd-link" onClick={doUndo} disabled={busy} style={{ minHeight: '44px', fontSize: '14px' }}>
              {busy ? 'Undoing…' : done.waitlisted ? 'Take me off the waiting list' : 'Undo this booking'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ponyOptions = [
    { id: true, label: 'Club pony', sub: cur && cur.instructional ? 'Included in the session' : 'Hired from the club' },
    { id: false, label: 'My own pony', sub: cur && cur.instructional ? 'Not for this session' : 'No hire charge' },
  ];
  const countOptions = Array.from({ length: Math.min(max, 8) }, (_, i) => i + 1);

  return (
    <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-label="Book a chukka">
      {head({ title: 'Book a chukka', sub: who === 'me' ? `${me.name}${me.handicapText != null ? ` · ${me.handicapText}` : ''}` : `For ${person.name}`, onBack: onClose, backLabel: 'Back to Home' })}
      <div className="hd-sheet-body">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {people.length > 1 && (
            <div>
              <div className="hd-eyebrow" style={{ marginBottom: '8px' }} id="hd-who-label">Who&rsquo;s playing</div>
              <div role="group" aria-labelledby="hd-who-label" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                {people.map(p => (
                  <button key={p.id} type="button" className="hd-choice" aria-pressed={who === p.id}
                    onClick={() => { setWho(p.id); setError(''); }}
                    style={{ width: 'auto', flexShrink: 0, minHeight: '44px', padding: '0 14px', whiteSpace: 'nowrap', fontSize: '14px' }}>
                    {p.me ? 'Me' : p.name}{p.handicapText ? <span style={{ color: 'var(--hd-muted)', marginLeft: '6px', fontSize: '12px' }}>{p.handicapText}</span> : null}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--hd-dim)', marginTop: '6px' }}>
                You can book anyone on your team{people[0] && people[0].team ? ` (${people[0].team})` : ''}. They pay for their own place.
              </div>
            </div>
          )}
          {people.length <= 1 && (
            <div style={{ fontSize: '12px', color: 'var(--hd-dim)', lineHeight: 1.5 }}>
              Booking for your team too? Once the club puts you and your teammates in the same team (Players &rarr; Team), you can book them from here.
            </div>
          )}
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>When</legend>
            {choices.length === 0 && (
              <div style={{ fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>
                Nothing open for {person.me ? 'you' : first} to book right now.
              </div>
            )}
            {choices.map(s => {
              const on = s.key === dayKey;
              const tag = s.status === 'full' ? ['Full · waiting list', 'gold'] : on ? ['Selected', 'gold'] : null;
              return (
                <button key={s.key} type="button" className="hd-choice hd-row" aria-pressed={on}
                  onClick={() => { setDayKey(s.key); setError(''); }} style={{ minHeight: '60px', padding: '10px 14px' }}>
                  <span style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', letterSpacing: '1px', color: 'var(--hd-muted)' }}>{s.dow}</span>
                    <span className="hd-serif" style={{ display: 'block', fontSize: '21px' }}>{s.dayNum}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-muted)' }}>{s.time}{s.ground ? ` · ${s.ground}` : ''} &middot; {s.blurb}</span>
                  </span>
                  {tag && <span className={`hd-pill hd-pill-${tag[1]}`}>{tag[0]}</span>}
                </button>
              );
            })}
          </fieldset>

          {cur && (
            <>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>
                  Chukkas{fixed ? <span style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '8px' }}>&middot; fixed at {fixed} for this session</span> : null}
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${countOptions.length > 6 ? 4 : countOptions.length}, minmax(0,1fr))`, gap: '8px' }}>
                  {countOptions.map(k => {
                    const on = k === chukkas;
                    const off = !!fixed && k !== fixed;
                    return (
                      <button key={k} type="button" className="hd-choice" aria-pressed={on} disabled={off} onClick={() => setN(k)}
                        style={{ minHeight: '48px', textAlign: 'center', fontSize: '18px', background: on ? 'var(--hd-burg)' : undefined }}>{k}</button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Pony</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ponyOptions.map(p => {
                    const off = !!(cur.instructional && !p.id);
                    return (
                      <button key={String(p.id)} type="button" className="hd-choice" aria-pressed={ponyOn === p.id} disabled={off} onClick={() => setPony(p.id)} style={{ minHeight: '62px', padding: '10px 12px' }}>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>{p.label}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-muted)', marginTop: '2px' }}>{p.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Available</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>
                    From
                    <select style={{ ...fld, marginTop: '4px', background: 'var(--hd-card)' }} value={from || (cur.fromTimes && cur.fromTimes[0]) || ''}
                      onChange={(e) => { setFrom(e.target.value === (cur.fromTimes && cur.fromTimes[0]) ? '' : e.target.value); setError(''); }}
                      aria-label="Earliest chukka you can play">
                      {(cur.fromTimes || []).map((t, i) => <option key={t} value={t}>{t}{i === 0 ? ' (throw-in)' : ''}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>
                    To
                    <select style={{ ...fld, marginTop: '4px', background: 'var(--hd-card)' }} value={to}
                      onChange={(e) => { setTo(e.target.value); setError(''); }} aria-label="Latest chukka you can play">
                      <option value="">Stay to the end</option>
                      {(cur.toTimes || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--hd-dim)', marginTop: '6px', lineHeight: 1.45 }}>
                  Arriving late or leaving early? The draw only puts you in chukkas inside these times.
                </div>
              </fieldset>
              {!cur.instructional && (
                <button type="button" className="hd-choice hd-row" role="switch" aria-checked={noCon} onClick={() => setNoCon(v => !v)}
                  style={{ minHeight: '56px', padding: '10px 14px', borderColor: noCon ? 'var(--hd-gold2)' : undefined }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>No consecutive chukkas</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-muted)', marginTop: '2px' }}>Always a gap of at least one chukka between plays</span>
                  </span>
                  <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, position: 'relative', background: noCon ? 'var(--hd-burg)' : 'var(--hd-card2)', border: `1px solid ${noCon ? 'var(--hd-gold2)' : 'var(--hd-line)'}`, transition: 'background .15s' }}>
                    <span style={{ position: 'absolute', top: 2, left: noCon ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: noCon ? 'var(--hd-gold2)' : 'var(--hd-muted)', transition: 'left .15s' }} />
                  </span>
                </button>
              )}
              {cur.ground && directions(cur.ground) && (
                <a href={directions(cur.ground)} target="_blank" rel="noopener noreferrer" className="hd-row" style={{ fontSize: '13px', textDecoration: 'none', gap: '6px' }}>
                  <Icon d={I.pin} size={16} />Directions to {cur.ground}
                </a>
              )}
            </>
          )}
          {!cur && (
            <div style={{ fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>
              Nothing is open to book just now. Sessions open again once this week&rsquo;s have been played.
            </div>
          )}
        </div>
      </div>
      <div className="hd-sheet-foot">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cur && q && (
            <div>
              <div className="hd-row" style={{ alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--hd-muted)', flex: 1 }}>{cur.name}, {cur.dow.charAt(0) + cur.dow.slice(1).toLowerCase()} {cur.dayNum} &middot; {chukkas} chukka{chukkas === 1 ? '' : 's'}</div>
                <div className="hd-serif" style={{ fontSize: '26px', color: 'var(--hd-gold2)' }}>{waitlist ? 'Free' : q.price}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--hd-muted)', marginTop: '2px' }}>{waitlist ? 'Joining the waiting list costs nothing — you’re charged only if a place comes up.' : q.note}</div>
            </div>
          )}
          {error && <div role="alert" style={{ fontSize: '13px', color: '#f0b9b9', lineHeight: 1.45 }}>{error}</div>}
          <button type="button" className="hd-primary hd-shimmer" disabled={!canConfirm} onClick={confirm}>
            <span>{busy ? 'Booking…' : waitlist ? 'Join the waiting list' : 'Confirm booking'}</span>
          </button>
          <TermsLine onOpen={onOpenTerms} style={{ textAlign: 'center', color: 'var(--hd-muted)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Enter a tournament ──────────────────────────────────────────────────────
// Three steps, the way Book a chukka is two: pick the tournament, name the
// team and its players, then review the fee and confirm. Everything is the
// Fixtures tab's own team entry (`tour`, built in PoloChukkas.jsx), so the
// team appears under Teams Entered there and on the draw the captain builds.
// The fee comes from the rate card: a share of the member or non-member team
// fee per player, or one flat military fee — and the person entering pays it
// all and collects the shares.
const ENTRY_HANDICAPS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_SQUAD = 6;
const blankRow = () => ({ name: '', handicap: '', member: null });
const fmtHc = (n) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${-n}` : '0');

// `edit` is one of tour.mine: the sheet then opens on the team step for
// that entry, saves through tour.update, and offers to withdraw.
function TournamentSheet({ me, tour, initialId, edit, onClose, onOpenTerms, onOpenFixture }) {
  const list = tour.list;
  const [step, setStep] = useState(edit || initialId ? 'team' : 'pick');
  const [fxId, setFxId] = useState(edit ? edit.fixtureId : initialId || null);
  const [team, setTeam] = useState(edit ? edit.team : '');
  const [rows, setRows] = useState(() => {
    if (edit) {
      const rs = edit.players.slice(0, MAX_SQUAD).map(p => ({ name: p.name, handicap: p.handicap, member: p.member }));
      while (rs.length < 4) rs.push(blankRow());
      return rs;
    }
    const self = tour.find(me.name) || { name: me.name, handicap: me.handicapRaw == null ? '' : String(me.handicapRaw), member: null };
    return [{ name: self.name, handicap: self.handicap, member: self.member }, blankRow(), blankRow(), blankRow()];
  });
  const [mobile, setMobile] = useState(edit && edit.mobile ? edit.mobile : me.mobile || '');
  const [leaving, setLeaving] = useState(false); // withdraw asked once; the second tap does it
  const [focusRow, setFocusRow] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [myTeams] = useState(() => tour.myTeams());
  const headRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hd-sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('hd-sheet-open');
      window.removeEventListener('keydown', onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { headRef.current && headRef.current.focus(); }, [step, done]);

  const fx = edit ? edit.fx : list.find(t => t.id === fxId) || null;
  const named = rows.filter(r => r.name.trim());
  const q = fx ? tour.quote(fx.id, rows) : null;
  const teamHandicap = named.reduce((n, r) => n + (r.handicap === '' || isNaN(Number(r.handicap)) ? 0 : Number(r.handicap)), 0);

  const setRow = (i, patch) => { setError(''); setRows(rs => rs.map((r, k) => (k === i ? { ...r, ...patch } : r))); };
  const typeName = (i, v) => {
    const hit = tour.find(v);
    setRow(i, hit ? { name: v, handicap: hit.handicap, member: hit.member } : { name: v, member: null });
  };
  const pick = (i, p) => { setRow(i, { name: p.name, handicap: p.handicap, member: p.member }); setFocusRow(-1); };
  const pickTeam = (name) => {
    setTeam(name); setError('');
    const t = tour.known(name);
    if (t && t.players.length) {
      const squad = t.players.slice(0, MAX_SQUAD).map(p => ({ name: p.name, handicap: p.handicap, member: p.member }));
      while (squad.length < 4) squad.push(blankRow());
      setRows(squad);
    }
  };

  const next = () => {
    setError('');
    if (step === 'pick') { if (fx) setStep('team'); return; }
    if (step === 'team') {
      if (!team.trim()) { setError('Give your team a name.'); return; }
      if (!named.length) { setError('Add at least one player.'); return; }
      setStep('review');
    }
  };
  const back = () => { setError(''); if (step === 'review') setStep('team'); else if (step === 'team' && !initialId && !edit) setStep('pick'); else onClose(); };

  const confirm = async () => {
    if (!fx || busy) return;
    setBusy(true); setError('');
    const r = edit
      ? await tour.update(edit.fixtureId, edit.entryId, { team, handicap: named.length ? teamHandicap : '', mobile, rows })
      : await tour.enter(fx.id, { team, handicap: named.length ? teamHandicap : '', mobile, rows });
    setBusy(false);
    if (!r || r.error) { setError((r && r.error) || 'That didn’t go through — please try again.'); return; }
    setDone({ ...r, fx, quote: q, team: team.trim(), players: named.map(x => x.name.trim()), edited: !!edit });
  };
  const withdraw = async () => {
    if (!edit || busy) return;
    if (!leaving) { setLeaving(true); return; }
    setBusy(true);
    await tour.withdraw(edit.fixtureId, edit.entryId);
    setBusy(false);
    onClose();
  };
  const undo = async () => {
    if (!done) return;
    setBusy(true);
    await tour.withdraw(done.fixtureId, done.entry.id);
    setBusy(false);
    setDone(null); setStep('review');
  };

  const head = (title, sub) => (
    <div className="hd-sheet-inner hd-row" style={{ padding: '18px 20px 6px' }}>
      <button type="button" onClick={back} aria-label={step === 'pick' || (step === 'team' && (initialId || edit)) ? 'Back to Home' : 'Back'} className="hd-btn" style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: '50%', background: 'var(--hd-card2)' }}>
        <Icon d={I.back} size={20} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hd-eyebrow">{sub}</div>
        <h2 ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: '24px', fontWeight: 500, lineHeight: 1.2, margin: 0, outline: 'none' }}>{title}</h2>
      </div>
    </div>
  );
  // Where you are in the three steps.
  const STEPS = edit ? [['team', 'Team'], ['review', 'Review']] : [['pick', 'Tournament'], ['team', 'Team'], ['review', 'Review & pay']];
  const at = STEPS.findIndex(x => x[0] === step);
  const progress = (
    <div className="hd-sheet-inner" aria-hidden="true" style={{ padding: '4px 20px 12px', display: 'grid', gridTemplateColumns: `repeat(${STEPS.length},1fr)`, gap: '6px' }}>
      {STEPS.map(([k, label], i) => (
        <div key={k}>
          <div style={{ height: 3, borderRadius: 2, background: i <= at ? 'var(--hd-gold2)' : 'var(--hd-line)' }} />
          <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '5px', color: i === at ? 'var(--hd-cream)' : 'var(--hd-dim)' }}>{label}</div>
        </div>
      ))}
    </div>
  );

  if (done) {
    const f = done.fx;
    const addToCalendar = () => {
      const start = new Date(f.start); start.setHours(10, 0, 0, 0);
      const blob = new Blob([icsFor({ title: `${f.name} · ${done.team}`, start, minutes: 8 * 60, location: TERMS_CLUB.name, note: `${done.team}: ${done.players.join(', ')}` })], { type: 'text/calendar' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${TERMS_CLUB.slug}-${String(f.id)}.ics`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    const shareText = `${done.team} are entered in ${f.name} (${f.date}) — ${done.players.join(', ')}.${done.quote && done.quote.total > 0 ? ` Entry ${done.totalText}${done.quote.shares.length > 1 ? `; shares: ${done.quote.shares.map(x => `${x.name} ${x.shareText}`).join(', ')}` : ''}.` : ''}`;
    const share = async () => {
      if (navigator.share) { try { await navigator.share({ text: shareText }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    };
    return (
      <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-labelledby="hd-tdone-title">
        <div className="hd-sheet-body">
          <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '56px' }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <div className="hd-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--hd-gold2)' }} />
              <div className="hd-pop" style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', background: 'var(--hd-burg)', border: '1.5px solid var(--hd-gold2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={I.cup} size={44} stroke="var(--hd-cream)" />
              </div>
            </div>
            <div className="hd-in" style={{ '--d': '.25s', textAlign: 'center', marginTop: '26px' }}>
              <h2 id="hd-tdone-title" ref={headRef} tabIndex={-1} className="hd-serif" style={{ fontSize: '30px', fontWeight: 500, lineHeight: 1.15, margin: 0, outline: 'none' }}>
                {done.edited ? `${done.team} updated` : `${done.team} ${/s$/i.test(done.team) ? 'are' : 'is'} entered`}
              </h2>
              <div style={{ fontSize: '14px', color: 'var(--hd-muted)', marginTop: '8px' }}>{f.name} &middot; {f.date}</div>
            </div>
            <div className="hd-card hd-in" style={{ '--d': '.4s', width: '100%', marginTop: '26px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', borderRadius: '18px' }}>
              {done.quote && done.quote.shares.map(x => (
                <div key={x.name} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{x.name}{!done.quote.military && <span style={{ color: 'var(--hd-muted)', fontSize: '12px' }}> &middot; {x.member ? 'member' : 'non-member'}</span>}</span>
                  <span style={{ color: 'var(--hd-muted)' }}>{x.shareText}</span>
                </div>
              ))}
              <div style={{ display: 'flex', borderTop: '1px solid var(--hd-line)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--hd-muted)', flex: 1 }}>Entry fee</span>
                <span style={{ color: 'var(--hd-gold2)' }}>{done.quote && done.quote.total > 0 ? done.totalText : 'No charge'}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>
                {done.quote && done.quote.total > 0 ? 'Payable by card once online payment is live — nothing is taken now. You pay the whole entry and collect each player’s share from them. ' : ''}
                Your team shows under Teams Entered on the Fixtures tab, and the draw follows once the captain publishes it.
              </div>
            </div>
            <div className="hd-in" style={{ '--d': '.4s', width: '100%', marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="button" className="hd-btn" onClick={addToCalendar}><Icon d={I.cal} stroke="var(--hd-gold2)" />Add to calendar</button>
              <button type="button" className="hd-btn" onClick={share}><Icon d={I.share} stroke="var(--hd-gold2)" />Tell the team</button>
            </div>
          </div>
        </div>
        <div className="hd-sheet-foot">
          <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button type="button" className="hd-primary" onClick={onClose}><span>Back to Home</span></button>
            <button type="button" className="hd-link" onClick={() => { onClose(); onOpenFixture(f.id); }} style={{ minHeight: '44px', fontSize: '14px' }}>See it on Fixtures</button>
            {!done.edited && <button type="button" className="hd-link" onClick={undo} disabled={busy} style={{ minHeight: '44px', fontSize: '14px' }}>{busy ? 'Withdrawing…' : 'Undo this entry'}</button>}
          </div>
        </div>
      </div>
    );
  }

  const taken = rows.map(r => r.name);
  return (
    <div className="hd hd-sheet" role="dialog" aria-modal="true" aria-label="Enter a tournament">
      {head(step === 'pick' ? 'Enter a tournament' : step === 'team' ? (edit ? 'Edit your entry' : 'Your team') : edit ? 'Review changes' : 'Review & pay',
        step === 'pick' ? `${me.name}${me.handicapText != null ? ` · ${me.handicapText}` : ''}` : fx ? `${fx.name} · ${fx.date}` : '')}
      {progress}
      <div className="hd-sheet-body">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {step === 'pick' && (
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Taking entries</legend>
              {list.length === 0 && (
                <div style={{ fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>No tournaments are taking entries just now. The Fixtures tab has the season&rsquo;s full list.</div>
              )}
              {list.map(t => {
                const on = t.id === fxId;
                return (
                  <button key={t.id} type="button" className="hd-choice hd-row" aria-pressed={on} onClick={() => { setFxId(t.id); setError(''); }} style={{ minHeight: '64px', padding: '10px 14px', alignItems: 'center' }}>
                    <span style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '1px', color: 'var(--hd-muted)' }}>{t.mon}</span>
                      <span className="hd-serif" style={{ display: 'block', fontSize: '21px' }}>{t.dayNum}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '15px', fontWeight: 500 }}>{t.name}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-muted)' }}>
                        {t.date}{t.level ? ` · ${t.level}` : ''}
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-dim)', marginTop: '2px' }}>
                        {t.teams ? `${t.teams} team${t.teams === 1 ? '' : 's'} entered` : 'No teams yet'}{t.closes ? ` · entries close ${t.closes}` : ''}
                      </span>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      {t.military && <span className="hd-pill hd-pill-gold">Military</span>}
                      {t.entered && <span className="hd-pill hd-pill-ok">You&rsquo;re in</span>}
                    </span>
                  </button>
                );
              })}
            </fieldset>
          )}

          {step === 'team' && fx && (
            <>
              <div>
                <label className="hd-eyebrow" htmlFor="hd-team-name" style={{ display: 'block', marginBottom: '8px' }}>Team name</label>
                <input id="hd-team-name" style={fld} value={team} autoComplete="off" placeholder={`e.g. ${TERMS_CLUB.short.split(' ')[0]} Tigers`}
                  onChange={e => { setTeam(e.target.value); setError(''); }} onBlur={e => { const t = tour.known(e.target.value); if (t && !named.slice(1).length) pickTeam(t.name); }} />
                {myTeams.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {myTeams.map(n => (
                      <button key={n} type="button" className="hd-choice" aria-pressed={team.trim().toLowerCase() === n.toLowerCase()} onClick={() => pickTeam(n)}
                        style={{ width: 'auto', minHeight: '40px', padding: '0 14px', fontSize: '13px' }}>{n}</button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--hd-dim)', marginTop: '6px', lineHeight: 1.45 }}>
                  {myTeams.length ? 'Tap a team you’ve played in to bring its players back.' : 'A team you’ve entered before brings its players back when you type its name.'}
                </div>
              </div>

              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <legend className="hd-eyebrow" style={{ marginBottom: '8px' }}>Players{fx.days > 1 ? <span style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '8px' }}>&middot; the same team both days</span> : null}</legend>
                {rows.map((r, i) => {
                  const sugg = focusRow === i ? tour.suggest(r.name, taken.filter((_, k) => k !== i)) : [];
                  return (
                    <div key={i} style={{ background: 'var(--hd-card)', border: '1px solid var(--hd-line)', borderRadius: '14px', padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input style={{ ...fld, flex: 1, minWidth: 0 }} value={r.name} placeholder={i === 0 ? 'Player 1' : `Player ${i + 1}`} aria-label={`Player ${i + 1}`} autoComplete="off"
                          onFocus={() => setFocusRow(i)} onBlur={() => setTimeout(() => setFocusRow(f => (f === i ? -1 : f)), 150)}
                          onChange={e => typeName(i, e.target.value)} />
                        <select style={{ ...fld, width: 74, flexShrink: 0, padding: '0 6px' }} aria-label={`Player ${i + 1} handicap`} value={r.handicap}
                          onChange={e => setRow(i, { handicap: e.target.value })}>
                          <option value="">HC</option>
                          {ENTRY_HANDICAPS.map(h => <option key={h} value={String(h)}>{fmtHc(h)}</option>)}
                        </select>
                        {rows.length > 1 && (
                          <button type="button" className="hd-btn" aria-label={`Remove player ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}
                            style={{ width: 40, height: 40, minHeight: 40, padding: 0, borderRadius: '50%', background: 'var(--hd-card2)', flexShrink: 0 }}>
                            <Icon d={I.x} size={16} />
                          </button>
                        )}
                      </div>
                      {sugg.length > 0 && (
                        <div role="listbox" aria-label={`Players matching ${r.name}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                          {sugg.map(p => (
                            <button key={p.id} type="button" role="option" aria-selected="false" className="hd-choice hd-row" onMouseDown={e => e.preventDefault()} onClick={() => pick(i, p)}
                              style={{ minHeight: '44px', padding: '6px 12px', fontSize: '14px' }}>
                              <span style={{ flex: 1, minWidth: 0 }}>{p.rank ? `${p.rank} ` : ''}{p.name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>{p.handicapText}{p.handicapText ? ' · ' : ''}{p.member ? 'Member' : 'Non-member'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {r.name.trim() && !fx.military && (
                        <div role="group" aria-label={`Player ${i + 1} membership`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                          {[[true, 'Member'], [false, 'Non-member']].map(([v, label]) => (
                            <button key={label} type="button" className="hd-choice" aria-pressed={r.member === v}
                              onClick={() => setRow(i, { member: v })} style={{ minHeight: '38px', textAlign: 'center', fontSize: '13px' }}>{label}</button>
                          ))}
                        </div>
                      )}
                      {r.name.trim() && !fx.military && r.member == null && (
                        <div style={{ fontSize: '11px', color: 'var(--hd-dim)', marginTop: '6px' }}>Not on the club&rsquo;s list &mdash; priced as a non-member unless you say otherwise.</div>
                      )}
                    </div>
                  );
                })}
                {rows.length < MAX_SQUAD && (
                  <button type="button" className="hd-btn" onClick={() => setRows(rs => [...rs, blankRow()])} style={{ minHeight: '44px', borderRadius: '14px', border: '1px dashed var(--hd-line)', background: 'transparent' }}>
                    <Icon d={I.plus} size={16} stroke="var(--hd-gold2)" />Add a player
                  </button>
                )}
                <div className="hd-row" style={{ fontSize: '13px', color: 'var(--hd-muted)' }}>
                  <span style={{ flex: 1 }}>Team handicap</span>
                  <span className="hd-serif" style={{ fontSize: '20px', color: 'var(--hd-cream)' }}>{named.length ? fmtHc(teamHandicap) : '—'}</span>
                </div>
              </fieldset>

              <div>
                <label className="hd-eyebrow" htmlFor="hd-team-mobile" style={{ display: 'block', marginBottom: '8px' }}>Your mobile</label>
                <input id="hd-team-mobile" style={fld} inputMode="tel" value={mobile} placeholder="07…" onChange={e => setMobile(e.target.value)} />
                <div style={{ fontSize: '12px', color: 'var(--hd-dim)', marginTop: '6px' }}>So the captain can reach the team about the draw. Only the captain sees it.</div>
              </div>
              {edit && (
                <div style={{ borderTop: '1px solid var(--hd-line)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" className="hd-btn" onClick={withdraw} disabled={busy}
                    style={{ minHeight: '48px', borderRadius: '14px', border: `1px solid ${leaving ? '#f0b9b9' : 'var(--hd-line)'}`, color: leaving ? '#f0b9b9' : undefined }}>
                    {busy ? 'Withdrawing…' : leaving ? `Yes, withdraw ${team.trim() || 'the team'}` : 'Withdraw from this tournament'}
                  </button>
                  <div style={{ fontSize: '12px', color: leaving ? '#f0b9b9' : 'var(--hd-dim)', lineHeight: 1.45 }}>
                    {leaving ? `This takes ${team.trim() || 'your team'} out of ${fx.name}. Tap again to confirm, or go back to keep it.` : 'Takes the whole team out of the tournament. To change players, edit the list above instead.'}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'review' && fx && q && (
            <>
              <div className="hd-card" style={{ padding: '16px 18px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div className="hd-row" style={{ alignItems: 'baseline' }}>
                  <span className="hd-serif" style={{ fontSize: '20px', flex: 1, minWidth: 0 }}>{team.trim()}</span>
                  <span style={{ color: 'var(--hd-muted)', fontSize: '13px' }}>{fmtHc(teamHandicap)}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--hd-muted)', marginTop: '-6px' }}>{fx.name} &middot; {fx.date}{fx.military ? ' · Military' : ''}</div>
                <div style={{ borderTop: '1px solid var(--hd-line)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.shares.map((x, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{x.name}
                        {!q.military && <span style={{ color: 'var(--hd-muted)', fontSize: '12px' }}> &middot; {x.member ? 'member' : 'non-member'}</span>}
                        {named[i] && named[i].handicap !== '' && <span style={{ color: 'var(--hd-muted)', fontSize: '12px' }}> &middot; {fmtHc(Number(named[i].handicap))}</span>}
                      </span>
                      <span style={{ color: 'var(--hd-muted)' }}>{x.shareText}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--hd-dim)', lineHeight: 1.5, borderTop: '1px solid var(--hd-line)', paddingTop: '10px' }}>
                  {q.military
                    ? `A military tournament is one team fee (${q.totalText}, ${q.len === 2 ? 'two days' : 'one day'}), whoever plays.`
                    : `Each player carries a share of their own team fee: ${q.memberFeeText} for a members’ team, ${q.nonFeeText} for non-members (${q.len === 2 ? 'two days' : 'one day'}).`}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>
                You pay the whole entry and collect each player&rsquo;s share from them directly.
              </div>
            </>
          )}
        </div>
      </div>
      <div className="hd-sheet-foot">
        <div className="hd-sheet-inner" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {fx && q && step !== 'pick' && (
            <div>
              <div className="hd-row" style={{ alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--hd-muted)', flex: 1 }}>{named.length} player{named.length === 1 ? '' : 's'} &middot; {q.len === 2 ? 'two days' : 'one day'}</div>
                <div className="hd-serif" style={{ fontSize: '26px', color: 'var(--hd-gold2)' }}>{q.total > 0 ? q.totalText : named.length ? 'No charge' : '—'}</div>
              </div>
              {step === 'review' && q.total > 0 && <div style={{ fontSize: '12px', color: 'var(--hd-muted)', marginTop: '2px' }}>Payable by card once online payment is live &mdash; nothing is taken now.</div>}
            </div>
          )}
          {error && <div role="alert" style={{ fontSize: '13px', color: '#f0b9b9', lineHeight: 1.45 }}>{error}</div>}
          {step === 'review' ? (
            <button type="button" className="hd-primary hd-shimmer" disabled={busy} onClick={confirm}>
              <span>{busy ? (edit ? 'Saving…' : 'Entering…') : edit ? 'Save changes' : q && q.total > 0 ? `Confirm & pay ${q.totalText}` : 'Confirm entry'}</span>
            </button>
          ) : (
            <button type="button" className="hd-primary hd-shimmer" disabled={step === 'pick' ? !fx : false} onClick={next}>
              <span>{step === 'pick' ? (fx ? `Next: your team` : 'Pick a tournament') : edit ? 'Next: review' : 'Next: review & pay'}</span>
            </button>
          )}
          <TermsLine onOpen={onOpenTerms} style={{ textAlign: 'center', color: 'var(--hd-muted)' }} />
        </div>
      </div>
    </div>
  );
}

// The member's own entries still to be played, each with a way to amend or
// withdraw it (until the first day; then the draw is the captain's).
function MyTournaments({ items, onEdit, onOpen, delay }) {
  return (
    <div id="hd-my-tournaments" className="hd-in" style={{ '--d': delay, display: 'flex', flexDirection: 'column', gap: '8px', scrollMarginTop: '12px' }}>
      <div className="hd-eyebrow" style={{ fontSize: '10px' }}>Your tournaments</div>
      {items.map(en => (
        <div key={`${en.fixtureId}-${en.entryId}`} className="hd-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="hd-row" style={{ gap: '10px', alignItems: 'center' }}>
            <span style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
              <span style={{ display: 'block', fontSize: '11px', letterSpacing: '1px', color: 'var(--hd-muted)' }}>{en.fx.mon}</span>
              <span className="hd-serif" style={{ display: 'block', fontSize: '21px' }}>{en.fx.dayNum}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="hd-serif" style={{ display: 'block', fontSize: '17px', lineHeight: 1.2 }}>
                {en.team}{en.handicap != null && <span style={{ color: 'var(--hd-muted)', fontSize: '13px', marginLeft: '6px', fontFamily: 'var(--hd-sans, inherit)' }}>{fmtHc(en.handicap)}</span>}
              </span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--hd-muted)' }}>{en.fx.name} &middot; {en.fx.date}</span>
            </span>
            <span className={`hd-pill ${en.live ? 'hd-pill-gold' : 'hd-pill-ok'}`}>{en.live ? 'Playing' : 'Entered'}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--hd-muted)', lineHeight: 1.45 }}>
            {en.players.length ? en.players.map(p => p.name).join(' \u00b7 ') : 'Squad to be confirmed'}{en.feeText ? ` \u00b7 ${en.feeText}` : ''}
            {en.bookedBy ? <span style={{ color: 'var(--hd-dim)' }}> &middot; entered by {firstName(en.bookedBy)}</span> : null}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: en.canEdit ? '1fr 1fr' : '1fr', gap: '8px' }}>
            {en.canEdit && (
              <button type="button" className="hd-btn" onClick={() => onEdit(en)} style={{ minHeight: '42px', fontSize: '13px', borderRadius: '12px' }}>Edit team</button>
            )}
            <button type="button" className="hd-btn" onClick={() => onOpen(en.fixtureId)} style={{ minHeight: '42px', fontSize: '13px', borderRadius: '12px' }}>{en.canEdit ? 'On Fixtures' : 'See the draw'}</button>
          </div>
          {!en.canEdit && <div style={{ fontSize: '12px', color: 'var(--hd-dim)' }}>The tournament has started, so changes are the captain\u2019s now.</div>}
        </div>
      ))}
    </div>
  );
}

// ── Pieces of Home ──────────────────────────────────────────────────────────
function NextChukka({ s, directions, onOpen }) {
  const url = s.ground ? directions(s.ground) : null;
  return (
    <div className="hd-beam hd-in" style={{ '--d': '.18s', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="hd-row" style={{ gap: '8px' }}>
        <div className="hd-eyebrow" style={{ flex: 1 }}>{s.status === 'waitlisted' ? 'Waiting list' : 'Your next chukka'}</div>
        {s.status === 'waitlisted'
          ? <span className="hd-pill hd-pill-gold">Number {s.waitPlace}</span>
          : s.slots.length ? <span className="hd-pill hd-pill-ok">Draw is out</span> : <span className="hd-pill hd-pill-muted">Draw to come</span>}
      </div>
      <div className="hd-row" style={{ alignItems: 'flex-end', gap: '14px' }}>
        <div className="hd-serif" style={{ fontSize: '44px', lineHeight: 1, color: 'var(--hd-gold2)' }}>{s.time}</div>
        <div style={{ paddingBottom: '4px' }}>
          <div style={{ fontSize: '16px' }}>{s.name}</div>
          <div style={{ fontSize: '13px', color: 'var(--hd-muted)' }}>{s.dateLabel}</div>
        </div>
      </div>
      {s.slots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {s.slots.map(c => (
            <span key={c.number} className="hd-pill" style={{ background: c.team === 'Blue' ? '#1e3552' : '#efe6d0', color: c.team === 'Blue' ? '#dde6f0' : '#4a1419', fontSize: '12px', padding: '5px 10px' }}>
              Chukka {c.number} &middot; {c.time} &middot; {c.team}
            </span>
          ))}
        </div>
      )}
      <div className="hd-row" style={{ fontSize: '13px', color: 'var(--hd-muted)', gap: '14px', flexWrap: 'wrap' }}>
        <span>{s.entry ? `${s.entry.chukkas} chukka${s.entry.chukkas === 1 ? '' : 's'}` : ''}{s.entry && s.entry.ponyHire ? ' · club pony' : ''}</span>
        {s.ground && (url
          ? <a href={url} target="_blank" rel="noopener noreferrer" className="hd-row" style={{ gap: '4px', textDecoration: 'none' }}><Icon d={I.pin} size={15} />{s.ground}</a>
          : <span>{s.ground}</span>)}
        <button type="button" className="hd-link" onClick={onOpen} style={{ marginLeft: 'auto', fontSize: '13px' }}>See the list</button>
      </div>
    </div>
  );
}

function Fixtures({ items, onOpen, onLive, delay }) {
  if (!items.length) return null;
  return (
    <section className="hd-in" style={{ '--d': delay, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h3 className="hd-serif" style={{ fontSize: '19px', fontWeight: 500, margin: '4px 0' }}>Coming up</h3>
      {items.map(f => (
        <div key={f.id} className="hd-card hd-row" style={{ padding: '12px 14px', borderRadius: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px' }}>{f.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>{f.date}{f.where ? ` · ${f.where}` : ''}</div>
          </div>
          {f.live
            ? <button type="button" className="hd-pill hd-pill-red" onClick={onLive} style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit', minHeight: '32px' }}>On now &middot; Live</button>
            : f.entered ? <span className="hd-pill hd-pill-ok">Entered</span>
            : f.closed ? <span className="hd-pill hd-pill-muted">Closed</span>
            : <button type="button" className="hd-link" onClick={() => onOpen(f.id)} style={{ fontSize: '13px', minHeight: '40px', whiteSpace: 'nowrap' }}>Register interest</button>}
        </div>
      ))}
    </section>
  );
}

function CaptainPanel({ c, go }) {
  return (
    <section className="hd-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} aria-label="Captain">
      <div className="hd-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="hd-row" style={{ gap: '8px' }}>
          <span className="hd-pill" style={{ background: 'var(--hd-burg)', border: '1px solid var(--hd-gold)' }}>Captain</span>
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--hd-muted)' }}>{c.sessionName} &middot; {c.dateLabel}</span>
        </div>
        <div className="hd-row" style={{ alignItems: 'baseline', gap: '8px' }}>
          <span className="hd-serif" style={{ fontSize: '38px', lineHeight: 1, color: 'var(--hd-gold2)' }}>{c.players}</span>
          <span style={{ fontSize: '14px', color: 'var(--hd-muted)' }}>player{c.players === 1 ? '' : 's'} &middot; {c.chukkas} chukka{c.chukkas === 1 ? '' : 's'} asked for</span>
        </div>
        {c.cap != null && (
          <div style={{ height: 8, borderRadius: 999, background: 'var(--hd-card2)', overflow: 'hidden' }} role="img" aria-label={`${c.players} of ${c.cap} places taken`}>
            <div style={{ width: `${Math.min(100, (c.players / c.cap) * 100)}%`, height: 8, background: 'var(--hd-gold)' }} />
          </div>
        )}
        <div style={{ fontSize: '12px', color: 'var(--hd-muted)' }}>{c.closes}</div>
        <button type="button" className="hd-btn" style={{ background: 'var(--hd-burg)', borderColor: 'var(--hd-gold)' }} onClick={() => go('draw')}>Open the list</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px' }}>
        <button type="button" className="hd-stat hd-choice" onClick={() => go('draw')}><b>{c.waiting}</b><span>Waiting lists</span></button>
        <button type="button" className="hd-stat hd-choice" onClick={() => go('lessons')}><b>{c.lessons}</b><span>Lessons this week</span></button>
      </div>
    </section>
  );
}

// ── Home ────────────────────────────────────────────────────────────────────
export default function HomeDashboard(props) {
  const {
    ready, account, me, onSignIn, onSignOut, onSavePhoto, people, sessionsFor,
    profile, handicapOptions = [], onSaveProfile, onChangePassword, onResetEmail, onLinkProvider,
    sessions, fixtures, captain, quote, book, undo,
    openChukkas, openLessons, openFixtures, openFixture, openLive, goCaptain, directions, tour,
    // An email's "Amend or cancel" link: the booking to show (null when there
    // is none, or nobody is signed in yet) and whether one is waiting on sign-in.
    manage, manageWaiting, onManageAmend, onManageCancel, onManageClose, onOpenTerms,
  } = props;
  const [booking, setBooking] = useState(null); // the day the sheet opened on
  const [entering, setEntering] = useState(false); // the Enter a tournament walk-through
  const [editing, setEditing] = useState(null); // one of tour.mine, open for amending
  const [photoOpen, setPhotoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!ready) {
    return (
      <div className="hd" aria-busy="true">
        <style>{CSS}</style>
        <div className="hd-skel" style={{ height: 150, marginBottom: 14 }} />
        <div className="hd-skel" style={{ height: 56, marginBottom: 14 }} />
        <div className="hd-skel" style={{ height: 170 }} />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="hd">
        <style>{CSS}</style>
        <div className="hd-dots" />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {captain && <CaptainPanel c={captain} go={goCaptain} />}
          {manageWaiting && (
            <div className="hd-card hd-in" style={{ padding: '14px 18px', fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.5, borderColor: 'var(--hd-gold)' }}>
              Sign in to amend or cancel your booking &mdash; it opens as soon as you&rsquo;re in.
            </div>
          )}
          <Logon onSignIn={onSignIn} openFixtures={openFixtures} openLive={openLive} />
        </div>
      </div>
    );
  }

  const bookable = sessions.filter(s => !s.viaLessons);
  const nextOpen = bookable.find(s => s.status === 'open') || bookable.find(s => s.status === 'full') || null;
  const mine = sessions.filter(s => s.status === 'booked' || s.status === 'waitlisted');
  const next = mine[0] || null;
  const chukkasBooked = mine.filter(s => s.status === 'booked').length;
  const waiting = mine.filter(s => s.status === 'waitlisted').length;
  const chukkaKey = (mine[0] || nextOpen || bookable[0] || {}).key || null;
  const later = mine.slice(1);
  const now = new Date();
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const shownName = (me && me.name) || account.name || '';

  return (
    <div className="hd">
      <style>{CSS}</style>
      <div className="hd-dots" />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {captain && <CaptainPanel c={captain} go={goCaptain} />}

        <header className="hd-row hd-in" style={{ gap: '12px' }}>
          <Crest size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hd-eyebrow">{dateLine}</div>
            <h2 className="hd-serif" style={{ fontSize: '24px', fontWeight: 500, lineHeight: 1.2, margin: 0 }}>
              {shownName ? `${greeting(now)}, ${firstName(shownName)}` : greeting(now)}
            </h2>
          </div>
        </header>

        {me ? (
          <div className="hd-card hd-in" style={{ '--d': '.06s', padding: '18px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#2a1a17 0%,#1f1714 55%,#1a1311 100%)' }}>
            <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,color-mix(in srgb, var(--hd-gold2) 18%, transparent),transparent 70%)' }} />
            <div className="hd-row" style={{ alignItems: 'center', position: 'relative', gap: '14px' }}>
              <Avatar src={account.photo} name={me.name} size={58} onClick={() => setPhotoOpen(true)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hd-serif" style={{ fontSize: '21px' }}>{me.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--hd-muted)', marginTop: '2px' }}>{me.membershipText}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="hd-serif" style={{ fontSize: '42px', lineHeight: 1, color: 'var(--hd-gold2)' }}>{me.handicapText ?? '\u2014'}</div>
                <div className="hd-eyebrow" style={{ fontSize: '10px', marginTop: '4px' }}>Handicap</div>
              </div>
            </div>
            {/* Everything still to come, chukkas and lessons apart. Each tile
                opens where those bookings live. Ladies Only and Instructional
                are booked in Lessons, so they count there. */}
            <div style={{ marginTop: '16px', position: 'relative' }}>
              <div className="hd-eyebrow" style={{ fontSize: '10px', marginBottom: '8px' }}>All bookings</div>
              <div style={{ display: 'grid', gridTemplateColumns: tour ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
                <button type="button" className="hd-stat hd-choice" disabled={!chukkaKey} onClick={() => chukkaKey && openChukkas(chukkaKey)}
                  aria-label={`Chukkas booked: ${chukkasBooked}. Open Chukkas.`} style={{ textAlign: 'center', background: 'var(--hd-card2)', border: 0 }}>
                  <b>{chukkasBooked}</b><span>Chukka{chukkasBooked === 1 ? '' : 's'}{waiting ? ` · ${waiting} waiting` : ''}</span>
                </button>
                <button type="button" className="hd-stat hd-choice" onClick={openLessons}
                  aria-label={`Lessons booked: ${me.lessonsBooked || 0}. Open Lessons.`} style={{ textAlign: 'center', background: 'var(--hd-card2)', border: 0 }}>
                  <b>{me.lessonsBooked || 0}</b><span>Lesson{me.lessonsBooked === 1 ? '' : 's'}</span>
                </button>
                {tour && (
                  <button type="button" className="hd-stat hd-choice" onClick={() => { const el = document.getElementById('hd-my-tournaments'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else setEntering(true); }}
                    aria-label={`Tournaments entered: ${tour.mine.length}.`} style={{ textAlign: 'center', background: 'var(--hd-card2)', border: 0 }}>
                    <b>{tour.mine.length}</b><span>Tournament{tour.mine.length === 1 ? '' : 's'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hd-card hd-in" style={{ '--d': '.06s', padding: '16px 18px', fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.55 }}>
            <div style={{ color: 'var(--hd-cream)', marginBottom: '4px' }}>You&rsquo;re signed in{account.email ? ` as ${account.email}` : ''}.</div>
            {account.ambiguous
              ? 'More than one player on the club\u2019s list matches your details, so we haven\u2019t guessed. The captain can link you to the right one from Players.'
              : 'We haven\u2019t matched you to the club\u2019s player list yet. If the club has a different email for you, the captain can link your account from Players. Until then you can book from the Chukkas tab.'}
          </div>
        )}

        <div className="hd-in" style={{ '--d': '.12s', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" className="hd-primary hd-shimmer" disabled={!nextOpen}
            onClick={() => (me ? setBooking(nextOpen.key) : openChukkas(nextOpen && nextOpen.key))}>
            <span>{nextOpen ? 'Book a chukka' : 'Nothing open to book'}</span>
            {nextOpen && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '13px', opacity: .8 }}>&middot; {nextOpen.dow.charAt(0) + nextOpen.dow.slice(1).toLowerCase()} {nextOpen.dayNum}</span>}
          </button>
          <button type="button" className="hd-btn" onClick={openLessons}
            style={{ minHeight: '52px', borderRadius: '16px', border: '1px solid var(--hd-gold)', fontFamily: "'Fraunces',Georgia,serif", fontSize: '18px' }}>
            <Icon d={I.cap} size={20} stroke="var(--hd-gold2)" />Book a lesson
          </button>
          {tour && (
            <button type="button" className="hd-btn" onClick={() => (me ? setEntering(true) : openFixtures())}
              style={{ minHeight: '52px', borderRadius: '16px', border: '1px solid var(--hd-gold)', fontFamily: "'Fraunces',Georgia,serif", fontSize: '18px' }}>
              <Icon d={I.cup} size={20} stroke="var(--hd-gold2)" />Enter a tournament
              {tour.list.length > 0 && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '12px', color: 'var(--hd-muted)', marginLeft: '2px' }}>&middot; {tour.list.length} open</span>}
            </button>
          )}
        </div>

        {next && <NextChukka s={next} directions={directions} onOpen={() => openChukkas(next.key)} />}

        {me && !next && (
          <div className="hd-card hd-in" style={{ '--d': '.18s', padding: '16px 18px', fontSize: '14px', color: 'var(--hd-muted)', lineHeight: 1.5 }}>
            Nothing booked this week yet. {nextOpen ? `${nextOpen.name} on ${nextOpen.fullDay} is open \u2014 Book takes two taps.` : ''}
          </div>
        )}

        {later.length > 0 && (
          <div className="hd-in" style={{ '--d': '.22s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {later.map(s => (
              <button key={s.key} type="button" className="hd-choice hd-row" onClick={() => openChukkas(s.key)} style={{ padding: '12px 14px', minHeight: '52px' }}>
                <span style={{ flex: 1 }}>{s.name} &middot; <span style={{ color: 'var(--hd-muted)' }}>{s.dateLabel}, {s.time}</span></span>
                <span className={`hd-pill ${s.status === 'booked' ? 'hd-pill-ok' : 'hd-pill-gold'}`}>{s.status === 'booked' ? 'Booked' : `Waiting #${s.waitPlace}`}</span>
              </button>
            ))}
          </div>
        )}

        {me && tour && tour.mine.length > 0 && (
          <MyTournaments items={tour.mine} onEdit={setEditing} onOpen={openFixture} delay=".25s" />
        )}

        <Fixtures items={fixtures} onOpen={openFixture} onLive={openLive} delay=".28s" />

        <div className="hd-row" style={{ justifyContent: 'center', gap: '16px', fontSize: '12px', color: 'var(--hd-dim)', paddingTop: '4px', flexWrap: 'wrap' }}>
          <button type="button" className="hd-link" onClick={() => setProfileOpen(true)} style={{ fontSize: '12px', minHeight: '40px' }}>Your profile</button>
          <span aria-hidden="true">&middot;</span>
          <button type="button" className="hd-link" onClick={() => setPhotoOpen(true)} style={{ fontSize: '12px', minHeight: '40px' }}>Your picture</button>
          <span aria-hidden="true">&middot;</span>
          <button type="button" className="hd-link" onClick={onSignOut} style={{ fontSize: '12px', minHeight: '40px' }}>Sign out</button>
        </div>
      </div>

      {profileOpen && (
        <ProfileSheet account={account} profile={profile} me={me} handicapOptions={handicapOptions}
          onSave={onSaveProfile} onChangePassword={onChangePassword} onResetEmail={onResetEmail}
          onLinkProvider={onLinkProvider} onSignOut={onSignOut} onPhoto={() => setPhotoOpen(true)}
          onClose={() => setProfileOpen(false)} />
      )}

      {photoOpen && (
        <PhotoSheet account={account} name={shownName} onSave={onSavePhoto} onClose={() => setPhotoOpen(false)} />
      )}

      {manage && (
        <ManageSheet key={manage.key} m={manage} onAmend={onManageAmend} onCancel={onManageCancel} onClose={onManageClose} onOpenTerms={onOpenTerms} />
      )}

      {entering && me && tour && (
        <TournamentSheet me={me} tour={tour} onClose={() => setEntering(false)} onOpenTerms={onOpenTerms} onOpenFixture={openFixture} />
      )}

      {editing && me && tour && (
        <TournamentSheet key={editing.entryId} me={me} tour={tour} edit={editing} onClose={() => setEditing(null)} onOpenTerms={onOpenTerms} onOpenFixture={openFixture} />
      )}

      {booking && me && (
        <BookSheet me={me} sessions={sessions} people={people} sessionsFor={sessionsFor} initialKey={booking} quote={quote} book={book} undo={undo} onOpenTerms={onOpenTerms}
          directions={directions} onClose={() => setBooking(null)} />
      )}
    </div>
  );
}
