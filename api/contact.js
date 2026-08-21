// GetCalcu — Serverless contact-form email sender (ISSUE-001 fix)
//
// The EmailJS credentials are now held ONLY server-side via environment
// variables on Vercel (EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID,
// EMAILJS_TEMPLATE_ID). They are never exposed to the browser.
//
// This endpoint also adds: input validation, a honeypot anti-spam field,
// and simple per-IP rate limiting.
//
// Run locally with:  vercel dev

const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send';

const MAX_MESSAGE = 5000;
const MAX_NAME = 120;
const RATE_LIMIT_MS = 60 * 1000; // 1 minute
const _ipLog = new Map();

export default async function handler(req, res) {
  // ── Only allow POST ──────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // ── Rate limit per IP ────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();
  const now = Date.now();
  const last = _ipLog.get(ip) || 0;
  if (now - last < RATE_LIMIT_MS) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a minute and try again.' });
  }
  _ipLog.set(ip, now);

  // ── Parse body ───────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
  }

  // ── Honeypot: bots fill hidden "website" field ───────────
  if (body.website && body.website.trim() !== '') {
    // Silently pretend success so bots don't learn the trap.
    return res.status(200).json({ ok: true, message: 'Message sent! We will get back to you within 24-48 hours.' });
  }

  // ── Validate inputs ──────────────────────────────────────
  const from_name  = String(body.from_name  || '').trim();
  const from_email = String(body.from_email || '').trim();
  const topic      = String(body.topic      || '').trim();
  const message    = String(body.message    || '').trim();

  if (!from_name || from_name.length > MAX_NAME) {
    return res.status(400).json({ ok: false, error: 'Please provide your name.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
  }
  if (!topic) {
    return res.status(400).json({ ok: false, error: 'Please choose a topic.' });
  }
  if (!message || message.length > MAX_MESSAGE) {
    return res.status(400).json({ ok: false, error: 'Please enter a message.' });
  }

  // ── Server-side credentials (never exposed to browser) ───
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.error('[api/contact] Missing EMAILJS_* environment variables.');
    return res.status(500).json({ ok: false, error: 'Server is not configured for email. Please contact support@getcalcu.com directly.' });
  }

  // ── Send via EmailJS REST API ─────────────────────────────
  const payload = {
    service_id:  serviceId,
    template_id: templateId,
    user_id:     publicKey,
    template_params: {
      from_name:  from_name,
      from_email: from_email,
      topic:      topic,
      message:    message,
      reply_to:   from_email,
    },
  };

  try {
    const apiRes = await fetch(EMAILJS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('[api/contact] EmailJS error', apiRes.status, errText);
      return res.status(502).json({ ok: false, error: 'Email service temporarily unavailable. Please email support@getcalcu.com directly.' });
    }

    return res.status(200).json({ ok: true, message: 'Message sent! We will get back to you within 24-48 hours.' });
  } catch (err) {
    console.error('[api/contact] Send failure:', err);
    return res.status(502).json({ ok: false, error: 'Email service temporarily unavailable. Please email support@getcalcu.com directly.' });
  }
}