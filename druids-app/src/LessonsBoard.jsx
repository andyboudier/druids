import React, { useEffect, useMemo, useState } from 'react';
import { TermsLine } from './TermsSheet';
import {
  MIN_GROUP, MAX_GROUP,
  addDays, slotOptions, takenAs, groupShort, blankSlot, blockedReason, bookingsFor, bySlotTime,
  copyWeek, dateLabel, dayLabel, groupBookings, mondayOf, newSlotId, normaliseSlot,
  parseHM, parseISO, rangeLabel, removeBooking, slotsOn, weekDays,
  windowHours, isoOf,
  isClubSession, clubSessionBookings, clubSessionPlaces, clubSessionSpots,
  clubSessionBlockedReason, fmtHM, groundCap,
} from './lessons';

// The lessons diary: a week of lessons and what is still open in each. See
// lessons.js for the model — a lesson is one time on one ground, offered as
// individual, group or both, and the first booking decides which it is.
//
// The captain builds the week here too, because the week changes every week:
// add a lesson, amend one, copy last week forward, or put someone in by hand
// when they have asked in person.
//
// A slot may instead be a CLUB SESSION — the club's own Ladies Only or
// Instructional Chukkas evening, sold whole rather than by the hour. The
// catalogue comes in as `clubSessions`, because the names and the prices are
// each club's own; a club that passes none simply never sees any of it.
//
// Money stays with the app (it knows the rates, who is military and which
// subsidy pots apply); this component asks for a quote and reports a booking
// back. Nothing is charged at booking until card payment is live.

const S = {
  wrap: { maxWidth: '520px', margin: '0 auto' },
  h: { fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' },
  card: { background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' },
  chip: (on) => ({
    padding: '6px 13px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'inherit', border: on ? '1px solid var(--ink)' : '1px solid var(--line)',
    background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--muted)',
    fontWeight: on ? 600 : 400,
  }),
  day: (on, has) => ({
    flex: '1 1 0', minWidth: '40px', padding: '6px 2px 7px', borderRadius: '10px', cursor: 'pointer',
    border: 0, fontFamily: 'inherit', textAlign: 'center',
    background: on ? 'var(--cream-warm)' : 'transparent',
    color: on ? 'var(--ink)' : (has ? 'var(--ink)' : 'var(--muted)'),
    opacity: has || on ? 1 : 0.45,
  }),
  badge: (tone) => ({
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', padding: '3px 8px', borderRadius: '999px',
    whiteSpace: 'nowrap',
    background: tone === 'gone' ? 'var(--line)' : tone === 'short' ? 'var(--cream-warm)' : 'var(--cream-warm)',
    color: tone === 'gone' ? 'var(--muted)' : tone === 'short' ? 'var(--gold)' : 'var(--burgundy)',
  }),
  book: (off) => ({
    padding: '8px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
    border: 0, cursor: off ? 'default' : 'pointer',
    background: off ? 'var(--line)' : 'var(--cream-warm)', color: off ? 'var(--muted)' : 'var(--burgundy)',
    opacity: off ? 0.7 : 1,
  }),
  btn: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  label: { display: 'block', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', margin: '10px 0 4px' },
  hint: { fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 },
  err: { fontSize: '12px', color: 'var(--danger)', marginTop: '8px', lineHeight: 1.45 },
};

const TYPE_LABEL = { individual: 'Individual', group: 'Group', session: 'Place' };

// The rider chooses the pony — nothing is ticked for them. Two plain choices,
// each with its price, and nothing can be booked until one is picked.
function PonyChoice({ value, onChange, withPony, without }) {
  const opt = (on) => ({
    flex: 1, minHeight: 58, padding: '8px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
    background: on ? 'var(--cream-warm)' : 'transparent', color: 'var(--ink)',
    border: on ? '1.5px solid var(--gold)' : '1px solid var(--line)',
  });
  // Each choice shows its price — a lesson is cheaper on the rider's own
  // pony. Where both cost the same (a session priced one way either way) it
  // only tells the yard what to have ready.
  const same = withPony.total === without.total;
  return (
    <div role="radiogroup" aria-label="Pony" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <button type="button" role="radio" aria-checked={value === true} style={opt(value === true)} onClick={() => onChange(true)}>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: 600 }}>Club pony</span>
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>{same ? 'Included in the price' : `£${withPony.money}`}</span>
      </button>
      <button type="button" role="radio" aria-checked={value === false} style={opt(value === false)} onClick={() => onChange(false)}>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: 600 }}>My own pony</span>
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>{same ? 'I’ll bring my own' : `£${without.money}`}</span>
      </button>
    </div>
  );
}

// ── The sheet that takes a booking ──────────────────────────────────────────

