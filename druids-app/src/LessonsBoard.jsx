import React, { useMemo, useState } from 'react';
import {
  MIN_GROUP, MAX_GROUP,
  addDays, availableSessions, blankSlot, blockedReason, bookingsFor, bySlotTime,
  copyWeek, dateLabel, dayLabel, groupBookings, mondayOf, newSlotId, normaliseSlot,
  parseHM, parseISO, rangeLabel, removeBooking, slotsOn, tokenCost, weekDays,
  windowHours, isoOf,
} from './lessons';

// The lessons diary: a week of coaching windows, and what can still be taken
// out of them. See lessons.js for the model — a window is not a lesson, it is
// the coach's availability, and a booking claims part of it.
//
// The captain builds the week here too, because the week changes every week:
// add a window, amend one, copy last week forward, or put someone in by hand
// when they have asked in person.
//
// Money and tokens stay with the app (it knows the rates, who is military and
// which subsidy pots apply); this component asks for a quote and reports a
// booking back.

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

const TYPE_LABEL = { individual: 'Individual', group: 'Group' };

// ── The sheet that takes a booking ──────────────────────────────────────────

function BookSheet({ slot, session, who, canPickPlayer, players, quote, tokensOf, onCancel, onConfirm }) {
  const [playerId, setPlayerId] = useState(who ? who.id : '');
  const [pony, setPony] = useState(slot.ponyHireDefault !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const player = canPickPlayer ? players.find(p => String(p.id) === String(playerId)) : who;
  const withPony = quote(player, session.type, session.hours, true);
  const without = quote(player, session.type, session.hours, false);
  const chosen = pony ? withPony : without;
  const tokens = tokensOf(player);
  const cost = tokenCost(session.hours);
  const payingWithTokens = tokens >= cost;

  const go = async () => {
    if (!player) { setError('Pick who the lesson is for.'); return; }
    setBusy(true);
    const res = await onConfirm({ slot, session, player, ponyHire: pony });
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
          {session.joined} booked · {session.needs > 0
            ? `needs ${session.needs} more to reach the minimum of ${slot.minGroup}`
            : `minimum of ${slot.minGroup} met`}
        </div>
      )}

      {canPickPlayer && (
        <>
          <label style={S.label} htmlFor="lesson-who">Who is it for</label>
          <select id="lesson-who" className="input-field select-field" value={playerId}
            onChange={(e) => { setPlayerId(e.target.value); setError(''); }}
            style={{ width: '100%', padding: '9px 8px', fontSize: '13px' }}>
            <option value="">— pick a player —</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </>
      )}

      <label style={{ ...S.row, marginTop: '12px', cursor: 'pointer', fontSize: '13px' }}>
        <input type="checkbox" checked={pony} onChange={(e) => setPony(e.target.checked)} />
        <span>Pony hire</span>
      </label>

      {/* Both prices, always — the brief asked to see it with and without. */}
      <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--cream-warm)', borderRadius: '6px', fontSize: '13px', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: pony ? 1 : 0.55 }}>
          <span>With pony hire</span><strong>£{withPony.money}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: pony ? 0.55 : 1 }}>
          <span>Own pony</span><strong>£{without.money}</strong>
        </div>
        {chosen.detail && <div style={{ ...S.hint, marginTop: '6px' }}>{chosen.detail}</div>}
      </div>

      <div style={{ ...S.hint, marginTop: '8px' }}>
        {player
          ? payingWithTokens
            ? `${player.name} has ${tokens} token${tokens === 1 ? '' : 's'} — this uses ${cost}, leaving ${tokens - cost}.`
            : `${player.name} has ${tokens} token${tokens === 1 ? '' : 's'}, so this goes on their invoice at £${chosen.money}.`
          : 'Pick a player to see how it will be paid.'}
      </div>

      <div style={{ ...S.row, marginTop: '12px' }}>
        <button type="button" className="btn-primary" disabled={busy || !player} onClick={go}
          style={{ padding: '11px 18px', fontSize: '12px', opacity: busy || !player ? 0.6 : 1 }}>
          {busy ? 'Booking…' : payingWithTokens ? `Book — ${cost} token${cost === 1 ? '' : 's'}` : `Book — £${chosen.money}`}
        </button>
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      {error && <div style={S.err}>{error}</div>}
    </div>
  );
}

// ── The captain's window editor ─────────────────────────────────────────────

