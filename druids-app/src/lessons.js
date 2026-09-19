// Coaching lessons: the windows a captain opens, and the bookings inside them.
//
// A captain does not book out individual hours — they say "the coach is free
// Friday 13:00 to 15:00" and let people take what they need from it. So a slot
// here is a WINDOW, and a booking takes a sub-range of it:
//
//   Friday 13:00–15:00  ->  13:00 (1 hr)   14:00 (1 hr)   13:00 (2 hrs)
//
// which is exactly how the brief described it ("can either be booked as a
// 1 hour or a 2 hour lesson"). Once someone takes 13:00–14:00 on their own,
// the 2-hour option is gone but 14:00–15:00 is still there.
//
// Two kinds of lesson share a window:
//
//   individual  one rider has the coach to themselves for that range.
//   group       several riders share one range. Groups need a minimum (4 by
//               the brief); below it the session still takes bookings and is
//               shown as not yet viable, because the captain — not the app —
//               decides whether to run a short group.
//
// Everything here is pure: no storage, no React, no money. Pricing stays in
// the app, because each club has its own rate card — Druids sells a
// semi-private lesson where TPPC sells a group one, and neither uses the
// other's ids. The app passes its card in as `rates`
// ({ individual: { 1: '<id>', 2: '<id>' }, group: {…} }) and this module only
// offers lengths that card actually prices: a club with no two-hour rate does
// not offer two-hour lessons, rather than quoting a price nobody agreed.

export const MIN_GROUP = 4;      // the brief's "minimum 4 people"
export const MAX_GROUP = 6;      // default cap; a slot may override it
export const MAX_HOURS = 4;      // longest single booking we will offer

// ── Times ───────────────────────────────────────────────────────────────────

export const parseHM = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

