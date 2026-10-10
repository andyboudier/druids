// Booking emails — "you're booked", "booking updated", "booking cancelled" —
// for chukkas, waiting lists, lessons and club sessions. The app calls
// /api/booking-email (booking-email.js) straight after it has saved a change;
// the leading underscore keeps this file from being an endpoint itself.
//
// The request names a booking and nothing else. Who is emailed, and what the
// email says, come from the club's own data read here — so the endpoint can
// only ever tell a member about their own booking, in the club's words:
//   { event: 'booked' | 'amended' | 'cancelled',
//     kind: 'chukka' | 'waitlist' | 'lesson',
//     day, entryId          (chukka / waitlist)
//     slotId, bookingId     (lesson or club session)
//     playerId, type }      (cancelled only: the booking has gone, so whose it
//                            was, and for a lesson what sort it was)
//
// The caller proves who they are with their Firebase ID token, checked with
// Google. They may send for their own booking, a teammate's (the same rule as
// booking one), or anyone's if they are an admin.
//
// SAFE BY DEFAULT, as the reminders are (see _reminders.js): an email goes
// only to an address on REMINDERS_ALLOW, or to anyone once REMINDERS_LIVE=1.

import {
  DAYS, storageKey, longDate, londonParts, makeReader, projectOf, recordFor, json, crestImg, signOff, settings, CLUB,
  esc, firstName, normEmail, normName, SESSION_NAMES,
} from './_reminders.js';

const FRESH_MS = 15 * 60 * 1000; // a "booked" or "amended" email is for a change just made

// ── Who is asking ───────────────────────────────────────────────────────────
export async function verifyCaller(idToken, env, fetchImpl = fetch) {
  if (!idToken) return null;
  const { apiKey } = projectOf(env);
  if (!apiKey) return null;
  const r = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const u = d && d.users && d.users[0];
  return u ? { uid: u.localId, email: normEmail(u.email) } : null;
}