function BookSheet({ slot, session, who, canPickPlayer, multi = false, players, quote, onCancel, onConfirm, onOpenTerms }) {
  const [playerId, setPlayerId] = useState(who ? who.id : '');
  // A group lesson can be booked for several of the team at once.
  const spaces = Math.max(0, (Number(session.max) || 0) - (Number(session.joined) || 0));
  // A member's team, not an admin's whole list (that stays a dropdown).
  const many = multi && session.type === 'group' && canPickPlayer && players.length > 1;
  const [picked, setPicked] = useState(() => (who && players.some(p => p.id === who.id) ? [who.id] : []));
  const [pony, setPony] = useState(null); // the rider chooses; null until they do
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosenPlayers = many ? players.filter(p => picked.includes(p.id)) : [];
  const player = many ? chosenPlayers[0] : canPickPlayer ? players.find(p => String(p.id) === String(playerId)) : who;
  const withPony = quote(player, session.type, session.hours, true);
  const without = quote(player, session.type, session.hours, false);
  const chosen = pony ? withPony : without;
  const each = many && pony !== null ? chosenPlayers.map(p => ({ p, q: quote(p, session.type, session.hours, pony) })) : [];
  const total = each.reduce((n, x) => n + (Number(x.q.total) || 0), 0);
  const toggle = (id) => {
    setError('');
    setPicked(cur => (cur.includes(id) ? cur.filter(x => x !== id) : cur.length >= spaces ? cur : [...cur, id]));
  };

  const go = async () => {
    if (many ? !chosenPlayers.length : !player) { setError('Pick who the lesson is for.'); return; }
    if (pony === null) { setError('Choose a club pony or your own.'); return; }
    setBusy(true);
    const res = await onConfirm(many ? { slot, session, players: chosenPlayers, ponyHire: pony } : { slot, session, player, ponyHire: pony });
    setBusy(false);
    if (res && res.error) setError(res.error);
  };

  return (
    <div style={{ ...S.card, borderColor: 'var(--gold)' }}>
      <div style={S.h}>{TYPE_LABEL[session.type]} lesson · {session.hours} hour{session.hours === 1 ? '' : 's'}</div>
      <div style={{ fontSize: '15px', margin: '4px 0 2px' }}>{dateLabel(slot.date)}, {rangeLabel(session.start, session.hours)}</div>
      {slot.coach && <div style={S.hint}>with {slot.coach}</div>}
      {session.type === 'group' && (
        <div style={{ ...S.hint, marginTop: '4px' }}>
          {session.joined} of {session.max} booked · {session.needs > 0
            ? `needs ${session.needs} more to go ahead (minimum ${session.min})`
            : `goes ahead — minimum of ${session.min} met`}
        </div>
      )}

      {many && (
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={S.label}>Who is it for <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {spaces} place{spaces === 1 ? '' : 's'} left</span></legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {players.map(p => {
              const on = picked.includes(p.id);
              const full = !on && picked.length >= spaces;
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', minHeight: '36px', opacity: full ? 0.5 : 1, cursor: full ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(p.id)} style={{ width: '18px', height: '18px' }} />
                  <span>{who && p.id === who.id ? `${p.name} (me)` : p.name}</span>
                </label>
              );
            })}
          </div>
          <div style={{ ...S.hint, marginTop: '4px' }}>Everyone you tick is booked in and emailed their own confirmation.</div>
        </fieldset>
      )}

      {canPickPlayer && !many && (
        <>
          <label style={S.label} htmlFor="lesson-who">Who is it for</label>
          <select id="lesson-who" className="input-field select-field" value={playerId}
            onChange={(e) => { setPlayerId(e.target.value); setError(''); }}
            style={{ width: '100%', padding: '9px 8px', fontSize: '13px' }}>
            {!who && <option value="">— pick a player —</option>}
            {players.map(p => <option key={p.id} value={p.id}>{who && p.id === who.id ? `${p.name} (me)` : p.name}</option>)}
          </select>
        </>
      )}

      <PonyChoice value={pony} onChange={(v) => { setPony(v); setError(''); }} withPony={withPony} without={without} />
      {pony !== null && chosen.detail && <div style={{ ...S.hint, marginTop: '6px' }}>{chosen.detail}</div>}

      <div style={{ ...S.hint, marginTop: '8px' }}>
        {!player
          ? 'Pick a player to see what it costs.'
          : pony === null
            ? 'Choose a pony option to see the price.'
            : many && each.length > 1
              ? `${each.map(x => `${x.p.name} £${x.q.money}`).join(' · ')} — payable by card once online payment is live, nothing is taken now.`
              : `£${chosen.money}, payable by card once online payment is live — nothing is taken now.`}
      </div>

      <div style={{ ...S.row, marginTop: '12px' }}>
        <button type="button" className="btn-primary" disabled={busy || !player || pony === null} onClick={go}
          style={{ padding: '11px 18px', fontSize: '12px', opacity: busy || !player || pony === null ? 0.6 : 1 }}>
          {busy ? 'Booking…' : pony === null ? 'Choose a pony option' : many && each.length > 1 ? `Book ${each.length} — £${total.toFixed(2)}` : `Book — £${chosen.money}`}
        </button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      <TermsLine onOpen={onOpenTerms} style={{ marginTop: '8px', color: 'var(--muted)' }} />
      {error && <div style={S.err}>{error}</div>}
    </div>
  );
}

// ── The sheet that takes a place in a club session ──────────────────────────
//
// Deliberately not the lesson sheet with bits hidden. There is no length to
// choose and no individual-or-group — a place is the whole evening at one
// price — so a sheet that showed those switched
// off would only invite the question of how to switch them on.