export const fmtHM = (mins) => {
  const m = ((Math.round(Number(mins) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// "13:00–15:00" for display; an en dash, as the rest of the app uses.
export const rangeLabel = (start, hours) => `${start}–${fmtHM(parseHM(start) + hours * 60)}`;

// ── Dates ───────────────────────────────────────────────────────────────────
// Plain YYYY-MM-DD strings, compared lexically. Built in local time so a
// late-evening edit cannot land on yesterday.

export const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return isoOf(d) === s ? d : null;   // rejects 2026-02-31 and friends
};

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

// The Monday on or before a date — the anchor for "copy last week".
export const mondayOf = (iso) => {
  const d = parseISO(iso);
  if (!d) return iso;
  const back = (d.getDay() + 6) % 7;   // Sun=0 -> 6, Mon=1 -> 0
  d.setDate(d.getDate() - back);
  return isoOf(d);
};

export const dayLabel = (iso) => {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
};

export const dateLabel = (iso) => {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : iso;
};

// ── Slots ───────────────────────────────────────────────────────────────────

export const blankSlot = (date) => ({
  id: '',
  date: date || '',
  start: '10:00',
  end: '12:00',
  coach: '',
  ground: '',
  individual: true,
  group: true,
  minGroup: MIN_GROUP,
  maxGroup: MAX_GROUP,
  ponyHireDefault: true,   // the brief: pony hire ticked by default
  note: '',
  bookings: [],
});

export const newSlotId = () => `ls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export const newBookingId = () => `lb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Whole hours in the window, or 0 if the times are nonsense or inverted.
export const windowHours = (slot) => {
  const a = parseHM(slot && slot.start), b = parseHM(slot && slot.end);
  if (a === null || b === null || b <= a) return 0;
  return Math.floor((b - a) / 60);
};

// Drop anything malformed rather than letting it reach the UI, and fill in
// defaults for slots written by an older version.
export const normaliseSlot = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const date = parseISO(raw.date) ? String(raw.date) : null;
  if (!date) return null;
  const slot = {
    ...blankSlot(date),
    ...raw,
    id: String(raw.id || '') || newSlotId(),
    date,
    start: fmtHM(parseHM(raw.start) ?? 600),
    end: fmtHM(parseHM(raw.end) ?? 720),
    individual: raw.individual !== false,
    group: raw.group !== false,
    minGroup: Math.max(1, Number(raw.minGroup) || MIN_GROUP),
    maxGroup: Math.max(1, Number(raw.maxGroup) || MAX_GROUP),
    ponyHireDefault: raw.ponyHireDefault !== false,
    bookings: Array.isArray(raw.bookings) ? raw.bookings.filter(b => b && b.id && parseHM(b.start) !== null) : [],
  };
  return windowHours(slot) > 0 ? slot : null;
};

export const normaliseSlots = (raw) => {
  let arr = raw;
  if (typeof raw === 'string') { try { arr = JSON.parse(raw); } catch (e) { return []; } }
  if (!Array.isArray(arr)) return [];
  return arr.map(normaliseSlot).filter(Boolean).sort(bySlotTime);
};

export const bySlotTime = (a, b) =>
  a.date === b.date ? (parseHM(a.start) - parseHM(b.start)) : (a.date < b.date ? -1 : 1);

// ── What can be booked in a window ──────────────────────────────────────────

// Every whole-hour sub-range of the window, shortest first at each start.
// A 2-hour window yields 13:00 1hr, 13:00 2hr, 14:00 1hr.
export function sessionOptions(slot, lengths) {
  const total = windowHours(slot);
  if (!total) return [];
  const startMin = parseHM(slot.start);
  const allowed = lengths && lengths.length ? lengths : null;
  const out = [];
  for (let offset = 0; offset < total; offset++) {
    for (let hours = 1; hours <= Math.min(total - offset, MAX_HOURS); hours++) {
      if (allowed && !allowed.includes(hours)) continue;
      const start = fmtHM(startMin + offset * 60);
      out.push({ start, hours, label: rangeLabel(start, hours) });
    }
  }
  return out;
}

// What each kind of lesson may be booked as, given the club's own rate card:
// a club with no two-hour rate simply does not offer two-hour lessons, rather
// than being quoted a price nobody agreed. `rates` is { individual: {1:id,…} }.
export const hoursOffered = (rates, type) =>
  Object.keys((rates && rates[type]) || {}).map(Number).filter(n => n > 0).sort((a, b) => a - b);

const spanOf = (start, hours) => {
  const a = parseHM(start);
  return a === null ? null : [a, a + hours * 60];
};

const clash = (aStart, aHours, bStart, bHours) => {
  const a = spanOf(aStart, aHours), b = spanOf(bStart, bHours);
  if (!a || !b) return false;
  return a[0] < b[1] && b[0] < a[1];
};

export const sameSession = (b, start, hours, type) =>
  b.start === start && Number(b.hours) === hours && b.type === type;

// Who is already in this exact group session.
export const groupBookings = (slot, start, hours) =>
  (slot.bookings || []).filter(b => sameSession(b, start, hours, 'group'));

// Why an option cannot be taken, or null if it can.
//
// An individual booking owns its range outright. A group session shares its
// range only with itself: two different groups cannot run at once, because
// there is one coach and one string of ponies.
export function blockedReason(slot, start, hours, type, rates) {
  if (type === 'individual' && !slot.individual) return 'Individual lessons are not offered in this slot.';
  if (type === 'group' && !slot.group) return 'Group lessons are not offered in this slot.';
  if (rates && !hoursOffered(rates, type).includes(hours)) return `The club has no ${hours}-hour ${type} rate.`;
  const opts = sessionOptions(slot);
  if (!opts.some(o => o.start === start && o.hours === hours)) return 'That is outside the slot.';

  for (const b of (slot.bookings || [])) {
    const bh = Number(b.hours) || 1;
    if (!clash(start, hours, b.start, bh)) continue;
    if (b.type === 'individual') return `Taken — ${b.name || 'someone'} has ${rangeLabel(b.start, bh)}.`;
    if (type === 'individual') return `Taken — a group has ${rangeLabel(b.start, bh)}.`;
    if (!sameSession(b, start, hours, 'group')) return `A group already has ${rangeLabel(b.start, bh)}.`;
  }
  if (type === 'group' && groupBookings(slot, start, hours).length >= slot.maxGroup) return 'That group is full.';
  return null;
}

export const canBook = (slot, start, hours, type, rates) => blockedReason(slot, start, hours, type, rates) === null;

// The options actually worth showing, each with its state.
export function availableSessions(slot, rates) {
  const out = [];
  for (const type of ['individual', 'group']) {
    if (type === 'individual' && !slot.individual) continue;
    if (type === 'group' && !slot.group) continue;
    for (const o of sessionOptions(slot, rates ? hoursOffered(rates, type) : null)) {
      const reason = blockedReason(slot, o.start, o.hours, type, rates);
      const joined = type === 'group' ? groupBookings(slot, o.start, o.hours).length : 0;
      out.push({
        ...o, type, blocked: reason, joined,
        needs: type === 'group' ? Math.max(0, slot.minGroup - joined) : 0,
        spots: type === 'group' ? Math.max(0, slot.maxGroup - joined) : (reason ? 0 : 1),
      });
    }
  }
  return out;
}

// A group that has not reached its minimum yet — shown, but flagged.
export const groupShort = (slot, start, hours) => {
  const n = groupBookings(slot, start, hours).length;
  return n > 0 && n < slot.minGroup;
};

// ── Bookings ────────────────────────────────────────────────────────────────

export function addBooking(slot, booking, rates) {
  const reason = blockedReason(slot, booking.start, Number(booking.hours) || 1, booking.type, rates);
  if (reason) return { ok: false, error: reason, slot };
  if ((slot.bookings || []).some(b => b.playerId && b.playerId === booking.playerId
      && clash(booking.start, Number(booking.hours) || 1, b.start, Number(b.hours) || 1))) {
    return { ok: false, error: `${booking.name || 'They'} already have a lesson at that time.`, slot };
  }
  const entry = { id: newBookingId(), at: Date.now(), ponyHire: true, ...booking, hours: Number(booking.hours) || 1 };
  return { ok: true, slot: { ...slot, bookings: [...(slot.bookings || []), entry] }, booking: entry };
}

export const removeBooking = (slot, bookingId) =>
  ({ ...slot, bookings: (slot.bookings || []).filter(b => b.id !== bookingId) });

export const findBooking = (slots, bookingId) => {
  for (const s of slots) {
    const b = (s.bookings || []).find(x => x.id === bookingId);
    if (b) return { slot: s, booking: b };
  }
  return null;
};

// A token buys an hour of coaching, whatever kind. Deliberately blunt: tokens
// are a stand-in until Stripe, and a rate card inside a currency would have to
// be unpicked again later.
export const tokenCost = (hours) => Math.max(1, Number(hours) || 1);

// ── The week ────────────────────────────────────────────────────────────────

export const slotsInWeek = (slots, monday) =>
  slots.filter(s => s.date >= monday && s.date < addDays(monday, 7)).sort(bySlotTime);

export const slotsOn = (slots, iso) =>
  slots.filter(s => s.date === iso).sort(bySlotTime);

export const weekDays = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

// Copy a week's windows forward, WITHOUT their bookings: the times repeat, the
// people do not. Slots already on the target week are left alone and reported,
// so copying twice does not double the day up.
export function copyWeek(slots, fromMonday, toMonday) {
  const shift = Math.round((parseISO(toMonday) - parseISO(fromMonday)) / 86400000);
  const source = slotsInWeek(slots, fromMonday);
  const existing = slotsInWeek(slots, toMonday);
  const taken = new Set(existing.map(s => `${s.date} ${s.start} ${s.end}`));
  const made = [];
  const skipped = [];
  for (const s of source) {
    const date = addDays(s.date, shift);
    const key = `${date} ${s.start} ${s.end}`;
    if (taken.has(key)) { skipped.push(s); continue; }
    taken.add(key);
    made.push({ ...s, id: newSlotId(), date, bookings: [] });
  }
  return { slots: [...slots, ...made].sort(bySlotTime), made, skipped };
}

// Everything a player has booked, newest window first — for "my lessons".
export function bookingsFor(slots, { playerId, name }) {
  const out = [];
  const n = (s) => String(s || '').trim().toLowerCase();
  for (const s of slots) {
    for (const b of (s.bookings || [])) {
      const mine = (playerId && b.playerId === playerId) || (!b.playerId && name && n(b.name) === n(name));
      if (mine) out.push({ slot: s, booking: b });
    }
  }
  return out.sort((x, y) => bySlotTime(x.slot, y.slot));
}
