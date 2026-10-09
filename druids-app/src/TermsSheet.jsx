import React, { useEffect, useRef, useState } from 'react';
import { TERMS_SECTIONS, TERMS_SUMMARY, TERMS_DRAFT, TERMS_CLUB } from './terms';

// The booking terms, full screen in the club's dark look.
//   mode 'read'   — the terms, with a close button (footer link, booking
//                   screens, the link in a booking email).
//   mode 'accept' — first sign-in, or new terms: the key points, the full
//                   text a tap away, and an unticked "I accept" box. Continue
//                   stays off until it is ticked; the member may sign out.

// The club's name, crest and dark colours come from its own terms.js, so this
// file is the same in every app.
const C = TERMS_CLUB.colors;
const primary = (on) => ({
  width: '100%', minHeight: 56, borderRadius: 16, background: C.burg, border: `1px solid ${C.gold}`, color: C.cream,
  fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.5,
});

function FullTerms() {
  return (
    <div style={{ marginTop: 8 }}>
      {TERMS_SECTIONS.map(s => (
        <section key={s.h} style={{ marginTop: 22 }}>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 19, margin: '0 0 8px', color: C.cream }}>{s.h}</h2>
          {s.p.map((t, i) => <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: C.muted, margin: '0 0 10px' }}>{t}</p>)}
        </section>
      ))}
    </div>
  );
}

export default function TermsSheet({ mode = 'read', onClose, onAccept, onSignOut, onOpenPrivacy }) {
  const [ticked, setTicked] = useState(false);
  const [showAll, setShowAll] = useState(mode === 'read');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const headRef = useRef(null);
  useEffect(() => {
    headRef.current && headRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && mode === 'read') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = async () => {
    if (!ticked || busy) return;
    setBusy(true); setError('');
    try { await onAccept(); }
    catch (e) { setError('That didn’t save — please check your connection and try again.'); setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="terms-title"
      style={{ position: 'fixed', inset: 0, zIndex: 2100, background: C.bg, color: C.cream, overflowY: 'auto',
        fontFamily: "'Outfit', system-ui, sans-serif", padding: 'calc(env(safe-area-inset-top,0px) + 28px) 20px calc(env(safe-area-inset-bottom,0px) + 32px)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={TERMS_CLUB.crest} alt="" width="56" height="56" style={{ width: 56, height: 56, objectFit: 'contain', ...(TERMS_CLUB.crestRound ? { borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 1.5px ${C.gold}` } : {}) }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: C.muted }}>{TERMS_CLUB.name}</div>
            <h1 id="terms-title" ref={headRef} tabIndex={-1} style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 28, margin: 0, outline: 'none' }}>Booking terms</h1>
          </div>
          {mode === 'read' && (
            <button type="button" onClick={onClose} aria-label="Close the terms"
              style={{ width: 44, height: 44, borderRadius: '50%', background: C.card, border: `1px solid ${C.line}`, color: C.cream, fontSize: 22, cursor: 'pointer' }}>×</button>
          )}
        </div>
        {TERMS_DRAFT && (
          <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 10, border: `1px dashed ${C.gold}`, color: C.gold2, fontSize: 12 }}>
            Draft — awaiting committee review. Points in [square brackets] are still to be decided.
          </div>
        )}

        {mode === 'accept' && (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: C.muted, margin: '18px 0 6px' }}>
              Before your first booking, please read and accept the club’s booking terms. The main points:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {TERMS_SUMMARY.map((t, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.55, color: C.cream, margin: '6px 0' }}>{t}</li>)}
            </ul>
            <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
              style={{ background: 'none', border: 0, color: C.gold2, fontSize: 14, padding: '12px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
              {showAll ? 'Hide the full terms ▴' : 'Read the full terms ▾'}
            </button>
          </>
        )}

        {showAll && <FullTerms />}

        {mode === 'read' && onOpenPrivacy && (
          <button type="button" onClick={onOpenPrivacy}
            style={{ background: 'none', border: 0, color: C.gold2, fontSize: 14, padding: '6px 0 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
            The club’s privacy notice ›
          </button>
        )}

        {mode === 'accept' && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={ticked} onChange={e => setTicked(e.target.checked)}
                style={{ width: 22, height: 22, marginTop: 1, accentColor: C.gold, flexShrink: 0 }} />
              <span>I have read and accept the booking terms.</span>
            </label>
            {error && <div role="alert" style={{ color: '#f0b9b9', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <button type="button" disabled={!ticked || busy} onClick={accept} style={{ ...primary(ticked && !busy), marginTop: 16 }}>
              {busy ? 'Saving…' : 'Continue'}
            </button>
            {onSignOut && (
              <button type="button" onClick={onSignOut}
                style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 0, color: C.muted, fontSize: 14, minHeight: 44, cursor: 'pointer', fontFamily: 'inherit' }}>
                Not now — sign out
              </button>
            )}
          </div>
        )}
        {mode === 'read' && (
          <button type="button" onClick={onClose} style={{ ...primary(true), marginTop: 26 }}>Close</button>
        )}
      </div>
    </div>
  );
}

// "By booking you agree to the Booking terms" — under every Book button.
export function TermsLine({ onOpen, style }) {
  if (!onOpen) return null;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.85, ...style }}>
      By booking you agree to the{' '}
      <button type="button" onClick={onOpen}
        style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', font: 'inherit', cursor: 'pointer' }}>
        Booking terms
      </button>.
    </div>
  );
}