function SlotEditor({ draft, setDraft, onSave, onDelete, onCancel }) {
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft(d => ({ ...d, [k]: v })); setError('');
  };
  const hours = windowHours(draft);

  const save = () => {
    if (!parseISO(draft.date)) { setError('Pick a date.'); return; }
    if (parseHM(draft.start) === null || parseHM(draft.end) === null) { setError('Times need to look like 14:00.'); return; }
    if (hours < 1) { setError('The window needs to be at least a whole hour, and end after it starts.'); return; }
    if (!draft.individual && !draft.group) { setError('Allow individual lessons, group lessons, or both.'); return; }
    onSave({ ...draft, id: draft.id || newSlotId(), minGroup: Number(draft.minGroup) || MIN_GROUP, maxGroup: Number(draft.maxGroup) || MAX_GROUP });
  };

  return (
    <div style={{ ...S.card, borderColor: 'var(--gold)' }}>
      <div style={S.h}>{draft.id ? 'Amend this slot' : 'New lesson slot'}</div>
      <div style={S.row}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-date">Date</label>
          <input id="ls-date" className="input-field" type="date" value={draft.date} onChange={set('date')} style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '0 1 90px' }}>
          <label style={S.label} htmlFor="ls-start">From</label>
          <input id="ls-start" className="input-field" type="time" step="3600" value={draft.start} onChange={set('start')} style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '0 1 90px' }}>
          <label style={S.label} htmlFor="ls-end">To</label>
          <input id="ls-end" className="input-field" type="time" step="3600" value={draft.end} onChange={set('end')} style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
      </div>
      {hours > 0 && (
        <div style={{ ...S.hint, marginTop: '6px' }}>
          {hours === 1
            ? 'A one-hour window: bookable as a single 1-hour lesson.'
            : `A ${hours}-hour window: bookable as ${Array.from({ length: hours }, (_, i) => i + 1).join(' or ')} hour${hours > 1 ? 's' : ''} at a time.`}
        </div>
      )}

      <div style={S.row}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-coach">Coach</label>
          <input id="ls-coach" className="input-field" type="text" value={draft.coach} onChange={set('coach')} placeholder="e.g. Rosie" style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={S.label} htmlFor="ls-ground">Where</label>
          <input id="ls-ground" className="input-field" type="text" value={draft.ground} onChange={set('ground')} placeholder="e.g. Arena" style={{ width: '100%', padding: '9px', fontSize: '13px' }} />
        </div>
      </div>

      <label style={S.label}>Bookable as</label>
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
          <label style={{ fontSize: '12px', color: 'var(--muted)' }} htmlFor="ls-min">Group minimum</label>
          <input id="ls-min" className="input-field" type="number" min="1" max="20" value={draft.minGroup} onChange={set('minGroup')} style={{ width: '70px', padding: '7px', fontSize: '13px' }} />
          <label style={{ fontSize: '12px', color: 'var(--muted)' }} htmlFor="ls-max">most</label>
          <input id="ls-max" className="input-field" type="number" min="1" max="20" value={draft.maxGroup} onChange={set('maxGroup')} style={{ width: '70px', padding: '7px', fontSize: '13px' }} />
        </div>
      )}

      <label style={{ ...S.row, gap: '6px', marginTop: '12px', fontSize: '13px', cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.ponyHireDefault} onChange={set('ponyHireDefault')} />
        <span>Pony hire ticked by default</span>
      </label>

      <label style={S.label} htmlFor="ls-note">Note <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
      <input id="ls-note" className="input-field" type="text" value={draft.note} onChange={set('note')} placeholder="Anything riders should know" style={{ width: '100%', padding: '9px', fontSize: '13px' }} />

      <div style={{ ...S.row, marginTop: '14px' }}>
        <button type="button" className="btn-primary" onClick={save} style={{ padding: '11px 18px', fontSize: '12px' }}>
          {draft.id ? 'Save changes' : 'Add slot'}
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

// ── One window, and what is left in it ──────────────────────────────────────

function SlotCard({ slot, filter, rates, captainMode, onPick, onEdit, onRemoveBooking }) {
  const sessions = availableSessions(slot, rates).filter(s => filter === 'all' || s.type === filter);
  const open = sessions.filter(s => !s.blocked);
  const booked = (slot.bookings || []).slice().sort((a, b) => parseHM(a.start) - parseHM(b.start));

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {slot.start}–{slot.end} <span style={{ opacity: 0.8 }}>({windowHours(slot)} hr window)</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, margin: '2px 0' }}>
            {[slot.individual && 'Individual', slot.group && 'Group'].filter(Boolean).join(' & ')} lesson
          </div>
          {slot.coach && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>with {slot.coach}</div>}
          {slot.ground && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>📍 {slot.ground}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span style={S.badge(open.length ? 'open' : 'gone')}>
            {open.length ? `${open.length} option${open.length === 1 ? '' : 's'}` : 'Fully booked'}
          </span>
          {captainMode && <button type="button" style={{ ...S.btn, padding: '4px 9px', fontSize: '11px' }} onClick={() => onEdit(slot)}>Edit</button>}
        </div>
      </div>

      {slot.note && <div style={{ ...S.hint, marginTop: '6px' }}>{slot.note}</div>}

      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sessions.map((s) => (
          <div key={`${s.type}-${s.start}-${s.hours}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 9px', borderRadius: '7px',
                     background: s.blocked ? 'transparent' : 'var(--cream)', border: '1px solid var(--line)',
                     opacity: s.blocked ? 0.55 : 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                {rangeLabel(s.start, s.hours)} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {TYPE_LABEL[s.type]}</span>
              </div>
              {s.type === 'group' && !s.blocked && (
                <div style={{ fontSize: '11px', color: s.needs > 0 ? 'var(--gold)' : 'var(--muted)' }}>
                  {s.joined} booked{s.needs > 0 ? ` · needs ${s.needs} more (min ${slot.minGroup})` : ' · minimum met'}
                </div>
              )}
              {s.blocked && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.blocked}</div>}
            </div>
            <button type="button" style={S.book(!!s.blocked)} disabled={!!s.blocked}
              onClick={() => onPick(slot, s)}>
              {s.blocked ? '—' : 'Book'}
            </button>
          </div>
        ))}
      </div>

      {captainMode && booked.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
          <div style={{ ...S.h, marginBottom: '5px' }}>Booked in</div>
          {booked.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
              <span style={{ flex: 1 }}>
                {b.name} · {rangeLabel(b.start, Number(b.hours) || 1)} · {TYPE_LABEL[b.type]}
                {b.ponyHire ? ' · pony hire' : ' · own pony'}
                <span style={{ color: 'var(--muted)' }}>{b.paid === 'token' ? ` · ${b.tokensSpent || 1} token` : b.paid === 'invoice' ? ' · invoiced' : ''}</span>
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
  quote, tokensOf, onBook, onCancelBooking,
}) {
  const today = isoOf(new Date());
  const [monday, setMonday] = useState(() => mondayOf(today));
  const [day, setDay] = useState(() => today);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);   // slot draft | null
  const [picking, setPicking] = useState(null);   // { slot, session } | null
  const [note, setNote] = useState('');

  const days = weekDays(monday);
  const onDay = useMemo(() => slotsOn(slots, day), [slots, day]);
  const countOn = (iso) => slotsOn(slots, iso).length;
  const mine = useMemo(
    () => (myPlayer ? bookingsFor(slots, { playerId: myPlayer.id, name: myPlayer.name }) : []),
    [slots, myPlayer]);

  // Keep the chosen day inside the week being looked at.
  const goWeek = (delta) => {
    const m = addDays(monday, delta * 7);
    setMonday(m);
    setDay(weekDays(m).includes(day) ? day : m);
    setEditing(null); setPicking(null); setNote('');
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

  const confirmBooking = async ({ slot, session, player, ponyHire }) => {
    const reason = blockedReason(slot, session.start, session.hours, session.type, rates);
    if (reason) { setPicking(null); setNote(reason); return { error: reason }; }
    const res = await onBook({ slot, session, player, ponyHire });
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
        {[['all', 'All lessons'], ['individual', 'Individual'], ['group', `Group (min ${MIN_GROUP})`]].map(([id, label]) => (
          <button key={id} type="button" style={S.chip(filter === id)} onClick={() => setFilter(id)} aria-pressed={filter === id}>{label}</button>
        ))}
      </div>

      {captainMode && (
        <div style={{ ...S.row, marginBottom: '12px' }}>
          <button type="button" style={S.btn} onClick={() => { setEditing({ ...blankSlot(day), id: '' }); setPicking(null); setNote(''); }}>＋ Add a slot</button>
          <button type="button" style={S.btn} onClick={doCopy}>⧉ Copy last week</button>
        </div>
      )}

      {note && <div style={{ ...S.hint, color: 'var(--burgundy)', marginBottom: '10px' }}>{note}</div>}

      {editing && (
        <SlotEditor draft={editing} setDraft={setEditing} onSave={saveSlot}
          onDelete={editing.id ? deleteSlot : null} onCancel={() => setEditing(null)} />
      )}

      {picking && (
        <BookSheet
          slot={picking.slot} session={picking.session}
          who={myPlayer} canPickPlayer={captainMode} players={players}
          quote={quote} tokensOf={tokensOf}
          onCancel={() => setPicking(null)} onConfirm={confirmBooking} />
      )}

      {/* The day */}
      {onDay.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '14px' }}>No lessons on {dateLabel(day)}.</div>
          {captainMode && <div style={{ ...S.hint, marginTop: '4px' }}>Add a slot, or copy last week across.</div>}
        </div>
      ) : onDay.map(slot => (
        <SlotCard key={slot.id} slot={slot} filter={filter} rates={rates} captainMode={captainMode}
          onPick={(sl, se) => {
            if (!captainMode && !canBookAsSelf) { setNote('Sign in to book a lesson.'); return; }
            setEditing(null); setNote(''); setPicking({ slot: sl, session: se });
          }}
          onEdit={(sl) => { setPicking(null); setNote(''); setEditing({ ...sl }); }}
          onRemoveBooking={(sl, b) => onCancelBooking(sl, b)} />
      ))}

      {/* Mine */}
      {mine.length > 0 && (
        <div style={{ ...S.card, marginTop: '14px' }}>
          <div style={S.h}>Your lessons</div>
          {mine.map(({ slot, booking }) => (
            <div key={booking.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0' }}>
              <span style={{ flex: 1 }}>
                {dateLabel(slot.date)} · {rangeLabel(booking.start, Number(booking.hours) || 1)} · {TYPE_LABEL[booking.type]}
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
