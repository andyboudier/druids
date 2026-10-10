// POST /api/booking-email — the app asks for a booking email straight after a
// booking is made, amended or cancelled. See _bookingEmail.js for what it
// checks and who it will write to.
import { sendBookingEmail } from './_bookingEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only.' }); return; }
  const auth = String((req.headers && req.headers.authorization) || '');
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  try {
    const out = await sendBookingEmail({ req: body, idToken, env: process.env });
    res.status(out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
