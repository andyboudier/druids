// Coaching lessons: the slots an admin puts on, and who books them.
//
// A slot is ONE lesson at one time — "Friday 10:00–11:00" — booked whole. The
// admin says what it may be booked as: an individual lesson, a group lesson
// (with its own minimum and maximum), or either. The first booking decides:
//
//   individual  one rider has the coach to themselves; the slot is then
//               taken and the group option goes.
//   group       riders join until the maximum; while anyone is in it the
//               individual option is gone. Below the minimum it still takes
//               bookings and shows "needs N more", and the admin decides —
//               cancel it, make it an individual lesson (with one rider), or
//               run it as a smaller group (the minimum comes down to the
//               riders it has).
//
// It used to be a window sliced into hour-long pieces (13:00–15:00 offering
// 13:00 1hr, 13:00 2hr, 14:00 1hr, each as individual or group). That read
// as a puzzle to members, so the slot is now the lesson, and a longer lesson
// is simply a longer slot.
//
// Everything here is pure: no storage, no React, no money. Pricing stays in
// the app, because each club has its own rate card — Druids sells a
// semi-private lesson where TPPC sells a group one, and neither uses the
// other's ids. The app passes its card in as `rates`
// ({ individual: { 1: '<id>', 2: '<id>' }, group: {…} }), and a type is only
// offered for a slot whose length that card prices.

export const MIN_GROUP = 4;      // the brief's "minimum 4 people"
export const MAX_GROUP = 6;      // default cap; a slot may override it
export const MAX_HOURS = 4;      // longest single booking we will offer

// The most riders a ground takes: the arena is smaller, so six there and
// eight anywhere else — the same numbers the chukka days cap at.
export const ARENA_MAX = 6;
export const FIELD_MAX = 8;
export const groundCap = (ground) => (String(ground || '').trim().toLowerCase().includes('arena') ? ARENA_MAX : FIELD_MAX);

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
  end: '11:00',
  coach: '',
  ground: '',
  // Empty means a coaching lesson, booked whole. A kind makes this a
  // club session instead — see "Club sessions" below.
  kind: '',
  individual: true,
  group: true,
  minGroup: MIN_GROUP,
  maxGroup: MAX_GROUP,
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
    kind: String(raw.kind || '').trim(),
    // A club session is one block at one price with its own places, so it is
    // never also offered as an individual or group lesson — otherwise the
    // same evening could be sold twice.
    individual: !String(raw.kind || '').trim() && raw.individual !== false,
    group: !String(raw.kind || '').trim() && raw.group !== false,
    minGroup: Math.max(1, Number(raw.minGroup) || MIN_GROUP),
    maxGroup: Math.max(1, Number(raw.maxGroup) || MAX_GROUP),
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

// ── What a slot can be booked as ────────────────────────────────────────────

// Kept for callers that list the lengths a card prices.
export const hoursOffered = (rates, type) =>
  Object.keys((rates && rates[type]) || {}).map(Number).filter(n => n > 0).sort((a, b) => a - b);

const lessonBookings = (slot) => (slot.bookings || []).filter(b => b.type === 'individual' || b.type === 'group');

// What the slot has become, from its bookings: '' (nobody yet), 'individual'
// or 'group'. The first booking decides; the other type then goes.
export const takenAs = (slot) => {
  const bs = lessonBookings(slot);
  if (bs.some(b => b.type === 'individual')) return 'individual';
  if (bs.some(b => b.type === 'group')) return 'group';
  return '';
};

export const groupBookings = (slot) => (slot.bookings || []).filter(b => b.type === 'group');

// The whole slot is the lesson: its start, its length.
export const slotSession = (slot, type) => ({ start: slot.start, hours: windowHours(slot) || 1, type, label: `${slot.start}–${slot.end}` });

// Why a type cannot be booked in this slot, or null if it can. `start` and
// `hours` are accepted for older callers but a booking is always the whole
// slot, so anything else is refused.
export function blockedReason(slot, start, hours, type, rates) {
  if (isClubSession(slot)) return 'That is a club session, not a lesson.';
  if (type !== 'individual' && type !== 'group') return 'Unknown lesson type.';
  const len = windowHours(slot) || 1;
  if (start != null && (start !== slot.start || Number(hours || len) !== len)) return 'Lessons are booked for the whole slot.';
  if (type === 'individual' && !slot.individual) return 'Individual lessons are not offered in this slot.';
  if (type === 'group' && !slot.group) return 'Group lessons are not offered in this slot.';
  if (rates && !hoursOffered(rates, type).includes(len)) return `The club has no ${len}-hour ${type} rate.`;
  const as = takenAs(slot);
  if (as === 'individual') {
    const b = lessonBookings(slot).find(x => x.type === 'individual');
    return `Taken — ${(b && b.name) || 'someone'} has it as an individual lesson.`;
  }
  if (as === 'group' && type === 'individual') return 'A group is already booked in this slot.';
  if (type === 'group' && groupBookings(slot).length >= Math.max(1, Number(slot.maxGroup) || MAX_GROUP)) return 'That group is full.';
  return null;
}

export const canBook = (slot, type, rates) => blockedReason(slot, null, null, type, rates) === null;