function SessionSheet({ slot, kind, who, canPickPlayer, players, quote, onCancel, onConfirm, onOpenTerms }) {
  const [playerId, setPlayerId] = useState(who ? who.id : '');
  const [pony, setPony] = useState(null); // the rider chooses; null until they do
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const player = canPickPlayer ? players.find(p => String(p.id) === String(playerId)) : who;
  const withPony = quote(player, slot.kind, true);
  const without = quote(player, slot.kind, false);
  const chosen = pony === false ? without : withPony;
  // Instructional chukkas are one price with the pony inside it, so offering a
  // cheaper "own pony" line would be quoting a discount the club does not give.
  const ponyIsSeparate = withPony.total !== without.total;
  const left = clubSessionSpots(slot);

  const go = async () => {
    if (!player) { setError('Pick who the place is for.'); return; }
    if (ponyIsSeparate && pony === null) { setError('Choose a club pony or your own.'); return; }
    setBusy(true);
    const res = await onConfirm({ slot, player, ponyHire: ponyIsSeparate ? pony : true });
    setBusy(false);
    if (res && res.error) setError(res.error);
  };

  return (
    <div style={{ ...S.card, borderColor: 'var(--gold)' }}>
      <div style={S.h}>{(kind && kind.label) || slot.kind}</div>
      <div style={{ fontSize: '15px', margin: '4px 0 2px' }}>{dateLabel(slot.date)}, {slot.start}–{slot.end}</div>
      {slot.coach && <div style={S.hint}>with {slot.coach}</div>}
      {slot.ground && <div style={S.hint}>📍 {slot.ground}</div>}
      <div style={{ ...S.hint, marginTop: '4px' }}>
        {clubSessionBookings(slot).length} of {clubSessionPlaces(slot)} places taken · {left} left
      </div>

      {canPickPlayer && (
        <>
          <label style={S.label} htmlFor="sess-who">Who is it for</label>
          <select id="sess-who" className="input-field select-field" value={playerId}
            onChange={(e) => { setPlayerId(e.target.value); setError(''); }}
            style={{ width: '100%', padding: '9px 8px', fontSize: '13px' }}>
            {!who && <option value="">— pick a player —</option>}
            {players.map(p => <option key={p.id} value={p.id}>{who && p.id === who.id ? `${p.name} (me)` : p.name}</option>)}
          </select>
        </>
      )}

      {ponyIsSeparate ? (
        <PonyChoice value={pony} onChange={(v) => { setPony(v); setError(''); }} withPony={withPony} without={without} />
      ) : (
        <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--cream-warm)', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
          <span>The session, pony included</span><strong>£{chosen.money}</strong>
        </div>
      )}
      {chosen.detail && (!ponyIsSeparate || pony !== null) && <div style={{ ...S.hint, marginTop: '6px' }}>{chosen.detail}</div>}

      <div style={{ ...S.hint, marginTop: '8px' }}>
        {player
          ? chosen.total > 0
            ? `£${chosen.money}, payable by card once online payment is live — nothing is taken now.`
            : `Nothing to pay — ${player.name}'s membership covers it.`
          : 'Pick a player to see what it costs.'}
      </div>

      <div style={{ ...S.row, marginTop: '12px' }}>
        <button type="button" className="btn-primary" disabled={busy || !player || (ponyIsSeparate && pony === null)} onClick={go}
          style={{ padding: '11px 18px', fontSize: '12px', opacity: busy || !player || (ponyIsSeparate && pony === null) ? 0.6 : 1 }}>
          {busy ? 'Booking…' : ponyIsSeparate && pony === null ? 'Choose a pony option' : chosen.total > 0 ? `Book a place — £${chosen.money}` : 'Book a place'}
        </button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      <TermsLine onOpen={onOpenTerms} style={{ marginTop: '8px', color: 'var(--muted)' }} />
      {error && <div style={S.err}>{error}</div>}
    </div>
  );
}

// ── The captain's window editor ─────────────────────────────────────────────