// The admins: the deployment's fixed list plus config/admins, which the app's
// Admins panel edits. A read the rules refuse leaves just the fixed list.
async function adminEmails(env, fetchImpl) {
  const fixed = String(env.VITE_FIXED_ADMIN_EMAILS || '').split(',').map(normEmail).filter(Boolean);
  const { projectId, apiKey } = projectOf(env);
  try {
    const r = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/admins${apiKey ? `?key=${apiKey}` : ''}`);
    if (!r.ok) return fixed;
    const d = await r.json();
    const vals = (d && d.fields && d.fields.emails && d.fields.emails.arrayValue && d.fields.emails.arrayValue.values) || [];
    return [...fixed, ...vals.map((v) => normEmail(v.stringValue))];
  } catch (e) {
    return fixed;
  }
}

const teamKey = (t) => normName(t);

// ── What the booking is ─────────────────────────────────────────────────────
// The next date a weekday falls on, in London — for a chukka whose roster has
// not been stamped with its date.
const nextDateFor = (dow, now = new Date()) => {
  for (let i = 0; i < 8; i += 1) {
    const p = londonParts(new Date(now.getTime() + i * 86400000));
    if (p.dow === dow) return p.iso;
  }
  return londonParts(now).iso;
};

async function findChukka(read, req) {
  const cfg = DAYS[req.day];
  if (!cfg) return { error: 'Unknown day.' };
  const listKey = storageKey(req.kind === 'waitlist' ? 'waitlist' : 'roster', req.day);
  const list = json(await read(listKey), []);
  const entry = list.find((e) => String(e.id) === String(req.entryId)) || null;
  const stamped = await read(storageKey('roster-week', req.day));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(stamped || '') ? stamped : nextDateFor(cfg.dow);
  const time = (await read(storageKey('throwin', req.day))) || cfg.start;
  const ground = (await read(storageKey('ground', req.day))) || '';
  const place = req.kind === 'waitlist' && entry ? list.indexOf(entry) + 1 : 0;
  return { entry, title: cfg.name, date, time, ground, place };
}

async function findLesson(read, req) {
  const slots = json(await read('lesson-slots'), []);
  const slot = slots.find((s) => s && String(s.id) === String(req.slotId)) || null;
  if (!slot) return { error: 'That lesson is no longer in the diary.' };
  const entry = (slot.bookings || []).find((b) => String(b.id) === String(req.bookingId)) || null;
  const session = !!slot.kind;
  const type = entry ? entry.type : req.type;
  return {
    entry, slot, session,
    title: session ? (SESSION_NAMES[slot.kind] || 'Club session') : `${type === 'group' ? 'Group' : 'Individual'} lesson`,
    date: slot.date, time: (entry && entry.start) || slot.start, end: slot.end || '',
    ground: slot.ground || '', coach: slot.coach || '',
  };
}

// ── The email ───────────────────────────────────────────────────────────────
const HEADS = {
  booked: { chukka: 'You’re booked', waitlist: 'You’re on the waiting list', lesson: 'You’re booked' },
  amended: { chukka: 'Booking updated', waitlist: 'Waiting-list entry updated', lesson: 'Booking updated' },
  cancelled: { chukka: 'Booking cancelled', waitlist: 'Off the waiting list', lesson: 'Booking cancelled' },
};

export const manageLink = (appUrl, req) => (req.kind === 'lesson'
  ? `${appUrl}/?manage=${encodeURIComponent(`lesson:${req.slotId}:${req.bookingId}`)}`
  : `${appUrl}/?manage=${encodeURIComponent(`${req.kind}:${req.day}:${req.entryId}`)}`);

export function detailLines(req, found) {
  const e = found.entry || {};
  const lines = [];
  if (req.kind === 'lesson') {
    const hrs = Number(e.hours) || 1;
    if (!found.session) lines.push(`${hrs} hour${hrs === 1 ? '' : 's'}${found.coach ? ` with ${found.coach}` : ''}`);
    else if (found.coach) lines.push(`With ${found.coach}`);
    if (found.entry) lines.push(e.ponyHire ? 'Club pony' : 'Your own pony');
  } else if (found.entry) {
    lines.push(`${e.chukkas} chukka${Number(e.chukkas) === 1 ? '' : 's'} · ${e.ponyHire ? 'club pony' : 'your own pony'}`);
    const from = e.availableFrom && e.availableFrom !== found.time ? e.availableFrom : '';
    if (from || e.availableTo) lines.push(`Available ${from || found.time}–${e.availableTo || 'the end'}`);
    if (e.noConsecutive) lines.push('No consecutive chukkas');
    if (req.kind === 'waitlist' && found.place) lines.push(`Number ${found.place} on the waiting list — the club will be in touch if a place comes up`);
  }
  if (e.bookedBy) lines.push(`Booked by ${e.bookedBy}`);
  return lines;
}

export function renderBookingEmail({ req, found, person, appUrl }) {
  const head = HEADS[req.event][req.kind];
  const when = `${longDate(found.date)} · ${found.time}${found.end && req.kind === 'lesson' ? `–${found.end}` : ''}`;
  const subject = `${head}: ${found.title}, ${longDate(found.date)} ${found.time}`;
  const lines = detailLines(req, found);
  const cancelled = req.event === 'cancelled';
  const lead = cancelled
    ? 'This booking has been taken off the list. If that’s a surprise, reply to this email or speak to the club.'
    : req.event === 'amended' ? 'Here’s your booking as it stands now.' : 'Here are your details.';
  const cta = cancelled
    ? { href: appUrl, label: 'Book again' }
    : { href: manageLink(appUrl, req), label: 'Amend or cancel' };
  const K = CLUB.colors;
  const html = `<!doctype html><html><body style="margin:0;background:${K.bg};font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${K.bg};padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td align="center" style="padding-bottom:18px">
        ${crestImg(appUrl)}
      </td></tr>
      <tr><td style="background:${K.card};border:1px solid ${K.line};border-radius:18px;overflow:hidden">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:20px 18px 14px">
            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${cancelled ? '#e8a0a0' : K.muted}">${esc(head)}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${K.cream};margin-top:6px">Hello ${esc(firstName(person.name))}</div>
            <div style="font-size:14px;color:${K.muted};margin-top:6px;line-height:1.5">${esc(lead)}</div>
          </td></tr>
          <tr><td style="padding:16px 18px;border-top:1px solid ${K.line}">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${cancelled ? (K.dim || K.muted) : K.gold2};line-height:1.2${cancelled ? ';text-decoration:line-through' : ''}">${esc(found.title)}</div>
            <div style="font-size:15px;color:${K.cream};margin-top:6px">${esc(when)}${found.ground ? ` · ${esc(found.ground)}` : ''}</div>
            ${lines.map((l) => `<div style="font-size:13px;color:${K.muted};margin-top:4px">${esc(l)}</div>`).join('')}
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 0 8px">
        <a href="${esc(cta.href)}" style="display:inline-block;background:${K.burg};border:1px solid ${K.gold};color:${K.cream};text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:17px;padding:13px 26px;border-radius:14px">${esc(cta.label)}</a>
      </td></tr>
      <tr><td align="center" style="font-size:12px;color:${K.dim || K.muted};line-height:1.6;padding:6px 10px">
        ${cancelled ? '' : 'Can&rsquo;t make it after all? Cancel in the app as early as you can: it frees your place, and the booking terms explain when a charge applies.<br>'}This booking is made under the club&rsquo;s <a href="${esc(appUrl)}/?terms=1" style="color:${K.gold2}">booking terms</a>.<br>${signOff()}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  const text = [
    head, `Hello ${firstName(person.name)},`, lead, '',
    `${found.title}`, `${when}${found.ground ? ` · ${found.ground}` : ''}`, ...lines, '',
    `${cta.label}: ${cta.href}`, '',
    `Booking terms: ${appUrl}/?terms=1`,
  ].join('\n');
  return { subject, html, text };
}

// ── The run ─────────────────────────────────────────────────────────────────
const EVENTS = ['booked', 'amended', 'cancelled'];
const KINDS = ['chukka', 'waitlist', 'lesson'];
const ID = /^[A-Za-z0-9_.-]{1,80}$/;

export const validRequest = (b) => !!b && EVENTS.includes(b.event) && KINDS.includes(b.kind) && (
  b.kind === 'lesson'
    ? ID.test(String(b.slotId || '')) && ID.test(String(b.bookingId || ''))
    : !!DAYS[b.day] && ID.test(String(b.entryId || ''))
) && (b.event !== 'cancelled' || ID.test(String(b.playerId || '')));

export async function sendBookingEmail({ req, idToken, env, fetchImpl = fetch, now = Date.now(), wait = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  if (!validRequest(req)) return { status: 400, body: { error: 'Bad request.' } };
  const caller = await verifyCaller(idToken, env, fetchImpl);
  if (!caller) return { status: 401, body: { error: 'Sign in first.' } };

  // Look the booking up; the app has only just written it, so if it is not
  // there yet (or, for a cancellation, still there) look once more.
  const look = async () => {
    const read = makeReader(env, fetchImpl);
    const found = req.kind === 'lesson' ? await findLesson(read, req) : await findChukka(read, req);
    return { read, found };
  };
  let { read, found } = await look();
  const settled = (f) => !f.error && (req.event === 'cancelled' ? !f.entry : !!f.entry);
  if (!settled(found)) { await wait(1500); ({ read, found } = await look()); }
  if (found.error) return { status: 404, body: { error: found.error } };
  if (req.event === 'cancelled' && found.entry) return { status: 409, body: { error: 'That booking is still on the list.' } };
  if (req.event !== 'cancelled' && !found.entry) return { status: 404, body: { error: 'No such booking.' } };
  if (req.event !== 'cancelled') {
    const e = found.entry;
    const stamp = req.event === 'amended' ? Number(e.amendedAt) : Number(e.bookedAt || e.at || e.addedAt || e.id);
    if (!stamp || now - stamp > FRESH_MS) return { status: 409, body: { error: 'That change is not a recent one.' } };
  }

  const players = json(await read('players'), []);
  const person = req.event === 'cancelled'
    ? players.find((p) => String(p.id) === String(req.playerId)) || null
    : recordFor(players, found.entry);
  const to = normEmail(person && person.email);
  if (!person || !to) return { status: 200, body: { sent: false, why: 'No email address on file.' } };

  // May this caller send it? Their own booking, a teammate's, whoever they
  // booked, or anyone's for an admin.
  const me = players.find((p) => normEmail(p.email) === caller.email) || null;
  const admins = await adminEmails(env, fetchImpl);
  const allowed = caller.email === to
    || admins.includes(caller.email)
    || (found.entry && found.entry.uid && found.entry.uid === caller.uid)
    || (me && teamKey(me.team) && teamKey(me.team) === teamKey(person.team));
  if (!allowed) return { status: 403, body: { error: 'Not your booking.' } };

  const allow = String(env.REMINDERS_ALLOW || '').split(',').map(normEmail).filter(Boolean);
  const live = env.REMINDERS_LIVE === '1';
  if (!live && !allow.includes(to)) return { status: 200, body: { sent: false, why: 'Not on the test list.' } };
  if (!env.RESEND_API_KEY) return { status: 200, body: { sent: false, why: 'No RESEND_API_KEY.' } };

  const { appUrl, from } = settings(env);
  const mail = renderBookingEmail({ req, found, person, appUrl });
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!r.ok) return { status: 502, body: { sent: false, why: `Resend ${r.status}` } };
  return { status: 200, body: { sent: true } };
}
