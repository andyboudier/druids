// Reminder emails for booked chukkas and lessons — run by Vercel Cron (see
// vercel.json): the evening before (reminders-evening.js) and the morning of
// (reminders-morning.js). The leading underscore keeps this file from being
// deployed as an endpoint of its own.
//
// It reads the same `shared/<key>` documents the app writes, through the
// Firestore REST API with the project's public web key — exactly what the
// Watch apps do — and sends through Resend from the club address.
//
// SAFE BY DEFAULT. Nobody is emailed unless one of these is set on the Vercel
// project:
//   REMINDERS_ALLOW  comma-separated addresses; only these are ever emailed
//                    (TPPC-Dev runs like this, with Andy's address)
//   REMINDERS_LIVE=1 email every booked member who has an address on file
// With neither, a run reports what it would have sent and sends nothing.
//
// Other settings: RESEND_API_KEY (required to send), CRON_SECRET (Vercel sends
// it as a bearer token on cron calls; anything else is refused), REMINDER_FROM
// and APP_URL (optional). The Firebase project comes from VITE_FIREBASE_* like
// the app itself, so the same file serves the club and the dev copy.
//
// Everything that is the club's own — its name and colours, the chukka days,
// how the day keys are suffixed, the Firebase project, where the app lives —
// is in _club.js, so this file is the same in every app.

import { CLUB, CREST, PROJECT, APP_URL, DAYS, storageKey, SESSION_NAMES } from './_club.js';
export { CLUB, DAYS, storageKey, SESSION_NAMES };

const K = CLUB.colors;
// The crest at the top of an email, in a white round where the club's is one.
export const crestImg = (appUrl) =>
  `<img src="${esc(`${appUrl}${CREST.src}`)}" width="72" height="72" alt="${esc(CLUB.name)}" style="${CREST.round ? 'border-radius:50%;background:#fff;' : ''}display:block">`;
export const signOff = () => `${esc(CLUB.name)} · ${esc(CLUB.place)}`;
export const settings = (env) => ({
  appUrl: String(env.APP_URL || APP_URL).replace(/\/$/, ''),
  from: env.REMINDER_FROM || `${CLUB.name} <hello@poloact.co.uk>`,
});

export const normName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
export const normEmail = (s) => String(s || '').trim().toLowerCase();

// ── Dates in the club's own time ────────────────────────────────────────────
// Vercel runs in UTC; the club lives in Europe/London, so "tomorrow" and the
// weekday are worked out there.
export const londonParts = (d) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dows = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { iso: `${p.year}-${p.month}-${p.day}`, dow: dows[p.weekday] };
};
export const targetDate = (when, now = new Date()) => londonParts(when === 'evening' ? new Date(now.getTime() + 24 * 3600000) : now);
export const longDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// ── Reading the club's data ─────────────────────────────────────────────────
export const projectOf = (env) => ({
  projectId: env.VITE_FIREBASE_PROJECT_ID || PROJECT.projectId,
  apiKey: env.VITE_FIREBASE_API_KEY || PROJECT.apiKey,
});