// The types worth showing for a slot right now, each with its state. Once a
// type is taken the other is not returned at all — it has gone, not greyed.
export function slotOptions(slot, rates) {
  if (isClubSession(slot)) return [];
  const as = takenAs(slot);
  const out = [];
  for (const type of ['individual', 'group']) {
    if (!slot[type]) continue;
    if (as && as !== type) continue;
    const reason = blockedReason(slot, null, null, type, rates);
    const joined = type === 'group' ? groupBookings(slot).length : (as === 'individual' ? 1 : 0);
    const min = Math.max(1, Number(slot.minGroup) || MIN_GROUP);
    const max = Math.max(1, Number(slot.maxGroup) || MAX_GROUP);
    out.push({
      ...slotSession(slot, type), blocked: reason, joined, min, max,
      needs: type === 'group' ? Math.max(0, min - joined) : 0,
      spots: type === 'group' ? Math.max(0, max - joined) : (reason ? 0 : 1),
    });
  }
  return out;
}

// A group that has people in it but not yet its minimum — the admin's call.
export const groupShort = (slot) => {
  const n = groupBookings(slot).length;
  return takenAs(slot) === 'group' && n > 0 && n < Math.max(1, Number(slot.minGroup) || MIN_GROUP);
};

// The admin's answers to a short group, as new slots (money stays in the app).
//   runSmaller  the minimum comes down to the riders it has, so it goes ahead.
export const runAsSmallerGroup = (slot) => ({ ...slot, minGroup: Math.max(1, groupBookings(slot).length) });
//   toIndividual  its one rider becomes an individual lesson; the slot offers
//   individual from now on, since that is what it now is.
export function groupToIndividual(slot) {
  const g = groupBookings(slot);
  if (g.length !== 1) return { ok: false, error: 'Only a group of one can become an individual lesson.', slot };
  const booking = { ...g[0], type: 'individual' };
  return { ok: true, booking, slot: { ...slot, individual: true, bookings: (slot.bookings || []).map(b => (b.id === booking.id ? booking : b)) } };
}

// ── Club sessions ───────────────────────────────────────────────────────────
//
// A coaching lesson is offered as individual or group and becomes whichever
// is booked first. A club session is neither: it is one block of time at one
// price with a set number of places, and you are either in it or you are not.
// Tedworth's Ladies Only and Instructional Chukkas evenings are that shape —
// an hour, two chukkas, up to eight riders — priced from the chukka tariff
// rather than the lesson rate card.
//
// So a slot carries a `kind`, and a kind makes it a session. What the kinds
// ARE — their names, their length, their places and above all their price —
// stays in the app, exactly as the rate card does and for the same reason:
// they are one club's, and a shared list would put another club's name or
// another club's price on somebody's bill. This module only knows that a
// session is booked whole.
//
// Nothing here is tied to a weekday. The captain puts a session on whatever
// date suits and can run more than one, which is the whole point of moving
// them off the fixed day tabs.

export const isClubSession = (slot) => !!String((slot && slot.kind) || '').trim();

export const clubSessionBookings = (slot) => (slot.bookings || []).filter(b => b.type === 'session');

export const clubSessionPlaces = (slot) => Math.max(1, Number(slot && slot.maxGroup) || MAX_GROUP);

export const clubSessionSpots = (slot) => Math.max(0, clubSessionPlaces(slot) - clubSessionBookings(slot).length);

// Runs of spaces are collapsed, not just trimmed: a captain typing somebody in
// by hand twice writes the name a little differently the second time, and
// "Jo  Bloggs" is not a second rider.
const sameRider = (a, b) => {
  if (a.playerId && b.playerId) return String(a.playerId) === String(b.playerId);
  const n = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return !!n(a.name) && n(a.name) === n(b.name);
};

// Why a rider cannot take a place, or null if they can. A captain booking
// somebody in by hand goes through this too — it is the places that are
// finite, not the way the booking was made.
export function clubSessionBlockedReason(slot, rider) {
  if (!isClubSession(slot)) return 'That is not a club session.';
  // Already booked is checked BEFORE full, or a captain adding somebody who is
  // in fact already in a full session is told to go and find a place for them.
  if (clubSessionBookings(slot).some(b => sameRider(b, rider || {}))) {
    const who = String((rider && rider.name) || '').trim().replace(/\s+/g, ' ');
    return who ? `${who} already has a place.` : 'They already have a place.';
  }
  if (clubSessionSpots(slot) <= 0) return 'That session is full.';
  return null;
}

export function addClubSessionBooking(slot, rider) {
  const reason = clubSessionBlockedReason(slot, rider);
  if (reason) return { ok: false, error: reason, slot };
  // start and hours come from the slot, not the caller: a place is the whole
  // session, and letting them be passed in is how half-sessions would appear.
  const entry = {
    id: newBookingId(), at: Date.now(), ponyHire: false, ...rider,
    type: 'session', kind: slot.kind, start: slot.start, hours: windowHours(slot) || 1,
  };
  return { ok: true, slot: { ...slot, bookings: [...(slot.bookings || []), entry] }, booking: entry };
}

// ── Bookings ────────────────────────────────────────────────────────────────

export function addBooking(slot, booking, rates) {
  const hours = windowHours(slot) || 1;
  const reason = blockedReason(slot, null, null, booking.type, rates);
  if (reason) return { ok: false, error: reason, slot };
  if ((slot.bookings || []).some(b => b.playerId && b.playerId === booking.playerId)) {
    return { ok: false, error: `${booking.name || 'They'} already ${booking.name ? 'has' : 'have'} this lesson.`, slot };
  }
  // start and hours come from the slot: a booking is always the whole lesson.
  const entry = { id: newBookingId(), at: Date.now(), ponyHire: false, ...booking, start: slot.start, hours };
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
