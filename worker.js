/**
 * worker.js — Cloudflare Workers entrypoint
 *
 * This is the production Worker entrypoint referenced by wrangler.toml.
 * It wraps the contact-form email logic for the Cloudflare Workers runtime.
 *
 * IMPORTANT: This uses the Cloudflare Worker signature `fetch(request, env)`,
 * which differs from the Vercel serverless signature `(req, res)`.
 *
 * Credentials are read from Worker `env` bindings (set in the dashboard):
 *   EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID
 */

const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send';
const MAX_MESSAGE = 5000;
const MAX_NAME = 120;
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

// Simple in-worker rate limiter (per IP, best-effort)
const _ipLog = new Map();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    // Only allow POST to /
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405);
    }

    // ── Rate limit per IP ────────────────────────────────
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const last = _ipLog.get(ip) || 0;
    if (now - last < RATE_LIMIT_MS) {
      return json({ ok: false, error: 'Too many requests. Please wait a minute and try again.' }, 429);
    }
    _ipLog.set(ip, now);

    // ── Parse body ───────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON body.' }, 400);
    }

    // ── Honeypot: bots fill hidden "website" field ───────
    if (body.website && body.website.trim() !== '') {
      return json({ ok: true, message: 'Message sent! We will get back to you within 24-48 hours.' });
    }

    // ── Validate inputs ──────────────────────────────────
    const from_name  = String(body.from_name  || '').trim();
    const from_email = String(body.from_email || '').trim();
    const topic      = String(body.topic      || '').trim();
    const message    = String(body.message    || '').trim();

    if (!from_name || from_name.length > MAX_NAME) {
      return json({ ok: false, error: 'Please provide your name.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
      return json({ ok: false, error: 'Please provide a valid email address.' }, 400);
    }
    if (!topic) {
      return json({ ok: false, error: 'Please choose a topic.' }, 400);
    }
    if (!message || message.length > MAX_MESSAGE) {
      return json({ ok: false, error: 'Please enter a message.' }, 400);
    }

    // ── Credentials from env bindings ────────────────────
    const serviceId  = env.EMAILJS_SERVICE_ID;
    const templateId = env.EMAILJS_TEMPLATE_ID;
    const publicKey  = env.EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.error('[worker] Missing EMAILJS_* environment variables.');
      return json({ ok: false, error: 'Server is not configured for email. Please contact support@getcalcu.com directly.' }, 500);
    }

    // ── Send via EmailJS REST API ─────────────────────────
    const payload = {
      service_id:  serviceId,
      template_id: templateId,
      user_id:     publicKey,
      template_params: {
        from_name,
        from_email,
        topic,
        message,
        reply_to: from_email,
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
        console.error('[worker] EmailJS error', apiRes.status, errText);
        return json({ ok: false, error: 'Email service temporarily unavailable. Please email support@getcalcu.com directly.' }, 502);
      }

      return json({ ok: true, message: 'Message sent! We will get back to you within 24-48 hours.' });
    } catch (err) {
      console.error('[worker] Send failure:', err);
      return json({ ok: false, error: 'Email service temporarily unavailable. Please email support@getcalcu.com directly.' }, 502);
    }
  },
};