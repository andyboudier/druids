// POST /api/booking-email — the app asks for a booking email straight after a
// booking is made, amended or cancelled. See _bookingEmail.js for what it
// checks and who it will write to.
import { sendBookingEmail } from './_bookingEmail.js';
import { logEmail } from './_reminders.js';

// Every answer past sign-in goes in the email log (see logEmail): sent, or why
// not. Not a malformed or signed-out request (400, 401), which anyone could
// send to fill the log.
const logged = (body, status, out) => (status > 401 || status === 200) && logEmail(process.env, fetch, {
  at: Date.now(), type: 'booking', event: String((body && body.event) || ''), kind: String((body && body.kind) || ''), status,
  member: out && out.sent ? 'sent' : String((out && (out.why || out.error)) || 'not sent').slice(0, 120),
  ids: out && out.id ? [out.id] : [],
});

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only.' }); return; }
  const auth = String((req.headers && req.headers.authorization) || '');
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  try {
    const out = await sendBookingEmail({ req: body, idToken, env: process.env });
    await logged(body, out.status, out.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    await logged(body, 500, { error: String((e && e.message) || e) });
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
