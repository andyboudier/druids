// Ask the server to email a booking confirmation, update or cancellation —
// see api/_bookingEmail.js. The request names the booking and nothing else;
// the server reads who it is for and what it says from the club's own data,
// and checks the signed-in caller may send it.
//
// Fire and forget: a booking never waits on its email or fails because of it.
// With sign-in off (the clubs, today) there is no token and nothing is sent.
//
//   { event: 'booked' | 'amended' | 'cancelled',
//     kind: 'chukka' | 'waitlist' | 'lesson',
//     day, entryId | slotId, bookingId, and for 'cancelled' playerId (+ type) }
export function bookingEmail(payload) {
  (async () => {
    const a = typeof window !== 'undefined' ? window.auth : null;
    if (!a || !a.enabled || !a.user || typeof a.idToken !== 'function') return;
    const token = await a.idToken();
    if (!token) return;
    await fetch('/api/booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  })().catch(() => { /* an email that fails to send leaves the booking as it is */ });
}

// The email's "Amend or cancel" link: ?manage=chukka:wed:123,
// ?manage=waitlist:sat:456 or ?manage=lesson:<slot>:<booking>. Read once on
// load and taken out of the address bar.
export function manageRequest() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('manage');
  if (!raw) return null;
  const [kind, a, b] = raw.split(':');
  if (!['chukka', 'waitlist', 'lesson'].includes(kind) || !a || !b) return null;
  return kind === 'lesson' ? { kind, slotId: a, bookingId: b } : { kind, day: a, entryId: b };
}
export function clearManageRequest() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('manage')) return;
  url.searchParams.delete('manage');
  window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
}