function SlotEditor({ draft, setDraft, clubSessions, grounds = [], onSave, onDelete, onCancel }) {
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft(d => ({ ...d, [k]: v })); setError('');
  };
  const hours = windowHours(draft);
  const cap = groundCap(draft.ground);
  const kinds = clubSessions || [];
  // The ground sets the most riders: six in the arena, eight elsewhere. Picking
  // one pulls the maximum (and a minimum above it) down to fit, and a fresh
  // slot starts at the ground's full number.
  const setGround = (e) => {
    const g = e.target.value;
    const c = groundCap(g);
    setError('');
    setDraft(d => {
      const max = Math.min(Number(d.maxGroup) || c, c);
      return { ...d, ground: g, maxGroup: d.id ? max : c, minGroup: Math.min(Number(d.minGroup) || 1, d.id ? max : c) };
    });
  };
  const kind = kinds.find(k => k.id === draft.kind) || null;

  // Picking a session fixes its shape from the catalogue — an hour, eight
  // places — so a captain cannot put on a two-hour Ladies Only that the club
  // has no price for. Going back to a window restores the coaching switches.
  const pickKind = (id) => {
    const k = kinds.find(x => x.id === id) || null;
    setError('');
    setDraft(d => (k
      ? { ...d, kind: k.id, individual: false, group: false,
          end: fmtHM((parseHM(d.start) ?? 600) + (Number(k.hours) || 1) * 60),
          maxGroup: Math.min(Number(k.places) || MAX_GROUP, groundCap(d.ground)), minGroup: 1 }
      : { ...d, kind: '', individual: true, group: true,
          minGroup: Math.min(MIN_GROUP, groundCap(d.ground)), maxGroup: groundCap(d.ground) }));
  };

  // A session's end follows its start, because its length is the catalogue's.
  const setStart = (e) => {
    const v = e.target.value;
    setError('');
    setDraft(d => (kind
      ? { ...d, start: v, end: fmtHM((parseHM(v) ?? 600) + (Number(kind.hours) || 1) * 60) }
      : { ...d, start: v }));
  };

  const save = () => {
    if (!parseISO(draft.date)) { setError('Pick a date.'); return; }
    if (!draft.ground) { setError('Pick where it is.'); return; }
    if ((kind || draft.group) && Number(draft.maxGroup) > cap) { setError(`${draft.ground} takes at most ${cap} riders.`); return; }
    if (parseHM(draft.start) === null || parseHM(draft.end) === null) { setError('Times need to look like 14:00.'); return; }
    if (hours < 1) { setError('The window needs to be at least a whole hour, and end after it starts.'); return; }
    if (kind) {
      const places = Number(draft.maxGroup) || Number(kind.places) || MAX_GROUP;
      if (places < 1) { setError('A session needs at least one place.'); return; }
      onSave({ ...draft, id: draft.id || newSlotId(), individual: false, group: false, minGroup: 1, maxGroup: places });
      return;
    }
    if (!draft.individual && !draft.group) { setError('Offer an individual lesson, a group lesson, or both.'); return; }
    if (draft.group && Number(draft.minGroup) > Number(draft.maxGroup)) { setError('The group minimum cannot be more than the maximum.'); return; }
    onSave({ ...draft, id: draft.id || newSlotId(), kind: '', minGroup: Number(draft.minGroup) || MIN_GROUP, maxGroup: Number(draft.maxGroup) || MAX_GROUP });
  };

  return (
    <div style={{ ...S.card, borderColor: 'var(--gold)' }}>
      <div style={S.h}>{draft.id ? 'Amend this slot' : 'New lesson slot'}</div>

      {kinds.length > 0 && (
        <>
          <label style={S.label}>What is it</label>
          <div style={S.row}>
            <button type="button" style={S.chip(!kind)} aria-pressed={!kind} onClick={() => pickKind('')}>Lesson</button>
            {kinds.map(k => (
              <button key={k.id} type="button" style={S.chip(draft.kind === k.id)} aria-pressed={draft.kind === k.id}
                onClick={() => pickKind(k.id)}>{k.label}</button>
            ))}
          </div>
          {kind && <div style={{ ...S.hint, marginTop: '6px' }}>{kind.blurb}. Booked whole, up to {draft.maxGroup} riders.</div>}
        </>
      )}

      <div style={S.row}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-date">Date</label>
          <input id="ls-date" className="input-field" type="date" value={draft.date} onChange={set('date')} style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '0 1 90px' }}>
          <label style={S.label} htmlFor="ls-start">From</label>
          <input id="ls-start" className="input-field" type="time" step="3600" value={draft.start} onChange={setStart} style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '0 1 90px' }}>
          <label style={S.label} htmlFor="ls-end">To</label>
          <input id="ls-end" className="input-field" type="time" step="3600" value={draft.end} onChange={set('end')} disabled={!!kind}
            style={{ width: '100%', padding: '9px', fontSize: '13px', opacity: kind ? 0.6 : 1 }} />
        </div>
      </div>
      {hours > 0 && (
        <div style={{ ...S.hint, marginTop: '6px' }}>
          {kind
            ? `${kind.label} runs ${kind.hours} hour${kind.hours === 1 ? '' : 's'} — ${kind.chukkas} chukkas — so the finish follows the start.`
            : `One ${hours}-hour lesson, booked whole. The first booking decides whether it runs as an individual or a group lesson.`}
        </div>
      )}

      <div style={S.row}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-coach">Coach</label>
          <input id="ls-coach" className="input-field" type="text" value={draft.coach} onChange={set('coach')} placeholder="e.g. Rosie" style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-ground">Where</label>
          <select id="ls-ground" className="input-field select-field" value={draft.ground} onChange={setGround} style={{ width: '100%', padding: '9px', fontSize: '13px' }}>
            <option value="">— pick a ground —</option>
            {grounds.map(g => <option key={g} value={g}>{g}</option>)}
            {draft.ground && !grounds.includes(draft.ground) && <option value={draft.ground}>{draft.ground}</option>}
          </select>
        </div>
      </div>

      {kind ? (
        <div style={{ ...S.row, marginTop: '10px' }}>
          <label style={{ fontSize: '12px', color: 'var(--muted)' }} htmlFor="ls-places">Places</label>
          <input id="ls-places" className="input-field" type="number" min="1" max={cap} value={draft.maxGroup} onChange={set('maxGroup')} style={{ width: '70px', padding: '7px', fontSize: '13px' }} />
          <span style={S.hint}>up to {cap} {draft.ground ? `at ${draft.ground}` : 'riders'}</span>
        </div>
      ) : (
        <>
          <label style={S.label}>Offer as</label>
          <div style={S.row}>
            <label style={{ ...S.row, gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.individual} onChange={set('individual')} /> Individual
            </label>
            <label style={{ ...S.row, gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.group} onChange={set('group')} /> Group
            </label>
          </div>
          {draft.group && (
            <div style={{ ...S.row, marginTop: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)' }} htmlFor="ls-min">Group size: at least</label>
              <input id="ls-min" className="input-field" type="number" min="1" max={cap} value={draft.minGroup} onChange={set('minGroup')} style={{ width: '70px', padding: '7px', fontSize: '13px' }} />
              <label style={{ fontSize: '12px', color: 'var(--muted)' }} htmlFor="ls-max">at most</label>
              <input id="ls-max" className="input-field" type="number" min="1" max={cap} value={draft.maxGroup} onChange={set('maxGroup')} style={{ width: '70px', padding: '7px', fontSize: '13px' }} />
              <span style={S.hint}>{draft.ground ? `${draft.ground} takes up to ${cap}` : `up to ${cap}`}</span>
            </div>
          )}
        </>
      )}


      <label style={S.label} htmlFor="ls-note">Note <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
      <input id="ls-note" className="input-field" type="text" value={draft.note} onChange={set('note')} placeholder="Anything riders should know" style={{ width: '100%', padding: '9px', fontSize: '13px' }} />

      <div style={{ ...S.row, marginTop: '14px' }}>
        <button type="button" className="btn-primary" onClick={save} style={{ padding: '11px 18px', fontSize: '12px' }}>
          {draft.id ? 'Save changes' : kind ? `Add ${kind.label}` : 'Add slot'}
        </button>
        {draft.id && onDelete && (
          <button type="button" style={{ ...S.btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => onDelete(draft)}>Delete</button>
        )}
        <button type="button" style={S.btn} onClick={onCancel}>Cancel</button>
      </div>
      {error && <div style={S.err}>{error}</div>}
    </div>
  );
}

// ── One club session, and the places left in it ─────────────────────────────

function SessionCard({ slot, kind, captainMode, onPick, onEdit, onRemoveBooking }) {
  const riders = clubSessionBookings(slot);
  const places = clubSessionPlaces(slot);
  const left = clubSessionSpots(slot);

  return (
    <div data-slot-id={slot.id} style={{ ...S.card, borderColor: left ? 'var(--gold)' : 'var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{slot.start}–{slot.end}</div>
          <div style={{ fontSize: '16px', fontWeight: 600, margin: '2px 0' }}>{(kind && kind.label) || slot.kind}</div>
          {kind && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{kind.blurb}</div>}
          {slot.coach && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>with {slot.coach}</div>}
          {slot.ground && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>📍 {slot.ground}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span style={S.badge(left ? 'open' : 'gone')}>
            {left ? `${left} of ${places} left` : 'Full'}
          </span>
          {captainMode && <button type="button" style={{ ...S.btn, padding: '4px 9px', fontSize: '11px' }} onClick={() => onEdit(slot)}>Edit</button>}
        </div>
      </div>

      {slot.note && <div style={{ ...S.hint, marginTop: '6px' }}>{slot.note}</div>}

      {/* Everyone sees who is in it. These are the club's own evenings, and a
          member deciding whether to come wants to know who else is coming —
          the chukka board has always shown the same. */}
      {riders.length > 0 && (
        <div style={{ marginTop: '9px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          {riders.map(b => b.name).filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ ...S.row, marginTop: '11px' }}>
        <button type="button" style={S.book(!left)} disabled={!left} onClick={() => onPick(slot)}>
          {left ? 'Book a place' : 'Full'}
        </button>
      </div>

      {captainMode && riders.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
          <div style={{ ...S.h, marginBottom: '5px' }}>Booked in</div>
          {riders.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
              <span style={{ flex: 1 }}>
                {b.name}{b.ponyHire ? ' · pony hire' : ' · own pony'}
              </span>
              <button type="button" className="remove-btn" title={`Take ${b.name} off`} onClick={() => onRemoveBooking(slot, b)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── One lesson slot ─────────────────────────────────────────────────────────
//
// Shows what the slot can still be booked as. The first booking decides:
// once someone has it as an individual lesson the group option goes, and once
// a group has started the individual one goes. A group below its minimum is
// flagged, and the admin gets the three ways to settle it.

function SlotCard({ slot, filter, rates, captainMode, onPick, onEdit, onRemoveBooking, onResolveGroup }) {
  const as = takenAs(slot);
  const options = slotOptions(slot, rates).filter(o => filter === 'all' || o.type === filter);
  const bookings = (slot.bookings || []).filter(b => b.type === 'individual' || b.type === 'group');
  const group = groupBookings(slot);
  const short = groupShort(slot);
  const min = Math.max(1, Number(slot.minGroup) || MIN_GROUP);
  const max = Math.max(1, Number(slot.maxGroup) || MAX_GROUP);
  const [busy, setBusy] = useState('');
  const resolve = async (action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    await onResolveGroup(slot, action);
    setBusy('');
  };

  const title = as === 'individual' ? 'Individual lesson'
    : as === 'group' ? 'Group lesson'
    : [slot.individual && 'Individual', slot.group && 'Group'].filter(Boolean).join(' or ') + ' lesson';
  const badge = as === 'individual' ? ['Booked', 'gone']
    : as === 'group' ? (group.length >= max ? ['Full', 'gone'] : short ? [`${group.length} of ${min} needed`, 'short'] : [`${max - group.length} of ${max} left`, 'open'])
    : ['Available', 'open'];

  return (
    <div data-slot-id={slot.id} style={{ ...S.card, borderColor: short ? 'var(--gold)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{slot.start}–{slot.end}</div>
          <div style={{ fontSize: '16px', fontWeight: 600, margin: '2px 0' }}>{title}</div>
          {slot.coach && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>with {slot.coach}</div>}
          {slot.ground && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>📍 {slot.ground}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span style={S.badge(badge[1])}>{badge[0]}</span>
          {captainMode && <button type="button" style={{ ...S.btn, padding: '4px 9px', fontSize: '11px' }} onClick={() => onEdit(slot)}>Edit</button>}
        </div>
      </div>

      {slot.note && <div style={{ ...S.hint, marginTop: '6px' }}>{slot.note}</div>}

      {options.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {options.map((o) => (
            <div key={o.type}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 11px', borderRadius: '10px',
                       border: '1px solid var(--line)', opacity: o.blocked ? 0.55 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{TYPE_LABEL[o.type]}</div>
                <div style={{ fontSize: '12px', color: o.type === 'group' && o.needs > 0 && o.joined > 0 ? 'var(--gold)' : 'var(--muted)' }}>
                  {o.type === 'individual'
                    ? (o.blocked || 'Just you and the coach')
                    : o.blocked
                      ? o.blocked
                      : o.joined === 0
                        ? `${o.min}–${o.max} riders · be the first`
                        : o.needs > 0
                          ? `${o.joined} of ${o.max} booked · needs ${o.needs} more to go ahead`
                          : `${o.joined} of ${o.max} booked · going ahead`}
                </div>
              </div>
              <button type="button" style={S.book(!!o.blocked)} disabled={!!o.blocked} onClick={() => onPick(slot, o)}>
                {o.blocked ? '—' : o.type === 'group' && o.joined > 0 ? 'Join' : 'Book'}
              </button>
            </div>
          ))}
        </div>
      )}

      {as === 'individual' && !options.length && (
        <div style={{ ...S.hint, marginTop: '8px' }}>This lesson is taken.</div>
      )}

      {/* Everyone sees who is in a group — deciding whether to join depends on
          it, as the chukka lists always have. An individual lesson is private. */}
      {as === 'group' && group.length > 0 && (
        <div style={{ marginTop: '9px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          {group.map(b => b.name).filter(Boolean).join(' · ')}
        </div>
      )}

      {captainMode && short && (
        <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px dashed var(--gold)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Short of the minimum</div>
          <div style={{ ...S.hint, marginBottom: '8px' }}>{group.length} booked, {min} needed. Your call:</div>
          <div style={S.row}>
            {group.length > 1 && (
              <button type="button" style={S.btn} disabled={!!busy} onClick={() => resolve('smaller')}>
                {busy === 'smaller' ? 'Saving…' : `Run as a group of ${group.length}`}
              </button>
            )}
            {group.length === 1 && (
              <button type="button" style={S.btn} disabled={!!busy}
                onClick={() => resolve('individual', `Make ${group[0].name}'s booking an individual lesson? It is re-priced at the individual rate.`)}>
                {busy === 'individual' ? 'Saving…' : 'Make it individual'}
              </button>
            )}
            <button type="button" style={{ ...S.btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={!!busy}
              onClick={() => resolve('cancel', `Cancel this group and take ${group.length === 1 ? group[0].name : `all ${group.length} riders`} off?`)}>
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel the group'}
            </button>
          </div>
        </div>
      )}

      {captainMode && bookings.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
          <div style={{ ...S.h, marginBottom: '5px' }}>Booked in</div>
          {bookings.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
              <span style={{ flex: 1 }}>
                {b.name} · {TYPE_LABEL[b.type]}
                {b.ponyHire ? ' · club pony' : ' · own pony'}
              </span>
              <button type="button" className="remove-btn" title={`Take ${b.name} off`} onClick={() => onRemoveBooking(slot, b)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── The board ───────────────────────────────────────────────────────────────

export default function LessonsBoard({
  slots, onSaveSlots, captainMode, canBookAsSelf, myPlayer, players, rates,
  // A member may book themselves or anyone on their team — the same rule as
  // chukkas. An admin may book anyone.
  teammates = [],
  onOpenTerms = null,
  quote, onBook, onCancelBooking, onResolveGroup, grounds = [],
  clubSessions = [], quoteSession, onBookSession,
  // Open the board on one date, showing club sessions, and bring one slot
  // into view — how Thursday and Friday on the Chukkas tab land here.
  // { date: 'YYYY-MM-DD', slotId?, at } — `at` makes a repeat tap re-apply.
  focus = null,
}) {
  const today = isoOf(new Date());
  const [monday, setMonday] = useState(() => mondayOf(today));
  const [day, setDay] = useState(() => today);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (!focus || !focus.date) return;
    setMonday(mondayOf(focus.date));
    setDay(focus.date);
    setFilter(clubSessions.length ? 'session' : 'all');
    setEditing(null); setPicking(null); setTaking(null); setNote('');
    const t = setTimeout(() => {
      const el = focus.slotId && document.querySelector(`[data-slot-id="${focus.slotId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(t);
  }, [focus && focus.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const [editing, setEditing] = useState(null);   // slot draft | null
  const [picking, setPicking] = useState(null);   // { slot, session } | null
  const [taking, setTaking] = useState(null);    // a club session slot | null
  const [note, setNote] = useState('');
  const kindOf = (slot) => clubSessions.find(k => k.id === slot.kind) || null;

  const bookable = captainMode ? players : (myPlayer ? [myPlayer, ...teammates] : []);
  const canPick = captainMode || (!!myPlayer && teammates.length > 0);
  const days = weekDays(monday);
  // A member sees what they could book and what they are already in; the rest
  // — someone else's individual lesson, a full group or session — is only
  // clutter for them. An admin sees every slot, because they run them all.
  // "Mine" includes the team: a lesson booked for a teammate stays in view.
  const ourIds = new Set([myPlayer, ...teammates].filter(Boolean).map(p => p.id));
  const ourNames = new Set([myPlayer, ...teammates].filter(Boolean).map(p => String(p.name || '').trim().toLowerCase()));
  const isMineIn = (sl) => !!myPlayer && (sl.bookings || []).some(b => (
    (b.playerId != null && ourIds.has(b.playerId))
    || ourNames.has(String(b.name || '').trim().toLowerCase())
  ));
  const visible = (sl) => captainMode || isMineIn(sl) || (isClubSession(sl)
    ? clubSessionSpots(sl) > 0
    : slotOptions(sl, rates).some(o => !o.blocked));
  const onDay = useMemo(() => slotsOn(slots, day).filter(visible), [slots, day, captainMode, myPlayer, teammates, rates]); // eslint-disable-line react-hooks/exhaustive-deps
  // The filter picks which SLOTS appear: a coaching filter hides the club
  // sessions outright rather than showing an empty card for each.
  const shown = useMemo(() => onDay.filter(sl => (
    filter === 'all' ? true : filter === 'session' ? isClubSession(sl) : !isClubSession(sl)
  )), [onDay, filter]);
  const countOn = (iso) => slotsOn(slots, iso).filter(visible).length;
  const mine = useMemo(
    () => (myPlayer ? bookingsFor(slots, { playerId: myPlayer.id, name: myPlayer.name }) : []),
    [slots, myPlayer]);

  // Keep the chosen day inside the week being looked at.
  const goWeek = (delta) => {
    const m = addDays(monday, delta * 7);
    setMonday(m);
    setDay(weekDays(m).includes(day) ? day : m);
    setEditing(null); setPicking(null); setTaking(null); setNote('');
  };

  const saveSlot = async (slot) => {
    const clean = normaliseSlot(slot);
    if (!clean) return;
    const rest = slots.filter(s => s.id !== clean.id);
    await onSaveSlots([...rest, clean].sort(bySlotTime));
    setEditing(null);
    setDay(clean.date);
    if (!days.includes(clean.date)) setMonday(mondayOf(clean.date));
    setNote('Slot saved.');
  };

  const deleteSlot = async (slot) => {
    await onSaveSlots(slots.filter(s => s.id !== slot.id));
    setEditing(null);
    setNote(`Slot removed${(slot.bookings || []).length ? ` — ${slot.bookings.length} booking(s) went with it` : ''}.`);
  };

  const doCopy = async () => {
    const from = addDays(monday, -7);
    const res = copyWeek(slots, from, monday);
    if (!res.made.length) {
      setNote(res.skipped.length
        ? 'Last week’s slots are already on this week.'
        : 'There is nothing on last week to copy.');
      return;
    }
    await onSaveSlots(res.slots);
    setNote(`Copied ${res.made.length} slot${res.made.length === 1 ? '' : 's'} from last week${res.skipped.length ? `, skipping ${res.skipped.length} already here` : ''}. Bookings did not come across.`);
  };

  const confirmPlace = async ({ slot, player, ponyHire }) => {
    const reason = clubSessionBlockedReason(slot, { playerId: player.id, name: player.name });
    if (reason) { setTaking(null); setNote(reason); return { error: reason }; }
    const res = await onBookSession({ slot, player, ponyHire });
    if (res && res.error) return res;
    setTaking(null);
    setNote(res && res.message ? res.message : 'Booked.');
    return {};
  };

  const confirmBooking = async ({ slot, session, player, players: who, ponyHire }) => {
    const reason = blockedReason(slot, session.start, session.hours, session.type, rates);
    if (reason) { setPicking(null); setNote(reason); return { error: reason }; }
    const res = await onBook({ slot, session, player, players: who, ponyHire });
    if (res && res.error) return res;
    setPicking(null);
    setNote(res && res.message ? res.message : 'Booked.');
    return {};
  };

  return (
    <div style={S.wrap}>
      {/* Week */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button type="button" style={S.btn} onClick={() => goWeek(-1)} aria-label="Previous week">‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={S.h}>Week of</div>
          <div style={{ fontSize: '14px' }}>{dateLabel(monday).replace(/^\w+,?\s*/, '')}</div>
        </div>
        <button type="button" style={S.btn} onClick={() => goWeek(1)} aria-label="Next week">›</button>
      </div>

      {/* Days */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
        {days.map(iso => {
          const n = countOn(iso);
          return (
            <button key={iso} type="button" style={S.day(iso === day, n > 0)}
              onClick={() => { setDay(iso); setPicking(null); setNote(''); }}
              aria-label={dateLabel(iso)} aria-pressed={iso === day}>
              <div style={{ fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{dayLabel(iso)}</div>
              <div style={{ fontSize: '16px', fontWeight: iso === day ? 700 : 500 }}>{Number(iso.slice(8))}</div>
              <div style={{ height: '4px', marginTop: '2px' }}>
                {n > 0 && <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: iso === day ? 'var(--burgundy)' : 'var(--gold)' }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ ...S.row, marginBottom: '12px' }}>
        {[['all', clubSessions.length ? 'Everything' : 'All lessons'], ...(clubSessions.length ? [['session', 'Club sessions']] : []),
          ['individual', 'Individual'], ['group', 'Group']].map(([id, label]) => (
          <button key={id} type="button" style={S.chip(filter === id)} onClick={() => setFilter(id)} aria-pressed={filter === id}>{label}</button>
        ))}
      </div>

      {captainMode && (
        <div style={{ ...S.row, marginBottom: '12px' }}>
          <button type="button" style={S.btn} onClick={() => { setEditing({ ...blankSlot(day), id: '' }); setPicking(null); setTaking(null); setNote(''); }}>{clubSessions.length ? '＋ Lesson' : '＋ Add a lesson'}</button>
          {clubSessions.map(k => (
            <button key={k.id} type="button" style={S.btn}
              onClick={() => {
                setEditing({ ...blankSlot(day), id: '', kind: k.id, individual: false, group: false,
                  start: k.start || '17:30', end: fmtHM((parseHM(k.start) ?? parseHM('17:30')) + (Number(k.hours) || 1) * 60),
                  minGroup: 1, maxGroup: Number(k.places) || MAX_GROUP });
                setPicking(null); setTaking(null); setNote('');
              }}>＋ {k.label}</button>
          ))}
          <button type="button" style={S.btn} onClick={doCopy}>⧉ Copy last week</button>
        </div>
      )}

      {note && <div style={{ ...S.hint, color: 'var(--burgundy)', marginBottom: '10px' }}>{note}</div>}

      {editing && (
        <SlotEditor draft={editing} setDraft={setEditing} clubSessions={clubSessions} grounds={grounds} onSave={saveSlot}
          onDelete={editing.id ? deleteSlot : null} onCancel={() => setEditing(null)} />
      )}

      {taking && (
        <SessionSheet
          slot={taking} kind={kindOf(taking)}
          who={myPlayer} canPickPlayer={canPick} players={bookable}
          quote={quoteSession} onOpenTerms={onOpenTerms}
          onCancel={() => setTaking(null)} onConfirm={confirmPlace} />
      )}

      {picking && (
        <BookSheet
          slot={picking.slot} session={picking.session}
          who={myPlayer} canPickPlayer={canPick} multi={!captainMode} players={bookable}
          quote={quote} onOpenTerms={onOpenTerms}
          onCancel={() => setPicking(null)} onConfirm={confirmBooking} />
      )}

      {/* The day */}
      {shown.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '14px' }}>
            {onDay.length ? `Nothing of that kind on ${dateLabel(day)}.` : (captainMode ? `No lessons on ${dateLabel(day)}.` : `Nothing to book on ${dateLabel(day)}.`)}
          </div>
          {captainMode && <div style={{ ...S.hint, marginTop: '4px' }}>{clubSessions.length ? 'Add a slot or a session, or copy last week across.' : 'Add a slot, or copy last week across.'}</div>}
        </div>
      ) : shown.map(slot => (isClubSession(slot) ? (
        <SessionCard key={slot.id} slot={slot} kind={kindOf(slot)} captainMode={captainMode}
          onPick={(sl) => {
            if (!captainMode && !canBookAsSelf) { setNote('Sign in to book a place.'); return; }
            setEditing(null); setPicking(null); setNote(''); setTaking(sl);
          }}
          onEdit={(sl) => { setPicking(null); setTaking(null); setNote(''); setEditing({ ...sl }); }}
          onRemoveBooking={(sl, b) => onCancelBooking(sl, b)} />
      ) : (
        <SlotCard key={slot.id} slot={slot} filter={filter === 'session' ? 'all' : filter} rates={rates} captainMode={captainMode}
          onPick={(sl, se) => {
            if (!captainMode && !canBookAsSelf) { setNote('Sign in to book a lesson.'); return; }
            setEditing(null); setTaking(null); setNote(''); setPicking({ slot: sl, session: se });
          }}
          onEdit={(sl) => { setPicking(null); setTaking(null); setNote(''); setEditing({ ...sl }); }}
          onRemoveBooking={(sl, b) => onCancelBooking(sl, b)}
          onResolveGroup={async (sl, action) => {
            if (!onResolveGroup) return;
            const res = await onResolveGroup(sl, action);
            setNote((res && (res.message || res.error)) || '');
          }} />
      )))}

      {/* Mine */}
      {mine.length > 0 && (
        <div style={{ ...S.card, marginTop: '14px' }}>
          <div style={S.h}>{clubSessions.length ? 'Your bookings' : 'Your lessons'}</div>
          {mine.map(({ slot, booking }) => (
            <div key={booking.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0' }}>
              <span style={{ flex: 1 }}>
                {dateLabel(slot.date)} · {rangeLabel(booking.start, Number(booking.hours) || 1)}
                {' · '}{booking.type === 'session'
                  ? ((kindOf(slot) && kindOf(slot).label) || slot.kind)
                  : TYPE_LABEL[booking.type]}
                {booking.ponyHire ? ' · pony hire' : ' · own pony'}
              </span>
              <button type="button" className="remove-btn" title="Cancel this lesson" onClick={() => onCancelBooking(slot, booking)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
