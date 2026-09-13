// The club notice: one short message from the captain, shown to everybody at
// the top of the app until it is taken down.
//
// Two levels, because two things get announced and they are not the same:
//
//   normal     — worth knowing. "Sticks and balls Friday, all welcome."
//                Quiet, in the club's own colours, and a member can dismiss it
//                once they have read it.
//   important  — must not be missed. "Ground closed, Wednesday off."
//                Loud, and stays put: there is no dismiss, because the point
//                of the level is that nobody turns up to a cancelled session.
//
// Kept in one shared document, `notice`, so it lands on every device the same
// way a roster does. A notice may carry an expiry, set when it is posted, so
// "Wednesday is off" does not still be on the screen in a fortnight — the
// captain's device works out the moment, so every viewer agrees on it.

export const NOTICE_MAX = 280;

export const NOTICE_LEVELS = [
  { id: 'normal', label: 'Normal', hint: 'Worth knowing. Members can dismiss it.' },
  { id: 'important', label: 'Important', hint: 'Must not be missed. Stays until you take it down.' },
];

const isLevel = (x) => NOTICE_LEVELS.some((l) => l.id === x);

// Read whatever is in the document, defensively: it may be missing, empty,
// half-written by an older version, or not JSON at all.
export function parseNotice(raw) {
  if (!raw) return null;
  let o = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try { o = JSON.parse(s); } catch (e) { return null; }
  }
  if (!o || typeof o !== 'object') return null;
  const text = String(o.text || '').trim().slice(0, NOTICE_MAX);
  if (!text) return null;
  return {
    text,
    level: isLevel(o.level) ? o.level : 'normal',
    setAt: Number(o.setAt) || 0,
    until: Number(o.until) || 0,   // 0 = until the captain takes it down
    by: String(o.by || '').trim(),
  };
}

export const noticeExpired = (n, now = Date.now()) => !!(n && n.until && now >= n.until);

// What a member should actually see.
export const liveNotice = (n, now = Date.now()) => (n && !noticeExpired(n, now) ? n : null);

// ── When it should come down ────────────────────────────────────────────────
// Worked out on the captain's device at the moment of posting, and stored as a
// plain timestamp, so a phone in another timezone takes it down at the same
// instant rather than at its own midnight.

export const endOfDay = (now = Date.now()) => {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

// Through the coming Sunday night — a polo week, not a calendar one.
export const endOfWeek = (now = Date.now()) => {
  const d = new Date(now);
  const toSunday = (7 - d.getDay()) % 7;   // 0 = Sunday
  d.setDate(d.getDate() + toSunday);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const NOTICE_SPANS = [
  { id: 'open', label: 'Until I take it down', until: () => 0 },
  { id: 'today', label: 'End of today', until: endOfDay },
  { id: 'week', label: 'End of the week', until: endOfWeek },
];

// Which span an existing notice was posted with, so editing it does not
// silently reset the expiry.
export function spanOf(n, now = Date.now()) {
  if (!n || !n.until) return 'open';
  if (n.until <= endOfDay(now)) return 'today';
  if (n.until <= endOfWeek(now)) return 'week';
  return 'open';
}

export function untilLabel(n, now = Date.now()) {
  if (!n || !n.until) return '';
  const left = n.until - now;
  if (left <= 0) return 'expired';
  if (n.until <= endOfDay(now)) return 'until the end of today';
  const days = Math.ceil(left / 86400000);
  return days <= 1 ? 'until tomorrow' : `for another ${days} days`;
}

// ── Dismissing ──────────────────────────────────────────────────────────────
// Per device, and per notice: the stamp changes whenever the captain posts or
// edits, so a dismissed notice does not hide the next one.

const DISMISS_KEY = 'notice-dismissed';
export const noticeStamp = (n) => (n ? `${n.setAt}:${n.text.length}` : '');

export function noticeDismissed(n) {
  if (!n || n.level === 'important') return false;
  try { return window.localStorage.getItem(DISMISS_KEY) === noticeStamp(n); }
  catch (e) { return false; }
}

export function dismissNotice(n) {
  if (!n) return;
  try { window.localStorage.setItem(DISMISS_KEY, noticeStamp(n)); } catch (e) {}
}