export const makeReader = (env, fetchImpl = fetch) => {
  const { projectId, apiKey } = projectOf(env);
  const cache = new Map();
  return async (key) => {
    if (cache.has(key)) return cache.get(key);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shared/${encodeURIComponent(key)}${apiKey ? `?key=${apiKey}` : ''}`;
    const r = await fetchImpl(url);
    let v = null;
    if (r.ok) {
      const d = await r.json();
      v = d && d.fields && d.fields.value ? d.fields.value.stringValue ?? null : null;
    } else if (r.status !== 404) {
      throw new Error(`Reading ${key} failed: ${r.status}`);
    }
    cache.set(key, v);
    return v;
  };
};
export const json = (s, fallback) => { try { return s == null ? fallback : JSON.parse(s); } catch (e) { return fallback; } };

// Who to write to for a booking: the record the booking points at, else the
// one with the same name. No address on file, no email.
export const recordFor = (players, entry) => (entry.playerId != null && players.find((p) => p.id === entry.playerId))
  || players.find((p) => normName(p.name) === normName(entry.name)) || null;

// The chukkas an entry plays in a published draw, with the shirt for each
// (teamA is Blue, teamB White, as in the app).
export const slotsFor = (schedule, entryId) => (schedule && Array.isArray(schedule.chukkas) ? schedule.chukkas : [])
  .map((c) => {
    const a = (c.teamA || []).some((p) => p && p.id === entryId);
    const b = !a && (c.teamB || []).some((p) => p && p.id === entryId);
    return a || b ? { number: c.number, time: c.time, team: a ? 'Blue' : 'White' } : null;
  })
  .filter(Boolean);

// Everything booked on one date, gathered per person.
export async function collect(read, target) {
  const players = json(await read('players'), []);
  const people = new Map(); // email → { name, items: [] }
  let noEmail = 0;
  const add = (rec, name, item) => {
    const email = normEmail(rec && rec.email);
    if (!email) { noEmail += 1; return; }
    if (!people.has(email)) people.set(email, { email, name: (rec && rec.name) || name, items: [] });
    people.get(email).items.push(item);
  };

  // Chukkas: the day whose weekday this is, and only if its roster is
  // stamped for this very date — a roster left from last week is not a booking.
  for (const [dk, cfg] of Object.entries(DAYS)) {
    if (cfg.dow !== target.dow) continue;
    const week = await read(storageKey('roster-week', dk));
    if (week !== target.iso) continue;
    const roster = json(await read(storageKey('roster', dk)), []);
    const time = (await read(storageKey('throwin', dk))) || cfg.start;
    const ground = (await read(storageKey('ground', dk))) || '';
    const published = (await read(storageKey('draw-published', dk))) === '1';
    const schedule = published ? json(await read(storageKey('schedule', dk)), null) : null;
    for (const e of roster) {
      add(recordFor(players, e), e.name, {
        kind: 'chukka', title: cfg.name, time, ground,
        chukkas: e.chukkas, pony: !!e.ponyHire, bookedBy: e.bookedBy || '',
        slots: schedule ? slotsFor(schedule, e.id) : [], drawOut: !!schedule,
      });
    }
  }

  // Lessons and club sessions on that date.
  const slots = json(await read('lesson-slots'), []);
  for (const s of slots) {
    if (!s || s.date !== target.iso) continue;
    for (const b of s.bookings || []) {
      const session = b.type === 'session' || !!s.kind;
      add(recordFor(players, b), b.name, {
        kind: session ? 'session' : 'lesson',
        title: session ? (SESSION_NAMES[s.kind] || 'Club session') : `${b.type === 'group' ? 'Group' : 'Individual'} lesson`,
        time: b.start || s.start, hours: Number(b.hours) || 1,
        coach: s.coach || '', ground: s.ground || '', pony: !!b.ponyHire,
      });
    }
  }
  for (const p of people.values()) p.items.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return { people: [...people.values()], noEmail };
}

// ── The email ───────────────────────────────────────────────────────────────
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';

const itemLines = (it) => {
  const bits = [];
  if (it.kind === 'chukka') {
    bits.push(`${it.chukkas} chukka${it.chukkas === 1 ? '' : 's'}${it.pony ? ' · club pony' : ''}`);
    if (it.slots && it.slots.length) bits.push(it.slots.map((c) => `Chukka ${c.number} at ${c.time} in ${c.team}`).join(', '));
    else if (!it.drawOut) bits.push('The draw is still to come');
    if (it.bookedBy) bits.push(`Booked for you by ${it.bookedBy}`);
  } else {
    bits.push(`${it.hours} hour${it.hours === 1 ? '' : 's'}${it.coach ? ` with ${it.coach}` : ''}${it.pony ? ' · club pony' : ''}`);
  }
  return bits;
};

export function renderEmail({ when, target, person, appUrl }) {
  const day = longDate(target.iso);
  const lead = when === 'evening' ? `Tomorrow, ${day}` : `Today, ${day}`;
  const subject = when === 'evening'
    ? `Tomorrow: ${person.items.map((i) => `${i.title} ${i.time}`).join(', ')}`
    : `Today: ${person.items.map((i) => `${i.title} ${i.time}`).join(', ')}`;
  const rows = person.items.map((it) => `
    <tr><td style="padding:16px 18px;border-top:1px solid ${K.line}">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${K.gold2};line-height:1">${esc(it.time)}</div>
      <div style="font-size:16px;color:${K.cream};margin-top:6px">${esc(it.title)}${it.ground ? ` · ${esc(it.ground)}` : ''}</div>
      ${itemLines(it).map((l) => `<div style="font-size:13px;color:${K.muted};margin-top:4px">${esc(l)}</div>`).join('')}
    </td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:${K.bg};font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${K.bg};padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td align="center" style="padding-bottom:18px">
        ${crestImg(appUrl)}
      </td></tr>
      <tr><td style="background:${K.card};border:1px solid ${K.line};border-radius:18px;overflow:hidden">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:20px 18px 14px">
            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${K.muted}">${esc(lead)}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${K.cream};margin-top:6px">Hello ${esc(firstName(person.name))}, here&rsquo;s your ${when === 'evening' ? 'reminder' : 'day'}</div>
          </td></tr>
          ${rows}
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 0 8px">
        <a href="${esc(appUrl)}" style="display:inline-block;background:${K.burg};border:1px solid ${K.gold};color:${K.cream};text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:17px;padding:13px 26px;border-radius:14px">Open the app</a>
      </td></tr>
      <tr><td align="center" style="font-size:12px;color:${K.dim || K.muted};line-height:1.6;padding:6px 10px">
        Can&rsquo;t make it? Take yourself off the list in the app so someone else can have your place.<br>${signOff()}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  const text = [
    `${lead}`, `Hello ${firstName(person.name)},`, '',
    ...person.items.flatMap((it) => [`${it.time} — ${it.title}${it.ground ? ` · ${it.ground}` : ''}`, ...itemLines(it).map((l) => `  ${l}`), '']),
    `Open the app: ${appUrl}`,
    "Can't make it? Take yourself off the list in the app so someone else can have your place.",
  ].join('\n');
  return { subject, html, text };
}

// ── The run ─────────────────────────────────────────────────────────────────
export async function runReminders({ when, env, now = new Date(), dry = false, dateOverride = '', fetchImpl = fetch }) {
  const target = dateOverride
    ? { iso: dateOverride, dow: new Date(`${dateOverride}T12:00:00Z`).getUTCDay() }
    : targetDate(when, now);
  const read = makeReader(env, fetchImpl);
  const { people, noEmail } = await collect(read, target);

  const allow = String(env.REMINDERS_ALLOW || '').split(',').map(normEmail).filter(Boolean);
  const live = env.REMINDERS_LIVE === '1';
  const { appUrl, from } = settings(env);
  const report = { when, date: target.iso, booked: people.length, noEmail, sent: [], held: [], failed: [] };

  for (const person of people) {
    const permitted = live || allow.includes(person.email);
    if (!permitted || dry || !env.RESEND_API_KEY) {
      report.held.push({ to: person.email, items: person.items.length,
        why: !permitted ? 'not on the test list' : dry ? 'dry run' : 'no RESEND_API_KEY' });
      continue;
    }
    const mail = renderEmail({ when, target, person, appUrl });
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [person.email], subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (r.ok) report.sent.push(person.email);
    else report.failed.push({ to: person.email, status: r.status, body: (await r.text()).slice(0, 200) });
  }
  // Addresses stay out of the log unless they were on the test list anyway.
  report.held = report.held.map((h) => (allow.includes(h.to) ? h : { ...h, to: '(member)' }));
  return report;
}

// The shared handler: refuses anything but Vercel Cron (or a caller holding
// the same secret, for a manual test), and never runs without a secret set.
export function makeHandler(when) {
  return async function handler(req, res) {
    const env = process.env;
    const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Not allowed.' });
      return;
    }
    const q = req.query || {};
    try {
      const report = await runReminders({ when, env, dry: q.dry === '1', dateOverride: /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : '' });
      res.status(200).json(report);
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  };
}
