import React, { useEffect, useState } from 'react';
import {
  NOTICE_LEVELS, NOTICE_MAX, NOTICE_SPANS,
  dismissNotice, liveNotice, noticeDismissed, spanOf, untilLabel,
} from './notices';

// The club notice, under the tab bar on every tab — see notices.js for what
// the two levels mean. Everything is drawn from the app's own CSS variables,
// so each club gets the banner in its own colours without a second copy.
//
// A captain sees the same banner the members do, with an Edit on it, and a
// quiet "Post a notice" line when there is nothing up. Nobody has to go
// looking in a settings screen for something whose whole purpose is to be
// seen.

const S = {
  bar: { padding: '11px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.45 },
  text: { flex: 1, fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  eyebrow: { fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.85, display: 'block', marginBottom: '2px' },
  x: { background: 'transparent', border: 0, fontSize: '18px', lineHeight: 1, cursor: 'pointer', padding: '0 2px', opacity: 0.55 },
  edit: { background: 'transparent', border: 0, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline', textUnderlineOffset: '3px', color: 'inherit', opacity: 0.8, fontFamily: 'inherit' },
  empty: { textAlign: 'center', padding: '7px 16px', background: 'var(--cream-pale)', borderBottom: '1px solid var(--line)' },
  emptyBtn: { background: 'transparent', border: 0, color: 'var(--muted)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px' },
  sheet: { padding: '14px 16px', background: 'var(--cream-pale)', borderBottom: '1px solid var(--line)', textAlign: 'left' },
  label: { fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', margin: '10px 0 5px' },
  hint: { fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  btn: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '4px', padding: '9px 13px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
};

const levelStyle = (level) => (level === 'important'
  ? { background: 'var(--danger)', color: '#fff', borderBottom: '1px solid rgba(0,0,0,0.2)' }
  : { background: 'var(--cream-warm)', color: 'var(--ink)', borderBottom: '1px solid var(--line)', borderLeft: '4px solid var(--gold)' });

export default function NoticeBanner({ notice, canEdit, onSave, onClear }) {
  const live = liveNotice(notice);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: '', level: 'normal', span: 'open' });
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => noticeDismissed(live));

  // A new or edited notice must show again even on a device that dismissed the
  // last one, so the dismissal is re-checked whenever the notice changes.
  useEffect(() => { setHidden(noticeDismissed(liveNotice(notice))); }, [notice && notice.setAt, notice && notice.text]);

  // An expiry passing should take the banner down without a reload. Nothing
  // ticks while there is no expiry to wait for.
  const [, force] = useState(0);
  useEffect(() => {
    if (!notice || !notice.until) return undefined;
    const t = setTimeout(() => force((n) => n + 1), Math.min(Math.max(notice.until - Date.now(), 1000), 3600000));
    return () => clearTimeout(t);
  }, [notice && notice.until]);

  const open = () => {
    setDraft(live
      ? { text: live.text, level: live.level, span: spanOf(live) }
      : { text: '', level: 'normal', span: 'open' });
    setEditing(true);
  };

  const post = async () => {
    const text = draft.text.trim().slice(0, NOTICE_MAX);
    if (!text) return;
    const span = NOTICE_SPANS.find((s) => s.id === draft.span) || NOTICE_SPANS[0];
    setBusy(true);
    await onSave({ text, level: draft.level, until: span.until(Date.now()) });
    setBusy(false);
    setEditing(false);
  };

  const takeDown = async () => {
    setBusy(true);
    await onClear();
    setBusy(false);
    setEditing(false);
  };

  if (editing) {
    const left = NOTICE_MAX - draft.text.length;
    return (
      <div className="notice-banner" style={S.sheet}>
        <div style={{ ...S.label, margin: '0 0 5px' }}>{live ? 'The club notice' : 'Post a notice'}</div>
        <textarea
          className="input-field"
          aria-label="Notice"
          rows={3}
          maxLength={NOTICE_MAX}
          autoFocus
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="Ground closed — no chukkas on Wednesday."
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', padding: '10px 11px' }}
        />
        <div style={{ ...S.hint, textAlign: 'right' }}>{left} left</div>

        <span style={S.label}>How loud</span>
        <div style={S.row}>
          {NOTICE_LEVELS.map((l) => {
            const on = draft.level === l.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft({ ...draft, level: l.id })}
                style={{
                  ...S.btn,
                  ...(on && l.id === 'important' ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : {}),
                  ...(on && l.id === 'normal' ? { background: 'var(--cream-warm)', borderColor: 'var(--gold)', fontWeight: 600 } : {}),
                }}
              >{l.label}</button>
            );
          })}
        </div>
        <div style={{ ...S.hint, marginTop: '6px' }}>
          {(NOTICE_LEVELS.find((l) => l.id === draft.level) || {}).hint}
        </div>

        <label style={S.label} htmlFor="notice-span">Show it</label>
        <select
          id="notice-span"
          className="input-field select-field"
          value={draft.span}
          onChange={(e) => setDraft({ ...draft, span: e.target.value })}
          style={{ padding: '9px 8px', fontSize: '13px', maxWidth: '240px' }}
        >
          {NOTICE_SPANS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <div style={{ ...S.row, marginTop: '14px' }}>
          <button type="button" className="btn-primary" disabled={busy || !draft.text.trim()} onClick={post}
            style={{ padding: '11px 18px', fontSize: '12px', opacity: busy || !draft.text.trim() ? 0.6 : 1 }}>
            {busy ? 'Saving…' : live ? 'Update' : 'Post it'}
          </button>
          {live && (
            <button type="button" style={{ ...S.btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={busy} onClick={takeDown}>
              Take it down
            </button>
          )}
          <button type="button" style={S.btn} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  if (!live || (hidden && live.level !== 'important')) {
    if (!canEdit) return null;
    return (
      <div className="notice-banner" style={S.empty}>
        <button type="button" style={S.emptyBtn} onClick={open}>
          📣 {live ? 'Notice up — edit it' : 'Post a notice'}
        </button>
      </div>
    );
  }

  const important = live.level === 'important';
  const when = untilLabel(live);
  return (
    <div
      className="notice-banner"
      role={important ? 'alert' : 'status'}
      style={{ ...S.bar, ...levelStyle(live.level) }}
    >
      <span aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1.35 }}>{important ? '⚠️' : '📣'}</span>
      <div style={S.text}>
        {important && <span style={S.eyebrow}>Important</span>}
        {live.text}
        {(canEdit && when) ? <span style={{ ...S.hint, color: 'inherit', opacity: 0.7, display: 'block', marginTop: '2px' }}>Showing {when}.</span> : null}
      </div>
      {canEdit && <button type="button" style={S.edit} onClick={open}>Edit</button>}
      {!important && (
        <button type="button" style={S.x} aria-label="Dismiss this notice"
          onClick={() => { dismissNotice(live); setHidden(true); }}>×</button>
      )}
    </div>
  );
}
